import os
import sys
import glob
import time
import asyncio
import webbrowser
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from src.config import config
from src.database import Database
from src.faiss_index import FAISSIndex
from src.image_manager import ImageManager
from src.recognizer import Recognizer
from src.organizer import OrganizerPipeline

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = PROJECT_ROOT / "frontend" / "facesorter-ai" / "dist"

app = FastAPI(title="FaceSorter AI API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core singletons
db = Database(str(config.db_path))

# Ensure faces directory (data_faces) exists for crops and face metadata
FACES_DATA_DIR = PROJECT_ROOT / "data_faces"
FACES_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Cache / thumbnails directory
thumbnails_dir = config.db_dir / "thumbnails"
thumbnails_dir.mkdir(parents=True, exist_ok=True)

img_mgr = ImageManager(str(config.output_dir), str(thumbnails_dir))
faiss_index = FAISSIndex()
if not faiss_index.load(str(config.faiss_index_path)):
    embeddings_data = db.get_all_embeddings()
    if embeddings_data:
        faiss_index.rebuild(embeddings_data)
        faiss_index.save(str(config.faiss_index_path))

# Scan tracking
pipeline: Optional[OrganizerPipeline] = None
recent_logs: List[str] = []
current_scan_folder = ""
scan_history: List[Dict[str, Any]] = []

def log_callback(msg: str):
    global recent_logs
    recent_logs.append(msg)
    if len(recent_logs) > 300:
        recent_logs = recent_logs[-300:]

# Pydantic models
class RenamePersonRequest(BaseModel):
    new_name: str

class MergePersonRequest(BaseModel):
    target_person_id: int

class MergeMultipleFacesRequest(BaseModel):
    source_person_ids: List[int]
    target_person_id: int

class StartScanRequest(BaseModel):
    source_dir: str
    output_dir: Optional[str] = None
    force_reprocess: Optional[bool] = False

class AssociateFaceRequest(BaseModel):
    image_id: int
    face_box: str
    old_person_id: Optional[int] = None
    target_person_id: Optional[int] = None
    new_person_name: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    recognition_threshold: Optional[float] = None
    min_face_confidence: Optional[float] = None
    cpu_threads: Optional[int] = None
    mode: Optional[str] = None
    output_dir: Optional[str] = None

# Helper to find avatar for person
def get_person_avatar_url(person_id: int) -> str:
    images = db.get_person_images(person_id)
    if not images:
        return ""
    first_img = images[0]
    sha256 = first_img.get('sha256')
    face_box = first_img.get('face_box', '')
    if sha256 and face_box:
        thumb_path = img_mgr.get_face_thumbnail_path(sha256, face_box)
        if thumb_path.exists():
            return f"/api/thumbnail/{thumb_path.name}"
        created = img_mgr.create_face_thumbnail(first_img['path'], sha256, face_box)
        if created and Path(created).exists():
            return f"/api/thumbnail/{Path(created).name}"
    return f"/api/image-file?path={first_img['path']}"

# --- API ROUTES ---

@app.get("/api/stats")
def get_stats():
    all_persons = db.get_all_persons()
    all_images = db.get_all_images()
    processed_count = sum(1 for img in all_images if img.get('processed') == 1)
    
    conn = db._get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ImagePersons")
        total_faces = cur.fetchone()[0]
    finally:
        conn.close()

    return {
        "total_people": len(all_persons),
        "total_photos": len(all_images),
        "processed_photos": processed_count,
        "total_faces": total_faces,
        "output_dir": str(config.output_dir),
        "models_dir": str(config.models_dir),
        "data_faces_dir": str(FACES_DATA_DIR)
    }

@app.get("/api/people")
def get_people(q: str = Query("", description="Search term")):
    raw_people = db.get_all_persons(search_query=q)
    results = []
    for p in raw_people:
        pid = p["id"]
        results.append({
            "id": str(pid),
            "name": p["display_name"],
            "folderName": p["folder_name"],
            "avatarUrl": get_person_avatar_url(pid),
            "photosCount": p.get("photo_count", 0),
            "facesCount": p.get("photo_count", 0),
            "lastSeen": p.get("last_seen") or p.get("created_at") or ""
        })
    return results

@app.get("/api/people/{person_id}")
def get_person_detail(person_id: int):
    p = db.get_person(person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    
    images = db.get_person_images(person_id)
    photos = []
    for img in images:
        w = img.get('width') or 1
        h = img.get('height') or 1
        face_box_str = img.get('face_box', '')
        
        bbox = {"x": 10, "y": 10, "w": 20, "h": 20}
        if face_box_str:
            try:
                coords = [float(c) for c in face_box_str.split(',')]
                if len(coords) == 4 and w > 0 and h > 0:
                    x1, y1, x2, y2 = coords
                    bbox = {
                        "x": max(0, min(100, (x1 / w) * 100)),
                        "y": max(0, min(100, (y1 / h) * 100)),
                        "w": max(1, min(100, ((x2 - x1) / w) * 100)),
                        "h": max(1, min(100, ((y2 - y1) / h) * 100))
                    }
            except Exception:
                pass

        sha256 = img.get('sha256', '')
        thumb_url = ""
        if sha256 and face_box_str:
            tpath = img_mgr.get_face_thumbnail_path(sha256, face_box_str)
            if tpath.exists():
                thumb_url = f"/api/thumbnail/{tpath.name}"
            else:
                c = img_mgr.create_face_thumbnail(img['path'], sha256, face_box_str)
                if c and Path(c).exists():
                    thumb_url = f"/api/thumbnail/{Path(c).name}"

        photos.append({
            "id": str(img['id']),
            "url": f"/api/image-file?path={img['path']}",
            "name": Path(img['path']).name,
            "date": img.get('date', ''),
            "size": "Original",
            "facesCount": 1,
            "path": img['path'],
            "faces": [{
                "id": f"face_{img['id']}_{person_id}",
                "photoId": str(img['id']),
                "boundingBox": bbox,
                "personId": str(person_id),
                "confidence": img.get('confidence', 0.95),
                "croppedUrl": thumb_url
            }]
        })

    return {
        "person": {
            "id": str(p["id"]),
            "name": p["display_name"],
            "folderName": p["folder_name"],
            "avatarUrl": get_person_avatar_url(person_id),
            "photosCount": len(photos),
            "facesCount": len(photos),
            "lastSeen": p.get("created_at", "")
        },
        "photos": photos
    }

# --- FACES SPECIFIC ROUTES (Data Faces Management) ---
@app.get("/api/faces")
def get_all_faces(page: int = 1, limit: int = 100, search: str = "", unique_per_person: bool = True):
    """
    Returns detected face crops.
    If unique_per_person=True, returns exactly one representative face per person (no duplicates).
    """
    conn = db._get_connection()
    try:
        cur = conn.cursor()
        if unique_per_person:
            query = """
                SELECT ip.image_id, ip.person_id, ip.face_box, ip.confidence,
                       p.display_name, p.folder_name,
                       img.path, img.sha256, img.date
                FROM ImagePersons ip
                JOIN Persons p ON ip.person_id = p.id
                JOIN Images img ON ip.image_id = img.id
            """
            params = []
            if search.strip():
                query += " WHERE p.display_name LIKE ? OR p.folder_name LIKE ? "
                like_s = f"%{search.strip()}%"
                params = [like_s, like_s]

            query += " GROUP BY ip.person_id ORDER BY ip.confidence DESC, ip.person_id ASC LIMIT ? OFFSET ?"
            offset = (page - 1) * limit
            params.extend([limit, offset])

            cur.execute(query, tuple(params))
            rows = [dict(r) for r in cur.fetchall()]

            count_query = "SELECT COUNT(DISTINCT person_id) FROM ImagePersons"
            if search.strip():
                count_query = """
                    SELECT COUNT(DISTINCT ip.person_id) 
                    FROM ImagePersons ip 
                    JOIN Persons p ON ip.person_id = p.id 
                    WHERE p.display_name LIKE ? OR p.folder_name LIKE ?
                """
                cur.execute(count_query, (like_s, like_s))
            else:
                cur.execute(count_query)
            total_count = cur.fetchone()[0]

        else:
            query = """
                SELECT ip.image_id, ip.person_id, ip.face_box, ip.confidence,
                       p.display_name, p.folder_name,
                       img.path, img.sha256, img.date
                FROM ImagePersons ip
                JOIN Persons p ON ip.person_id = p.id
                JOIN Images img ON ip.image_id = img.id
            """
            params = []
            if search.strip():
                query += " WHERE p.display_name LIKE ? OR p.folder_name LIKE ? "
                like_s = f"%{search.strip()}%"
                params = [like_s, like_s]
            
            query += " ORDER BY ip.image_id DESC LIMIT ? OFFSET ?"
            offset = (page - 1) * limit
            params.extend([limit, offset])
            
            cur.execute(query, tuple(params))
            rows = [dict(r) for r in cur.fetchall()]

            cur.execute("SELECT COUNT(*) FROM ImagePersons")
            total_count = cur.fetchone()[0]

        faces = []
        for r in rows:
            sha256 = r.get('sha256', '')
            box_str = r.get('face_box', '')
            thumb_name = ""
            if sha256 and box_str:
                tpath = img_mgr.get_face_thumbnail_path(sha256, box_str)
                if not tpath.exists():
                    img_mgr.create_face_thumbnail(r['path'], sha256, box_str)
                if tpath.exists():
                    thumb_name = tpath.name
                    
            faces.append({
                "id": f"face_{r['image_id']}_{r['person_id']}_{box_str.replace(',', '_')}",
                "face_id": f"{r['image_id']}_{box_str}",
                "person_id": r['person_id'],
                "person_name": r['display_name'],
                "image_id": r['image_id'],
                "image_path": r['path'],
                "face_box": box_str,
                "confidence": r.get('confidence', 0.9),
                "thumbnail_url": f"/api/thumbnail/{thumb_name}" if thumb_name else "",
                "date": r.get('date', '')
            })

        return {
            "total": total_count,
            "page": page,
            "limit": limit,
            "faces": faces
        }
    finally:
        conn.close()

@app.post("/api/faces/merge-multiple")
def merge_multiple_faces(req: MergeMultipleFacesRequest):
    """Merges multiple selected person IDs into a single target person ID."""
    target_id = req.target_person_id
    dest_person = db.get_person(target_id)
    if not dest_person:
        raise HTTPException(status_code=404, detail="Target person not found")

    merged_count = 0
    for src_id in set(req.source_person_ids):
        if src_id == target_id:
            continue
        src_person = db.get_person(src_id)
        if not src_person:
            continue
            
        db.merge_persons(src_id, target_id)
        
        # Move physical output files
        src_folder = config.output_dir / src_person['folder_name']
        dest_folder = config.output_dir / dest_person['folder_name']
        if src_folder.exists():
            dest_folder.mkdir(parents=True, exist_ok=True)
            for item in src_folder.iterdir():
                target_file = dest_folder / item.name
                if not target_file.exists():
                    try:
                        item.rename(target_file)
                    except Exception:
                        pass
            try:
                src_folder.rmdir()
            except Exception:
                pass
        merged_count += 1

    # Rebuild FAISS index once after all merges
    all_emb = db.get_all_embeddings()
    faiss_index.rebuild(all_emb)
    faiss_index.save(str(config.faiss_index_path))

    return {
        "status": "ok",
        "merged_count": merged_count,
        "message": f"{merged_count} profil(s) fusionné(s) vers {dest_person['display_name']}"
    }

@app.post("/api/people/{person_id}/rename")
def rename_person(person_id: int, req: RenamePersonRequest):
    new_name = req.new_name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    p = db.get_person(person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
        
    old_folder = p['folder_name']
    new_folder = new_name.lower().replace(" ", "_")
    
    db.rename_person(person_id, new_name, new_folder)
    
    old_path = config.output_dir / old_folder
    new_path = config.output_dir / new_folder
    if old_path.exists() and old_path != new_path:
        try:
            old_path.rename(new_path)
        except Exception:
            pass
            
    return {"status": "ok", "message": f"Renamed to {new_name}"}

@app.post("/api/people/{person_id}/merge")
def merge_person(person_id: int, req: MergePersonRequest):
    target_id = req.target_person_id
    if person_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot merge person into themselves")
        
    src_person = db.get_person(person_id)
    dest_person = db.get_person(target_id)
    if not src_person or not dest_person:
        raise HTTPException(status_code=404, detail="One or both persons not found")
        
    db.merge_persons(person_id, target_id)
    
    all_emb = db.get_all_embeddings()
    faiss_index.rebuild(all_emb)
    faiss_index.save(str(config.faiss_index_path))
    
    src_folder = config.output_dir / src_person['folder_name']
    dest_folder = config.output_dir / dest_person['folder_name']
    if src_folder.exists():
        dest_folder.mkdir(parents=True, exist_ok=True)
        for item in src_folder.iterdir():
            target_file = dest_folder / item.name
            if not target_file.exists():
                try:
                    item.rename(target_file)
                except Exception:
                    pass
        try:
            src_folder.rmdir()
        except Exception:
            pass

    return {"status": "ok", "message": f"Merged {src_person['display_name']} into {dest_person['display_name']}"}

@app.delete("/api/people/{person_id}")
def delete_person(person_id: int):
    p = db.get_person(person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
        
    db.execute_write("DELETE FROM Persons WHERE id = ?", (person_id,))
    all_emb = db.get_all_embeddings()
    faiss_index.rebuild(all_emb)
    faiss_index.save(str(config.faiss_index_path))
    
    return {"status": "ok"}

# Global recognizer instance for search & suggestions
recognizer = Recognizer(db, faiss_index, threshold=config.recognition_threshold)

@app.get("/api/suggestions")
def get_merge_suggestions(threshold: float = Query(0.55)):
    """Suggests profiles that have high facial similarity and could be merged."""
    return recognizer.find_merge_suggestions(threshold=threshold)

@app.get("/api/photos")
def get_photos(page: int = 1, limit: int = 40, person_ids: str = Query("", description="Comma-separated person IDs for AND search")):
    all_images = db.get_all_images()
    
    # Combined multi-person filtering (Photos where person A AND person B appear)
    if person_ids.strip():
        try:
            target_pids = [int(p) for p in person_ids.split(",") if p.strip()]
            if target_pids:
                conn = db._get_connection()
                try:
                    cur = conn.cursor()
                    placeholders = ",".join("?" for _ in target_pids)
                    query = f"""
                        SELECT image_id FROM ImagePersons 
                        WHERE person_id IN ({placeholders})
                        GROUP BY image_id
                        HAVING COUNT(DISTINCT person_id) = ?
                    """
                    cur.execute(query, tuple(target_pids + [len(target_pids)]))
                    matching_img_ids = {r[0] for r in cur.fetchall()}
                    all_images = [img for img in all_images if img['id'] in matching_img_ids]
                finally:
                    conn.close()
        except Exception:
            pass

    sorted_images = sorted(all_images, key=lambda x: x.get('date') or "", reverse=True)
    start_idx = (page - 1) * limit
    paged = sorted_images[start_idx:start_idx + limit]
    
    results = []
    for img in paged:
        results.append({
            "id": str(img['id']),
            "url": f"/api/image-file?path={img['path']}",
            "name": Path(img['path']).name,
            "date": img.get('date', ''),
            "size": "Original",
            "facesCount": 1,
            "path": img['path'],
            "faces": []
        })
    return {
        "total": len(all_images),
        "page": page,
        "limit": limit,
        "photos": results
    }

@app.get("/api/photos/{photo_id}")
def get_photo_detail(photo_id: int):
    rows = db.execute_read("SELECT * FROM Images WHERE id = ?", (photo_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Photo not found")
    img = rows[0]
    
    persons = db.get_image_persons(photo_id)
    w = img.get('width') or 1
    h = img.get('height') or 1
    sha256 = img.get('sha256', '')
    
    faces = []
    for p in persons:
        box_str = p.get('face_box', '')
        bbox = {"x": 10, "y": 10, "w": 20, "h": 20}
        if box_str:
            try:
                coords = [float(c) for c in box_str.split(',')]
                if len(coords) == 4 and w > 0 and h > 0:
                    bbox = {
                        "x": max(0, min(100, (coords[0] / w) * 100)),
                        "y": max(0, min(100, (coords[1] / h) * 100)),
                        "w": max(1, min(100, ((coords[2] - coords[0]) / w) * 100)),
                        "h": max(1, min(100, ((coords[3] - coords[1]) / h) * 100))
                    }
            except Exception:
                pass

        thumb_url = ""
        if sha256 and box_str:
            tpath = img_mgr.get_face_thumbnail_path(sha256, box_str)
            if tpath.exists():
                thumb_url = f"/api/thumbnail/{tpath.name}"
            else:
                c = img_mgr.create_face_thumbnail(img['path'], sha256, box_str)
                if c and Path(c).exists():
                    thumb_url = f"/api/thumbnail/{Path(c).name}"

        faces.append({
            "id": f"face_{photo_id}_{p['id']}",
            "photoId": str(photo_id),
            "boundingBox": bbox,
            "personId": str(p['id']),
            "confidence": p.get('confidence', 0.9),
            "croppedUrl": thumb_url,
            "personName": p.get('display_name', '')
        })

    return {
        "id": str(img['id']),
        "url": f"/api/image-file?path={img['path']}",
        "name": Path(img['path']).name,
        "date": img.get('date', ''),
        "size": f"{w}x{h}",
        "facesCount": len(faces),
        "path": img['path'],
        "faces": faces
    }

@app.post("/api/associate-face")
def associate_face(req: AssociateFaceRequest):
    img = db.execute_read("SELECT * FROM Images WHERE id = ?", (req.image_id,))
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    target_person_id = req.target_person_id
    
    if req.new_person_name:
        clean_name = req.new_person_name.strip()
        folder_name = clean_name.lower().replace(" ", "_")
        target_person_id = db.add_person(clean_name, folder_name)
        
    if target_person_id is None:
        if req.old_person_id:
            db.remove_image_person_link(req.image_id, req.old_person_id, req.face_box)
        return {"status": "ok", "message": "Face disassociated"}

    if req.old_person_id:
        db.reassign_face(req.image_id, req.old_person_id, req.face_box, target_person_id, 0.99)
    else:
        db.link_image_person(req.image_id, target_person_id, tuple(map(int, req.face_box.split(','))), 0.99)
        
    return {"status": "ok", "person_id": target_person_id}

import io
import zipfile
from fastapi.responses import StreamingResponse

@app.get("/api/export-zip")
def export_photos_zip(person_id: Optional[int] = Query(None)):
    """Exports photos (either for a specific person or selected) as a downloadable ZIP archive."""
    if person_id:
        images = db.get_person_images(person_id)
        p = db.get_person(person_id)
        archive_name = f"{(p['folder_name'] if p else 'person')}_photos.zip"
    else:
        images = db.get_all_images()[:200]
        archive_name = "collection_photos.zip"

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        added_names = set()
        for img in images:
            p_file = Path(img['path'])
            if p_file.exists():
                arcname = p_file.name
                counter = 1
                while arcname in added_names:
                    arcname = f"{p_file.stem}_{counter}{p_file.suffix}"
                    counter += 1
                added_names.add(arcname)
                zf.write(p_file, arcname=arcname)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={archive_name}"}
    )

@app.get("/api/image-file")
def get_image_file(path: str = Query(..., description="Absolute path on system")):
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(p))

@app.get("/api/thumbnail/{filename}")
def get_thumbnail(filename: str):
    p = thumbnails_dir / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(p), media_type="image/jpeg")

# --- Native Dialog / Selection Route ---
@app.post("/api/browse-folder")
def browse_folder(title: str = Query("Sélectionner un dossier")):
    """Opens a native Windows folder picker dialog and returns the chosen path."""
    import tkinter as tk
    from tkinter import filedialog
    
    try:
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        folder = filedialog.askdirectory(title=title)
        root.destroy()
        if folder:
            allowed_exts = set(config.allowed_extensions)
            count = 0
            for r, _, files in os.walk(folder):
                for f in files:
                    if Path(f).suffix.lower() in allowed_exts:
                        count += 1
            return {"folder": folder, "photosCount": count}
        return {"folder": "", "photosCount": 0}
    except Exception as e:
        return {"error": str(e), "folder": "", "photosCount": 0}

# --- Scanning Endpoints ---
@app.post("/api/scan/start")
def start_scan(req: StartScanRequest):
    global pipeline, current_scan_folder, scan_history
    source_dir = req.source_dir.strip()
    if not source_dir or not Path(source_dir).exists():
        raise HTTPException(status_code=400, detail="Invalid source directory")

    # If user provided a specific output_dir, update configuration
    if req.output_dir:
        out_p = Path(req.output_dir.strip())
        # Only accept absolute paths to avoid accidental relative path issues
        if not out_p.is_absolute():
            out_p = PROJECT_ROOT / out_p
        out_p.mkdir(parents=True, exist_ok=True)
        config.set("paths.output_dir", str(out_p))
        config.save()
        img_mgr.output_dir = out_p
        img_mgr.output_dir.mkdir(parents=True, exist_ok=True)

    if pipeline and pipeline.is_running:
        raise HTTPException(status_code=400, detail="A scan is already in progress")

    current_scan_folder = source_dir
    pipeline = OrganizerPipeline(
        db=db,
        index=faiss_index,
        img_mgr=img_mgr,
        log_callback=log_callback
    )
    pipeline.start_analysis(source_dir, force_reprocess=bool(req.force_reprocess))
    
    return {"status": "started", "source_dir": source_dir, "output_dir": str(img_mgr.output_dir)}

@app.post("/api/scan/pause")
def pause_scan():
    if pipeline and pipeline.is_running:
        pipeline.pause()
        return {"status": "paused"}
    return {"status": "not running"}

@app.post("/api/scan/resume")
def resume_scan():
    if pipeline and pipeline.is_running:
        pipeline.resume()
        return {"status": "resumed"}
    return {"status": "not running"}

@app.post("/api/scan/cancel")
def cancel_scan():
    if pipeline and pipeline.is_running:
        pipeline.cancel()
        return {"status": "cancelled"}
    return {"status": "not running"}

@app.get("/api/scan/status")
def get_scan_status():
    global pipeline, current_scan_folder
    if not pipeline:
        return {
            "isScanning": False,
            "progress": 0,
            "status": "idle",
            "currentPhotoName": "",
            "currentPhotoUrl": "",
            "analyzedCount": 0,
            "totalCount": 0,
            "detectedFacesCount": 0,
            "recognizedPeopleCount": len(db.get_all_persons()),
            "elapsedTime": "0.0s",
            "recentLogs": recent_logs[-15:]
        }

    stats = pipeline.stats
    total = stats.get('total_images', 0)
    processed = stats.get('processed_images', 0)
    progress = int((processed / total * 100)) if total > 0 else 0
    curr_path = stats.get('current_image_path', '')

    return {
        "isScanning": pipeline.is_running,
        "isPaused": pipeline.is_paused,
        "progress": progress,
        "currentPhotoName": Path(curr_path).name if curr_path else "",
        "currentPhotoUrl": f"/api/image-file?path={curr_path}" if curr_path else "",
        "analyzedCount": processed,
        "totalCount": total,
        "detectedFacesCount": stats.get('detected_faces', 0),
        "recognizedPeopleCount": stats.get('total_persons', 0),
        "elapsedTime": f"{stats.get('elapsed_time', 0):.1f}s",
        "recentLogs": recent_logs[-15:]
    }

@app.get("/api/history")
def get_history():
    return scan_history

@app.get("/api/settings")
def get_settings():
    return {
        "modelName": "InsightFace buffalo_l (ArcFace + RetinaFace)",
        "recognition_threshold": config.recognition_threshold,
        "min_face_confidence": config.min_face_confidence,
        "cpu_threads": config.cpu_threads,
        "mode": config.mode,
        "output_dir": str(config.output_dir),
        "database_path": str(config.db_path)
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.recognition_threshold is not None:
        config.set("processing.recognition_threshold", req.recognition_threshold)
    if req.min_face_confidence is not None:
        config.set("processing.min_face_confidence", req.min_face_confidence)
    if req.cpu_threads is not None:
        config.set("processing.cpu_threads", req.cpu_threads)
    if req.mode is not None:
        config.set("processing.mode", req.mode)
    if req.output_dir is not None:
        config.set("paths.output_dir", req.output_dir)
        img_mgr.output_dir = Path(req.output_dir)
        
    config.save()
    return {"status": "ok", "settings": get_settings()}

# Serve built frontend static assets if dist exists
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(DIST_DIR / "index.html"))
