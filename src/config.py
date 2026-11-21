import os
import yaml
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.join(BASE_DIR, "config", "config.yaml")
        
        self.config_path = config_path
        self.data = {}
        self.load()
        
    def load(self):
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self.data = yaml.safe_load(f)
        except Exception as e:
            # Fallback default configuration if config.yaml is missing
            self.data = {
                "paths": {
                    "database_dir": "database",
                    "database_file": "database/face_organizer.db",
                    "faiss_index_file": "database/faiss_index.bin",
                    "models_dir": "models",
                    "logs_dir": "logs",
                    "log_file": "logs/app.log",
                    "output_dir": "output"
                },
                "processing": {
                    "recognition_threshold": 0.45,
                    "min_face_confidence": 0.6,
                    "cpu_threads": 4,
                    "mode": "balanced",
                    "allowed_extensions": [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff",
                                            ".arw", ".cr2", ".cr3", ".nef", ".nrw", ".orf", ".rw2", ".dng", ".raf", ".pef", ".srw"]
                },
                "gui": {
                    "theme": "dark",
                    "color_theme": "blue",
                    "window_width": 1100,
                    "window_height": 750
                }
            }
        
        self._resolve_paths()
        
    def get(self, key_path: str, default=None):
        parts = key_path.split(".")
        curr = self.data
        for p in parts:
            if isinstance(curr, dict) and p in curr:
                curr = curr[p]
            else:
                return default
        return curr

    def set(self, key_path: str, value):
        parts = key_path.split(".")
        curr = self.data
        for p in parts[:-1]:
            if p not in curr or not isinstance(curr[p], dict):
                curr[p] = {}
            curr = curr[p]
        curr[parts[-1]] = value
        self._resolve_paths()

    def _resolve_paths(self):
        # Resolve paths to absolute paths relative to BASE_DIR if they are relative
        paths_section = self.data.get("paths", {})
        self.db_dir = Path(self._to_abs(paths_section.get("database_dir", "database")))
        self.db_path = Path(self._to_abs(paths_section.get("database_file", "database/face_organizer.db")))
        self.faiss_index_path = Path(self._to_abs(paths_section.get("faiss_index_file", "database/faiss_index.bin")))
        self.models_dir = Path(self._to_abs(paths_section.get("models_dir", "models")))
        self.logs_dir = Path(self._to_abs(paths_section.get("logs_dir", "logs")))
        self.log_file = Path(self._to_abs(paths_section.get("log_file", "logs/app.log")))
        self.output_dir = Path(self._to_abs(paths_section.get("output_dir", "output")))
        self.default_input_dir = Path(self._to_abs(paths_section.get("default_input_dir", ""))) \
            if paths_section.get("default_input_dir") else None
        
        # Ensure directories exist
        self.db_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        if self.default_input_dir:
            self.default_input_dir.mkdir(parents=True, exist_ok=True)
        
    def _to_abs(self, path_str: str) -> str:
        if os.path.isabs(path_str):
            return path_str
        return os.path.join(BASE_DIR, path_str)
    
    def save(self):
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(self.data, f, default_flow_style=False)
        except Exception as e:
            print(f"Error saving config: {e}")

    @property
    def recognition_threshold(self) -> float:
        return float(self.data.get("processing", {}).get("recognition_threshold", 0.45))
        
    @recognition_threshold.setter
    def recognition_threshold(self, val: float):
        if "processing" not in self.data:
            self.data["processing"] = {}
        self.data["processing"]["recognition_threshold"] = val
        
    @property
    def min_face_confidence(self) -> float:
        return float(self.data.get("processing", {}).get("min_face_confidence", 0.6))
        
    @min_face_confidence.setter
    def min_face_confidence(self, val: float):
        if "processing" not in self.data:
            self.data["processing"] = {}
        self.data["processing"]["min_face_confidence"] = val
        
    @property
    def cpu_threads(self) -> int:
        return int(self.data.get("processing", {}).get("cpu_threads", 4))
        
    @cpu_threads.setter
    def cpu_threads(self, val: int):
        if "processing" not in self.data:
            self.data["processing"] = {}
        self.data["processing"]["cpu_threads"] = val
        
    @property
    def mode(self) -> str:
        return str(self.data.get("processing", {}).get("mode", "balanced"))
        
    @mode.setter
    def mode(self, val: str):
        if "processing" not in self.data:
            self.data["processing"] = {}
        self.data["processing"]["mode"] = val

    @property
    def allowed_extensions(self) -> list:
        return list(self.data.get("processing", {}).get("allowed_extensions", [
            ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff",
            ".arw", ".cr2", ".cr3", ".nef", ".nrw", ".orf", ".rw2", ".dng", ".raf", ".pef", ".srw"
        ]))

    @property
    def theme(self) -> str:
        return str(self.data.get("gui", {}).get("theme", "dark"))
        
    @theme.setter
    def theme(self, val: str):
        if "gui" not in self.data:
            self.data["gui"] = {}
        self.data["gui"]["theme"] = val

# Singleton instance
config = Config()
