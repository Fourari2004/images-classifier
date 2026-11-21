"""
raw_converter.py
Ultra-fast RAW files converter (ARW, CR2, NEF, DNG, etc.)
First attempts instant extraction of the full-resolution embedded JPEG.
Falls back to rawpy half-size decoding if no embedded JPEG is found.
"""
import os
import tempfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("FaceOrganizerAI")

RAW_EXTENSIONS = {".arw", ".cr2", ".cr3", ".nef", ".nrw", ".orf", ".rw2", ".dng", ".raf", ".pef", ".srw"}


def is_raw_file(file_path: str) -> bool:
    ext = Path(file_path).suffix.lower()
    return ext in RAW_EXTENSIONS


def convert_raw_to_jpeg(raw_path: str, quality: int = 90) -> Optional[str]:
    """
    Fast conversion of RAW files.
    1. First tries instant embedded JPEG thumbnail extraction (5-10ms vs 1500ms).
    2. Falls back to fast half-size rawpy postprocessing.
    """
    # Create temp file
    tmp_file = tempfile.NamedTemporaryFile(suffix=".jpg", prefix="raw_thumb_", delete=False)
    tmp_path = tmp_file.name
    tmp_file.close()

    try:
        import rawpy
        from PIL import Image
        import io

        with rawpy.imread(raw_path) as raw:
            # 1. Instant Embedded Preview extraction
            try:
                thumb = raw.extract_thumb()
                if thumb.format == rawpy.ThumbFormat.JPEG:
                    with open(tmp_path, "wb") as f:
                        f.write(thumb.data)
                    logger.info(f"[RAW] Instant embedded JPEG extracted for {Path(raw_path).name}")
                    return tmp_path
                elif thumb.format == rawpy.ThumbFormat.BITMAP:
                    img = Image.fromarray(thumb.data)
                    img.save(tmp_path, "JPEG", quality=quality)
                    return tmp_path
            except Exception:
                pass

            # 2. Fallback: Fast rawpy processing (half_size=True for 3x faster AI face detection)
            rgb = raw.postprocess(
                use_camera_wb=True,
                half_size=True,
                no_auto_bright=True,
                output_bps=8
            )
            img = Image.fromarray(rgb)
            img.save(tmp_path, "JPEG", quality=quality, optimize=False)
            logger.info(f"[RAW] Fast half-size decode for {Path(raw_path).name}")
            return tmp_path

    except Exception as e:
        logger.error(f"[RAW] Failed to decode {raw_path}: {e}")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return None


def cleanup_temp_jpeg(tmp_path: Optional[str]):
    if tmp_path and os.path.exists(tmp_path):
        try:
            os.remove(tmp_path)
        except Exception:
            pass
