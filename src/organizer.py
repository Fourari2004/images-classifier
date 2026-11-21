import os
import time
import logging
from pathlib import Path
from threading import Thread, Event
from datetime import datetime
from typing import List, Dict, Any, Callable, Optional

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

    def start_analysis(self, source_dir: str):
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

        self._worker_thread = Thread(target=self._run_pipeline, args=(source_dir,), daemon=True)
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

    def _run_pipeline(self, source_dir: str):
        try:
            self.log(f"Scanning directory: {source_dir}")
            all_files = self._scan_directory(source_dir)
            
            # Fetch already processed images to do incremental update
            processed_db_images = self.db.get_all_images()
            processed_paths = {img['path']: img for img in processed_db_images if img['processed'] == 1}
            processed_sha256s = {img['sha256'] for img in processed_db_images if img['processed'] == 1}

            # Filter out already processed images
            files_to_process = []
            for f in all_files:
                # Check path first (fast)
                if f in processed_paths:
                    continue
                files_to_process.append(f)

            self.stats['total_images'] = len(files_to_process)
            self.log(f"Found {len(all_files)} images, {len(files_to_process)} are new and will be processed.")

            if not files_to_process:
                self.log("No new images to process.")
                self.is_running = False
                self._update_progress()
                return

            # Initialize detector and recognizer
            self.log("Initializing AI models (InsightFace)...")
            detector = FaceDetector(config.models_dir, mode=config.mode, cpu_threads=config.cpu_threads)
            detector.initialize()
            
            recognizer = Recognizer(self.db, self.index, threshold=config.recognition_threshold)
            self._recognizer = recognizer
            self.log("AI models initialized successfully.")

            start_time = time.time()
            processed_count = 0

            for img_path in files_to_process:
                # Pause checkpoint
                self._pause_event.wait()
                
                # Stop checkpoint
                if self._stop_event.is_set():
                    break

                self.stats['current_image_path'] = img_path
                self._update_progress()
                
                img_start_time = time.time()
                self.log(f"Processing: {os.path.basename(img_path)}")
                
                try:
                    # 0. If RAW file (ARW, CR2, NEF…), convert to a temporary JPEG first
                    tmp_jpeg_path = None
                    processing_path = img_path  # Path used for AI processing
                    if is_raw_file(img_path):
                        self.log(f"[RAW] Conversion ARW→JPEG : {os.path.basename(img_path)}")
                        tmp_jpeg_path = convert_raw_to_jpeg(img_path)
                        if tmp_jpeg_path:
                            processing_path = tmp_jpeg_path
                            self.log(f"[RAW] Conversion réussie → traitement du JPEG temporaire")
                        else:
                            self.log(f"[RAW] Échec de la conversion, fichier ignoré : {os.path.basename(img_path)}", level=logging.WARNING)
                            processed_count += 1
                            self.stats['processed_images'] = processed_count
                            self._update_progress()
                            continue

                    # 1. Check duplicate by SHA256 (on original file)
                    sha256 = self.img_mgr.get_sha256(img_path)
                    
                    if sha256 in processed_sha256s:
                        # Skip processing duplicate content, but maybe associate with the path
                        self.log(f"Duplicate content detected (SHA256: {sha256[:8]}). Skipping file.")
                        # Insert image with processed status
                        w, h, dt_str = self.img_mgr.get_metadata(img_path)
                        img_id = self.db.add_image(img_path, sha256, w, h, dt_str)
                        self.db.mark_image_processed(img_id, processed=1)
                        processed_count += 1
                        self.stats['processed_images'] = processed_count
                        cleanup_temp_jpeg(tmp_jpeg_path)
                        continue

                    # 2. Get Metadata & add image to DB (from original file)
                    w, h, dt_str = self.img_mgr.get_metadata(img_path)
                    img_id = self.db.add_image(img_path, sha256, w, h, dt_str)

                    # 3. Detect faces and embeddings (on JPEG if RAW was converted)
                    faces = detector.detect_faces(processing_path)
                    num_faces = len(faces)
                    self.log(f"Detected {num_faces} face(s) in {os.path.basename(img_path)}")
                    
                    detected_persons_names = []
                    
                    for face in faces:
                        bbox = face['bbox']
                        conf = face['confidence']
                        embedding = face['embedding']
                        
                        # Filter by confidence
                        if conf < config.min_face_confidence:
                            continue

                        # 4. Recognize face
                        person_id, similarity = recognizer.recognize_face(embedding)
                        
                        if person_id is None:
                            # Create new person
                            person_id = recognizer.create_new_person()
                            # Register face
                            recognizer.register_face(person_id, embedding, conf)
                            person_data = self.db.get_person(person_id)
                            self.log(f"New person created: {person_data['display_name']}")
                        else:
                            # Register face embedding for existing person
                            recognizer.register_face(person_id, embedding, conf)
                            person_data = self.db.get_person(person_id)
                            self.log(f"Recognized person: {person_data['display_name']} (similarity: {similarity:.2f})")
                            
                        # Update stats
                        self.stats['detected_faces'] += 1
                        detected_persons_names.append(person_data['display_name'])
                        
                        # 5. Link image to person
                        self.db.link_image_person(img_id, person_id, bbox, conf)
                        
                        # 6. Create face thumbnail cache (from processing_path for best quality)
                        box_str = ",".join(map(str, bbox))
                        self.img_mgr.create_face_thumbnail(processing_path, sha256, box_str)
                        
                        # 7. Copy ORIGINAL file (ARW or JPEG) to person's output folder
                        self.img_mgr.copy_image_to_person(img_path, person_data['folder_name'])

                    # Mark image as processed
                    self.db.mark_image_processed(img_id, processed=1)
                    processed_sha256s.add(sha256)
                    
                    processed_count += 1
                    self.stats['processed_images'] = processed_count
                    self.stats['total_persons'] = len(self.db.get_all_persons())
                    
                    # Update timings
                    elapsed = time.time() - start_time
                    self.stats['elapsed_time'] = elapsed
                    
                    avg_time_per_image = elapsed / processed_count
                    remaining_images = len(files_to_process) - processed_count
                    self.stats['estimated_remaining_time'] = avg_time_per_image * remaining_images
                    
                    img_elapsed = time.time() - img_start_time
                    self.log(
                        f"Finished processing: {os.path.basename(img_path)} "
                        f"({num_faces} faces, {', '.join(detected_persons_names) if detected_persons_names else 'none'}, "
                        f"took {img_elapsed:.2f}s)"
                    )
                    
                except Exception as e:
                    self.log(f"Error processing image {img_path}: {e}", level=logging.ERROR)
                    # Don't break, skip to next image
                    processed_count += 1
                    self.stats['processed_images'] = processed_count
                finally:
                    # Always clean up the temporary JPEG conversion file
                    cleanup_temp_jpeg(tmp_jpeg_path)

                self._update_progress()

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
