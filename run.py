"""
Face Organizer AI — Lanceur principal
Exécuter depuis la racine du projet :  python run.py
"""
import sys
import os

# Ajoute la racine du projet au sys.path pour que les imports 'src.*' fonctionnent
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Variables d'environnement ONNX Runtime (CPU uniquement, logs réduits)
os.environ.setdefault("ORT_LOGGING_LEVEL", "3")
os.environ.setdefault("OMP_NUM_THREADS", "4")

from src.gui.app import FaceOrganizerApp

def main():
    try:
        app = FaceOrganizerApp()
        app.mainloop()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
