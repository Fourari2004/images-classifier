"""
Face Organizer AI — Lanceur principal Haute Performance (FastAPI + React SPA)
Exécuter depuis la racine du projet :  python run.py
"""
import sys
import os
import time
import threading
import webbrowser

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Configurations d'exécution optimisées ONNX Runtime
os.environ.setdefault("ORT_LOGGING_LEVEL", "3")
os.environ.setdefault("OMP_NUM_THREADS", "4")

# Silence benign Windows Proactor socket shutdown reset errors (WinError 10054)
if sys.platform == "win32":
    import asyncio
    # Suppress WinError 10054 ConnectionReset noise on Windows asyncio loop
    try:
        from asyncio.proactor_events import _ProactorBasePipeTransport
        _original_call_connection_lost = _ProactorBasePipeTransport._call_connection_lost

        def _silent_call_connection_lost(self, exc=None):
            try:
                _original_call_connection_lost(self, exc)
            except (ConnectionResetError, OSError):
                pass

        _ProactorBasePipeTransport._call_connection_lost = _silent_call_connection_lost
    except Exception:
        pass

import uvicorn
from src.server import app

PORT = 8000
URL = f"http://localhost:{PORT}"

def open_browser():
    # Attendre une seconde que le serveur HTTP soit actif
    time.sleep(1.2)
    print(f"\n[OK] Interface moderne lancée : {URL}")
    webbrowser.open(URL)

def main():
    print("=" * 60)
    print("      Face Organizer AI — Moteur & UI Haute Vitesse")
    print("=" * 60)
    print(f"[*] Démarrage du serveur FastAPI local sur {URL}...")
    
    # Lancement automatique du navigateur
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Lancement du serveur uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")

if __name__ == "__main__":
    main()
