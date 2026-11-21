import os
import shutil
import hashlib
from PIL import Image, ImageFile
from PIL.ExifTags import TAGS
from pathlib import Path
from typing import Tuple, Optional, List
from datetime import datetime

# Allow PIL to open very large images (high-res photos, medium-format cameras, etc.)
Image.MAX_IMAGE_PIXELS = None
# Allow loading of truncated image files (common with large RAW-converted JPEGs)
ImageFile.LOAD_TRUNCATED_IMAGES = True

class ImageManager:
    def __init__(self, output_dir: str, cache_dir: str):
        self.output_dir = Path(output_dir)
        self.cache_dir = Path(cache_dir)
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get_sha256(file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def get_metadata(file_path: str) -> Tuple[int, int, str]:
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                date_str = None
                try:
                    exif_data = img._getexif()
                except AttributeError:
                    exif_data = None
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag in ("DateTimeOriginal", "DateTime"):
                            try:
                                dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                                date_str = dt.isoformat()
                                break
                            except ValueError:
                                continue
                
                if not date_str:
                    mtime = os.path.getmtime(file_path)
                    date_str = datetime.fromtimestamp(mtime).isoformat()
                    
                return width, height, date_str
        except Exception:
            mtime = os.path.getmtime(file_path)
            return 0, 0, datetime.fromtimestamp(mtime).isoformat()

    def get_face_thumbnail_path(self, sha256: str, face_box_str: str) -> Path:
        sanitized_box = face_box_str.replace(",", "_")
        filename = f"{sha256}_{sanitized_box}.jpg"
        return self.cache_dir / filename

    def create_face_thumbnail(self, file_path: str, sha256: str, face_box_str: str) -> Optional[str]:
        try:
            thumb_path = self.get_face_thumbnail_path(sha256, face_box_str)
            if thumb_path.exists():
                return str(thumb_path)

            x1, y1, x2, y2 = map(int, face_box_str.split(","))
            
            with Image.open(file_path) as img:
                w, h = img.size
                box_w = x2 - x1
                box_h = y2 - y1
                
                pad_w = int(box_w * 0.15)
                pad_h = int(box_h * 0.15)
                
                nx1 = max(0, x1 - pad_w)
                ny1 = max(0, y1 - pad_h)
                nx2 = min(w, x2 + pad_w)
                ny2 = min(h, y2 + pad_h)
                
                crop_img = img.crop((nx1, ny1, nx2, ny2))
                crop_img.thumbnail((160, 160), Image.Resampling.LANCZOS)
                
                if crop_img.mode in ("RGBA", "P"):
                    crop_img = crop_img.convert("RGB")
                    
                crop_img.save(thumb_path, "JPEG", quality=92)
                return str(thumb_path)
        except Exception as e:
            return None

    def copy_image_to_person(self, file_path: str, person_folder_name: str, mode: str = "copy") -> Path:
        """
        Organizes image into output/person_folder_name/
        mode can be: 'copy', 'hardlink', 'symlink'
        """
        person_dir = self.output_dir / person_folder_name
        person_dir.mkdir(parents=True, exist_ok=True)

        src_path = Path(file_path)
        dest_name = src_path.name
        dest_path = person_dir / dest_name

        if dest_path.exists():
            base = src_path.stem
            ext = src_path.suffix
            counter = 1
            while True:
                new_name = f"{base}_{counter}{ext}"
                dest_path = person_dir / new_name
                if not dest_path.exists():
                    break
                counter += 1

        if mode == "hardlink":
            try:
                os.link(file_path, dest_path)
                return dest_path
            except Exception:
                pass  # Fallback to normal copy

        elif mode == "symlink":
            try:
                os.symlink(file_path, dest_path)
                return dest_path
            except Exception:
                pass

        # Default physical copy
        shutil.copy2(file_path, dest_path)
        return dest_path

    @staticmethod
    def tag_image_with_persons(file_path: str, person_names: List[str]):
        """
        Tags JPEG image metadata with person names (IPTC / EXIF UserComment)
        Readable by Adobe Lightroom, Windows Search, Google Photos.
        """
        if not file_path.lower().endswith(('.jpg', '.jpeg')):
            return

        try:
            import piexif
            exif_dict = piexif.load(file_path)
            tags_str = "; ".join(person_names)
            exif_dict["0th"][piexif.ImageIFD.ImageDescription] = tags_str.encode('utf-8')
            exif_dict["Exif"][piexif.ExifIFD.UserComment] = tags_str.encode('utf-8')
            exif_bytes = piexif.dump(exif_dict)
            piexif.insert(exif_bytes, file_path)
        except Exception:
            pass
