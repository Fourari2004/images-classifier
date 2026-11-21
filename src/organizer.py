import os
import time
import logging
from pathlib import Path
from threading import Thread, Event
from queue import Queue, Empty
from datetime import datetime
from typing import List, Dict, Any, Callable, Optional, Tuple

from src.config import config
from src.database import Database
from src.image_manager import ImageManager
from src.detector import FaceDetector
from src.recognizer import Recognizer
from src.faiss_index import FAISSIndex
from src.raw_converter import is_raw_file, convert_raw_to_jpeg, cleanup_temp_jpeg

class OrganizerPipeline:
    def __init__(self, db: Database, index: FAISSIndex, img_mgr: ImageManager,
                 progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
                 log_callback: Optional[Callable[[str], None]] = None,
                 error_callback: Optional[Callable[[str], None]] = None):
        self.db = db
        self.index = index
        self.img_mgr = img_mgr
        self.progress_callback = progress_callback
        self.log_callback = log_callback
        self.error_callback = error_callback  # Called when a fatal error stops the pipeline
        
        # State control
        self.is_running = False
        self.is_paused = False
        self._stop_event = Event()
        self._pause_event = Event()
        self._pause_event.set() # Set means not paused
        self._worker_thread: Optional[Thread] = None
        self._recognizer: Optional[Any] = None  # Exposed for live threshold updates from settings

        # Statistics
        self.stats = {
            'total_images': 0,
            'processed_images': 0,
            'detected_faces': 0,
            'total_persons': 0,
            'elapsed_time': 0.0,
            'estimated_remaining_time': 0.0,
            'current_image_path': ""
        }

        # Initialize logging
        self._setup_logger()

    def _setup_logger(self):
        self.logger = logging.getLogger("FaceOrganizerAI")
        self.logger.setLevel(logging.INFO)
        
        # Avoid adding duplicate handlers if already initialized
        if not self.logger.handlers:
            config.log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(config.log_file, encoding="utf-8")
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

    def log(self, message: str, level=logging.INFO):
        self.logger.log(level, message)
        if self.log_callback:
            # Send timestamped message to GUI
            time_str = datetime.now().strftime("%H:%M:%S")
            self.log_callback(f"[{time_str}] {message}")

    def start_analysis(self, source_dir: str, force_reprocess: bool = False):
        """
        Starts the background processing thread.
        """
        if self.is_running:
            return
            
        self.is_running = True
        self.is_paused = False
        self._stop_event.clear()
        self._pause_event.set()
        
        self.stats = {
            'total_images': 0,
            'processed_images': 0,
            'detected_faces': 0,
            'total_persons': len(self.db.get_all_persons()),
            'elapsed_time': 0.0,
            'estimated_remaining_time': 0.0,
            'current_image_path': ""
        }

        self._worker_thread = Thread(target=self._run_pipeline, args=(source_dir, force_reprocess), daemon=True)
        self._worker_thread.start()

    def pause(self):
        if self.is_running and not self.is_paused:
            self.is_paused = True
            self._pause_event.clear()
            self.log("Analysis paused.")

    def resume(self):
        if self.is_running and self.is_paused:
            self.is_paused = False
            self._pause_event.set()
            self.log("Analysis resumed.")

    def cancel(self):
        if self.is_running:
            self.is_running = False
            self.is_paused = False
            self._stop_event.set()
            self._pause_event.set() # Unblock if paused
            self.log("Analysis cancelled by user.")

    def _scan_directory(self, source_dir: str) -> List[str]:
        source_path = Path(source_dir)
        allowed_exts = set(config.allowed_extensions)
        files = []
        
        for root, _, filenames in os.walk(source_path):
            for name in filenames:
                ext = os.path.splitext(name)[1].lower()
                if ext in allowed_exts:
                    files.append(os.path.join(root, name))
                    
        return files

    def _run_pipeline(self, source_dir: str, force_reprocess: bool = False):
        """
        Parallel Architecture (Producer - GPU Consumer - Async Writer):
        1. Pre-fetch Worker (Thread): Reads files from disk, computes SHA256/metadata, 
           and decodes RAW to temp JPEG in parallel.
        2. GPU Worker (Main Thread): Ingestion of pre-fetched images on GPU via DirectML.
        3. Storage Worker (Thread): Copies organized files, extracts thumbnails, 
           and updates DB without stalling GPU inference.
        """
        try:
            self.log(f"Scanning directory: {source_dir}")
            self.log(f"Output directory: {self.img_mgr.output_dir}")
            all_files = self._scan_directory(source_dir)
            
            # Fetch already processed images to do incremental update
            processed_db_images = self.db.get_all_images()
            processed_paths = {img['path']: img for img in processed_db_images if img['processed'] == 1}
            processed_sha256s = {img['sha256'] for img in processed_db_images if img['processed'] == 1}

            if force_reprocess:
                self.log("⚡ Mode forcer le retraitement activé — toutes les images seront retraitées.")

            # Filter out already processed images (skip if force_reprocess)
            files_to_process = []
            for f in all_files:
                if not force_reprocess and f in processed_paths:
                    continue
                files_to_process.append(f)

            self.stats['total_images'] = len(files_to_process)
            self.log(f"Found {len(all_files)} images, {len(files_to_process)} are new and will be processed.")

            if not files_to_process:
                self.log("No new images to process.")
                self.is_running = False
                self._update_progress()
                return

            # Initialize detector with GPU acceleration
            self.log("Initializing AI models (InsightFace on DirectML GPU)...")
            detector = FaceDetector(config.models_dir, mode=config.mode, cpu_threads=config.cpu_threads)
            detector.initialize()
            self.log(f"AI Accelerator Active: {detector.active_provider}")
            
            recognizer = Recognizer(self.db, self.index, threshold=config.recognition_threshold)
            self._recognizer = recognizer
            self.log("AI models initialized successfully.")

            # Pipeline Queues
            # prefetch_queue feeds the GPU thread
            prefetch_queue: Queue = Queue(maxsize=12)
            # storage_queue handles file copies & thumbnails asynchronously
            storage_queue: Queue = Queue()

            # --- THREAD 1: PRE-FETCH WORKER (Disk I/O + RAW conversion in parallel) ---
            def prefetch_worker():
                for img_path in files_to_process:
                    if self._stop_event.is_set():
                        break
                    
                    try:
                        # 0. RAW conversion if needed
                        tmp_jpeg_path = None
                        processing_path = img_path
                        if is_raw_file(img_path):
                            tmp_jpeg_path = convert_raw_to_jpeg(img_path)
                            if tmp_jpeg_path:
                                processing_path = tmp_jpeg_path

                        # 1. SHA256 & Metadata
                        sha256 = self.img_mgr.get_sha256(img_path)
                        w, h, dt_str = self.img_mgr.get_metadata(img_path)

                        item = {
                            'img_path': img_path,
                            'processing_path': processing_path,
                            'tmp_jpeg_path': tmp_jpeg_path,
                            'sha256': sha256,
                            'w': w,
                            'h': h,
                            'dt_str': dt_str
                        }
                    except Exception as err:
                        item = {'img_path': img_path, 'error': str(err)}

                    # Block until GPU has room
                    while not self._stop_event.is_set():
                        try:
                            prefetch_queue.put(item, timeout=0.2)
                            break
                        except Exception:
                            continue

                # Sentinel for end
                prefetch_queue.put(None)

            # --- THREAD 2: ASYNC STORAGE WORKER (Thumbnail + Copying + EXIF tagging) ---
            def storage_worker():
                while True:
                    try:
                        task = storage_queue.get(timeout=0.2)
                    except Empty:
                        if self._stop_event.is_set() and prefetch_queue.empty():
                            break
                        continue

                    if task is None:  # Stop sentinel
                        storage_queue.task_done()
                        break

                    try:
                        img_path = task['img_path']
                        processing_path = task['processing_path']
                        sha256 = task['sha256']
                        faces_data = task['faces_data']  # list of (box_str, folder_name)
                        detected_names = task['detected_names']
                        tmp_jpeg_path = task.get('tmp_jpeg_path')

                        # Create face thumbnails
                        for box_str, _ in faces_data:
                            self.img_mgr.create_face_thumbnail(processing_path, sha256, box_str)

                        # Copy original image to person folders
                        for _, folder_name in faces_data:
                            dest = self.img_mgr.copy_image_to_person(img_path, folder_name)

                        # Tag metadata with person names
                        if detected_names:
                            self.img_mgr.tag_image_with_persons(img_path, detected_names)

                        # Cleanup temp JPEG after copying/thumbnail extraction
                        cleanup_temp_jpeg(tmp_jpeg_path)

                    except Exception as e:
                        self.log(f"Erreur écriture stockage pour {task.get('img_path')}: {e}", level=logging.WARNING)
                    finally:
                        storage_queue.task_done()

            # Launch helper workers
            t_prefetch = Thread(target=prefetch_worker, daemon=True)
            t_storage = Thread(target=storage_worker, daemon=True)
            t_prefetch.start()
            t_storage.start()

            start_time = time.time()
            processed_count = 0

            # --- MAIN LOOP: GPU INFERENCE & RECOGNITION ---
            while processed_count < len(files_to_process):
                # Pause checkpoint
                self._pause_event.wait()
                
                # Stop checkpoint
                if self._stop_event.is_set():
                    break

                try:
                    item = prefetch_queue.get(timeout=0.2)
                except Empty:
                    continue

                if item is None:
                    # End of items
                    break

                img_path = item['img_path']
                self.stats['current_image_path'] = img_path
                self._update_progress()

                if 'error' in item:
                    self.log(f"Erreur pré-chargement image {img_path}: {item['error']}", level=logging.ERROR)
                    processed_count += 1
                    self.stats['processed_images'] = processed_count
                    continue

                img_start_time = time.time()
                self.log(f"Processing (GPU): {os.path.basename(img_path)}")

                try:
                    sha256 = item['sha256']
                    processing_path = item['processing_path']
                    tmp_jpeg_path = item['tmp_jpeg_path']

                    # Check duplicate by SHA256 (if not force_reprocess)
                    if not force_reprocess and sha256 in processed_sha256s:
                        self.log(f"Duplicate content (SHA256: {sha256[:8]}). Skipping AI...")
                        existing_imgs = [i for i in processed_db_images if i.get('sha256') == sha256]
                        if existing_imgs:
                            img_id_existing = existing_imgs[0]['id']
                            persons = self.db.get_image_persons(img_id_existing)
                            for p in persons:
                                self.img_mgr.copy_image_to_person(img_path, p['folder_name'])
                        else:
                            img_id = self.db.add_image(img_path, sha256, item['w'], item['h'], item['dt_str'])
                            self.db.mark_image_processed(img_id, processed=1)

                        cleanup_temp_jpeg(tmp_jpeg_path)
                        processed_count += 1
                        self.stats['processed_images'] = processed_count
                        self._update_progress()
                        continue

                    # Register in DB
                    img_id = self.db.add_image(img_path, sha256, item['w'], item['h'], item['dt_str'])

                    # 3. Detect faces on GPU
                    faces = detector.detect_faces(processing_path)
                    num_faces = len(faces)
                    self.log(f"Detected {num_faces} face(s) in {os.path.basename(img_path)}")

                    detected_persons_names = []
                    faces_data_for_storage = []

                    for face in faces:
                        bbox = face['bbox']
                        conf = face['confidence']
                        embedding = face['embedding']

                        if conf < config.min_face_confidence:
                            continue

                        # 4. Recognize face
                        person_id, similarity = recognizer.recognize_face(embedding)

                        if person_id is None:
                            person_id = recognizer.create_new_person()
                            recognizer.register_face(person_id, embedding, conf)
                            person_data = self.db.get_person(person_id)
                            self.log(f"New person created: {person_data['display_name']}")
                        else:
                            recognizer.register_face(person_id, embedding, conf)
                            person_data = self.db.get_person(person_id)
                            self.log(f"Recognized person: {person_data['display_name']} (similarity: {similarity:.2f})")

                        self.stats['detected_faces'] += 1
                        detected_persons_names.append(person_data['display_name'])

                        # Link in DB
                        self.db.link_image_person(img_id, person_id, bbox, conf)

                        box_str = ",".join(map(str, bbox))
                        faces_data_for_storage.append((box_str, person_data['folder_name']))

                    # Mark image as processed in DB
                    self.db.mark_image_processed(img_id, processed=1)
                    processed_sha256s.add(sha256)

                    # Send heavy disk copying and thumbnail creation to background storage worker
                    storage_queue.put({
                        'img_path': img_path,
                        'processing_path': processing_path,
                        'sha256': sha256,
                        'faces_data': faces_data_for_storage,
                        'detected_names': detected_persons_names,
                        'tmp_jpeg_path': tmp_jpeg_path
                    })

                    processed_count += 1
                    self.stats['processed_images'] = processed_count
                    self.stats['total_persons'] = len(self.db.get_all_persons())

                    elapsed = time.time() - start_time
                    self.stats['elapsed_time'] = elapsed
                    avg_time_per_image = elapsed / processed_count
                    remaining_images = len(files_to_process) - processed_count
                    self.stats['estimated_remaining_time'] = avg_time_per_image * remaining_images

                    img_elapsed = time.time() - img_start_time
                    self.log(
                        f"Finished GPU analysis: {os.path.basename(img_path)} "
                        f"({num_faces} faces, took {img_elapsed:.2f}s)"
                    )

                except Exception as e:
                    self.log(f"Error processing image {img_path}: {e}", level=logging.ERROR)
                    cleanup_temp_jpeg(item.get('tmp_jpeg_path'))
                    processed_count += 1
                    self.stats['processed_images'] = processed_count

                self._update_progress()

            # Signal storage worker to finish remaining copies
            storage_queue.put(None)
            t_storage.join(timeout=30.0)

            self.log(
                f"Analysis finished. Processed {processed_count} images. "
                f"Total faces detected: {self.stats['detected_faces']}. "
                f"Total persons: {self.stats['total_persons']}."
            )

        except Exception as e:
            msg = str(e)
            self.log(f"Erreur critique du pipeline : {msg}", level=logging.ERROR)
            if self.error_callback:
                self.error_callback(msg)
        finally:
            self.is_running = False
            self.is_paused = False
            self.stats['current_image_path'] = ""
            self._update_progress()

    def _update_progress(self):
        if self.progress_callback:
            self.progress_callback(self.stats.copy())
