import os
import shutil
import hashlib
from PIL import Image
from PIL.ExifTags import TAGS
from pathlib import Path
from typing import Tuple, Optional
from datetime import datetime

class ImageManager:
    def __init__(self, output_dir: str, cache_dir: str):
        self.output_dir = Path(output_dir)
        self.cache_dir = Path(cache_dir)
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get_sha256(file_path: str) -> str:
        """
        Calculate SHA256 of a file.
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def get_metadata(file_path: str) -> Tuple[int, int, str]:
        """
        Get width, height, and creation date of the image.
        Returns: (width, height, ISO_date_string)
        """
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                
                # Try getting EXIF date (JPEG only — other formats may not have _getexif)
                date_str = None
                try:
                    exif_data = img._getexif()
                except AttributeError:
                    exif_data = None
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == "DateTimeOriginal" or tag == "DateTime":
                            try:
                                # Standard EXIF format: "YYYY:MM:DD HH:MM:SS"
                                dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                                date_str = dt.isoformat()
                                break
                            except ValueError:
                                continue
                
                if not date_str:
                    # Fallback to file creation time
                    mtime = os.path.getmtime(file_path)
                    date_str = datetime.fromtimestamp(mtime).isoformat()
                    
                return width, height, date_str
        except Exception:
            # Fallback for corrupted/unreadable images
            mtime = os.path.getmtime(file_path)
            return 0, 0, datetime.fromtimestamp(mtime).isoformat()

    def get_face_thumbnail_path(self, sha256: str, face_box_str: str) -> Path:
        # Create a unique filename for the cached crop
        # face_box_str: "x1,y1,x2,y2"
        sanitized_box = face_box_str.replace(",", "_")
        filename = f"{sha256}_{sanitized_box}.jpg"
        return self.cache_dir / filename

    def create_face_thumbnail(self, file_path: str, sha256: str, face_box_str: str) -> Optional[str]:
        """
        Crop face from the original image, resize it, and save it in cache directory.
        Returns absolute path of the cached thumbnail or None.
        """
        try:
            thumb_path = self.get_face_thumbnail_path(sha256, face_box_str)
            if thumb_path.exists():
                return str(thumb_path)

            x1, y1, x2, y2 = map(int, face_box_str.split(","))
            
            with Image.open(file_path) as img:
                # Add padding around the face box if possible
                w, h = img.size
                box_w = x2 - x1
                box_h = y2 - y1
                
                pad_w = int(box_w * 0.15)
                pad_h = int(box_h * 0.15)
                
                nx1 = max(0, x1 - pad_w)
                ny1 = max(0, y1 - pad_h)
                nx2 = min(w, x2 + pad_w)
                ny2 = min(h, y2 + pad_h)
                
                # Crop
                crop_img = img.crop((nx1, ny1, nx2, ny2))
                # Resize to standard size (e.g., 128x128)
                crop_img.thumbnail((128, 128), Image.Resampling.LANCZOS)
                
                # Save as JPEG
                # Convert RGBA to RGB if necessary
                if crop_img.mode in ("RGBA", "P"):
                    crop_img = crop_img.convert("RGB")
                    
                crop_img.save(thumb_path, "JPEG", quality=90)
                return str(thumb_path)
        except Exception as e:
            print(f"Error creating face thumbnail for {file_path}: {e}")
            return None

    def copy_image_to_person(self, file_path: str, person_folder_name: str) -> Path:
        """
        Copy an image into output/person_folder_name/.
        Handles duplicate filenames by appending a counter (e.g. photo_1.jpg).
        Returns the destination path.
        """
        person_dir = self.output_dir / person_folder_name
        person_dir.mkdir(parents=True, exist_ok=True)

        src_path = Path(file_path)
        dest_name = src_path.name
        dest_path = person_dir / dest_name

        if dest_path.exists():
            # Handle name collision
            base = src_path.stem
            ext = src_path.suffix
            counter = 1
            while True:
                new_name = f"{base}_{counter}{ext}"
                dest_path = person_dir / new_name
                if not dest_path.exists():
                    break
                counter += 1

        shutil.copy2(file_path, dest_path)
        return dest_path

    def remove_image_from_person(self, file_path: str, person_folder_name: str):
        """
        Removes the copied image from output/person_folder_name/ if it exists.
        Matches either by the exact filename or searches by matching size/SHA256 if renamed.
        """
        person_dir = self.output_dir / person_folder_name
        if not person_dir.exists():
            return

        src_name = Path(file_path).name
        possible_file = person_dir / src_name
        if possible_file.exists():
            # Check if sizes match or simply remove
            os.remove(possible_file)
            return

        # If name collided and was renamed, we look for matching file size & content hash
        # To be simple: if the file name matches with an underscore, e.g. name_*.ext
        base = Path(file_path).stem
        ext = Path(file_path).suffix
        for f in person_dir.glob(f"{base}_*{ext}"):
            try:
                # If content hash matches
                if self.get_sha256(str(f)) == self.get_sha256(file_path):
                    os.remove(f)
                    break
            except Exception:
                continue

    def rename_person_folder(self, old_folder_name: str, new_folder_name: str):
        """
        Rename output/old_folder_name to output/new_folder_name.
        """
        old_path = self.output_dir / old_folder_name
        new_path = self.output_dir / new_folder_name
        if old_path.exists() and not new_path.exists():
            shutil.move(str(old_path), str(new_path))
