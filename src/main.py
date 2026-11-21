import sys
import os

# Assure que la racine du projet est dans le path (nécessaire pour python -m src.main)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

os.environ.setdefault("ORT_LOGGING_LEVEL", "3")
os.environ.setdefault("OMP_NUM_THREADS", "4")

from src.gui.app import FaceOrganizerApp

def main():
    try:
        app = FaceOrganizerApp()
        app.mainloop()
    except Exception as e:
        print(f"Failed to start Face Organizer AI: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
