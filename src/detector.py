import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any


class FaceDetector:
    """
    Wraps InsightFace FaceAnalysis for CPU-only face detection and recognition.
    On first run, InsightFace will automatically download the buffalo_l model
    (~200 MB) to the models directory if it is not already present.
    """

    def __init__(self, models_dir: str, mode: str = "balanced", cpu_threads: int = 4):
        self.models_dir = Path(models_dir)
        self.mode = mode
        self.cpu_threads = cpu_threads
        self.app = None

    def initialize(self):
        """
        Initialize InsightFace FaceAnalysis.
        If the buffalo_l model files are not present, InsightFace will download
        them automatically from its model server on first launch.
        """
        try:
            from insightface.app import FaceAnalysis
        except ImportError as e:
            raise ImportError(
                "insightface non installé. Exécutez : pip install insightface onnxruntime"
            ) from e

        # InsightFace looks for models at:  root / models / <name> /
        # We set root = project root so models land in  project/models/buffalo_l/
        root_dir = str(self.models_dir.parent)
        self.models_dir.mkdir(parents=True, exist_ok=True)

        providers = ['CPUExecutionProvider']

        # Allowed modules: only detection + recognition (skip landmarks/age/gender → faster)
        self.app = FaceAnalysis(
            name="buffalo_l",
            root=root_dir,
            allowed_modules=['detection', 'recognition'],
            providers=providers
        )

        # Detection resolution per mode
        det_size = {
            "fast":     (320, 320),
            "accurate": (960, 960),
        }.get(self.mode, (640, 640))

        # ctx_id = -1  → CPU
        self.app.prepare(ctx_id=-1, det_size=det_size)

    def detect_faces(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Detect all faces in an image.
        Returns a list of dicts with keys: bbox, confidence, embedding.
        """
        if self.app is None:
            self.initialize()

        # Use np.fromfile + imdecode to support Unicode/special char paths on Windows
        buf = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Impossible de lire l'image : {image_path}")

        faces = self.app.get(img)

        results = []
        h, w = img.shape[:2]
        for face in faces:
            bbox = face.bbox.astype(int)
            x1 = max(0, int(bbox[0]))
            y1 = max(0, int(bbox[1]))
            x2 = min(w, int(bbox[2]))
            y2 = min(h, int(bbox[3]))

            results.append({
                'bbox':       (x1, y1, x2, y2),
                'confidence': float(face.det_score),
                'embedding':  face.normed_embedding,
            })

        return results
