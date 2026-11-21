import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any


class FaceDetector:
    """
    Wraps InsightFace FaceAnalysis with DirectML GPU acceleration and CPU fallback.
    Maintains exact original models and behavior for maximum compatibility.
    """

    def __init__(self, models_dir: str, mode: str = "balanced", cpu_threads: int = 4):
        self.models_dir = Path(models_dir)
        self.mode = mode
        self.cpu_threads = cpu_threads
        self.app = None
        self.active_provider = "CPU"

    def initialize(self):
        """
        Initialize InsightFace FaceAnalysis.
        Automatically uses DirectML (GPU) if available, with CPU fallback.
        """
        try:
            from insightface.app import FaceAnalysis
            import onnxruntime as ort
        except ImportError as e:
            raise ImportError(
                "insightface non installé. Exécutez : pip install insightface onnxruntime-directml"
            ) from e

        root_dir = str(self.models_dir.parent)
        self.models_dir.mkdir(parents=True, exist_ok=True)

        available_providers = ort.get_available_providers()
        providers = []
        ctx_id = -1

        if 'DmlExecutionProvider' in available_providers:
            providers.append('DmlExecutionProvider')
            ctx_id = 0
            self.active_provider = "DirectML (GPU)"
        elif 'CUDAExecutionProvider' in available_providers:
            providers.append('CUDAExecutionProvider')
            ctx_id = 0
            self.active_provider = "CUDA (GPU)"

        providers.append('CPUExecutionProvider')
        if ctx_id == -1:
            self.active_provider = "CPU"

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

        try:
            self.app.prepare(ctx_id=ctx_id, det_size=det_size)
        except Exception:
            # Fallback CPU if driver or memory issue
            self.active_provider = "CPU (Fallback)"
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
