"""
raw_converter.py
Converts RAW files (ARW, CR2, NEF, DNG, etc.) to temporary JPEG files
for processing by the face detection pipeline.
Uses rawpy (LibRaw wrapper) for high-quality RAW decoding.
"""
import os
import tempfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("FaceOrganizerAI")

# Extensions considered as RAW formats
RAW_EXTENSIONS = {".arw", ".cr2", ".cr3", ".nef", ".nrw", ".orf", ".rw2", ".dng", ".raf", ".pef", ".srw"}


def is_raw_file(file_path: str) -> bool:
    """Returns True if the file is a RAW format that needs conversion.
    The comparison is case-insensitive (.ARW and .arw both match).
    """
    ext = Path(file_path).suffix.lower()  # .ARW → .arw
    return ext in RAW_EXTENSIONS


def convert_raw_to_jpeg(raw_path: str, quality: int = 92) -> Optional[str]:
    """
    Converts a RAW image (ARW, CR2, NEF, etc.) to a temporary JPEG file.

    Args:
        raw_path: Absolute path to the RAW source file.
        quality:  JPEG output quality (0-100, default 92).

    Returns:
        Absolute path to the temporary JPEG file, or None on failure.
        The caller is responsible for deleting the temp file after use.
    """
    try:
        import rawpy
        import numpy as np
        from PIL import Image

        with rawpy.imread(raw_path) as raw:
            # Use camera white balance, apply auto-bright, post-process to 8-bit RGB
            rgb = raw.postprocess(
                use_camera_wb=True,
                half_size=False,
                no_auto_bright=False,
                output_bps=8,
            )

        # Create a temp file with .jpg extension in the system temp directory
        suffix = Path(raw_path).stem + "_converted.jpg"
        tmp_file = tempfile.NamedTemporaryFile(
            suffix=".jpg",
            prefix=suffix + "_",
            delete=False,
        )
        tmp_path = tmp_file.name
        tmp_file.close()

        # Save as JPEG via Pillow
        img = Image.fromarray(rgb)
        img.save(tmp_path, "JPEG", quality=quality, optimize=True)

        logger.info(f"[RAW] Converted {Path(raw_path).name} → {tmp_path}")
        return tmp_path

    except ImportError:
        logger.error(
            "[RAW] rawpy is not installed. Run: pip install rawpy\n"
            "Skipping RAW conversion."
        )
        return None
    except Exception as e:
        logger.error(f"[RAW] Failed to convert {raw_path}: {e}")
        return None


def cleanup_temp_jpeg(tmp_path: Optional[str]):
    """Safely deletes a temporary JPEG file created by convert_raw_to_jpeg()."""
    if tmp_path and os.path.exists(tmp_path):
        try:
            os.remove(tmp_path)
        except Exception as e:
            logger.warning(f"[RAW] Could not delete temp file {tmp_path}: {e}")
