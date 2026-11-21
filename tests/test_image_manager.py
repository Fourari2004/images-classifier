import os
import unittest
import tempfile
import shutil
from PIL import Image
from src.image_manager import ImageManager

class TestImageManager(unittest.TestCase):
    def setUp(self):
        # Create temp folders
        self.tmp_dir = tempfile.mkdtemp()
        self.out_dir = os.path.join(self.tmp_dir, "output")
        self.cache_dir = os.path.join(self.tmp_dir, "cache")
        
        self.img_mgr = ImageManager(self.out_dir, self.cache_dir)
        
        # Create a dummy image
        self.dummy_img_path = os.path.join(self.tmp_dir, "dummy.jpg")
        img = Image.new("RGB", (300, 200), color="white")
        img.save(self.dummy_img_path)

    def tearDown(self):
        # Clean up temp folders
        shutil.rmtree(self.tmp_dir)

    def test_sha256(self):
        h1 = self.img_mgr.get_sha256(self.dummy_img_path)
        self.assertEqual(len(h1), 64) # SHA256 length is 64 hex chars
        
        # Check matching hash
        h2 = self.img_mgr.get_sha256(self.dummy_img_path)
        self.assertEqual(h1, h2)

    def test_metadata(self):
        w, h, dt = self.img_mgr.get_metadata(self.dummy_img_path)
        self.assertEqual(w, 300)
        self.assertEqual(h, 200)
        self.assertIsNotNone(dt)

    def test_thumbnail_creation(self):
        sha256 = "dummy_hash"
        face_box = "50,50,150,150"
        
        thumb_path_str = self.img_mgr.create_face_thumbnail(self.dummy_img_path, sha256, face_box)
        self.assertIsNotNone(thumb_path_str)
        self.assertTrue(os.path.exists(thumb_path_str))
        
        # Check cache hit
        thumb_path_str2 = self.img_mgr.create_face_thumbnail(self.dummy_img_path, sha256, face_box)
        self.assertEqual(thumb_path_str, thumb_path_str2)

    def test_copy_image(self):
        # Copy to person folder
        dest_path = self.img_mgr.copy_image_to_person(self.dummy_img_path, "person_0001")
        self.assertTrue(dest_path.exists())
        self.assertEqual(dest_path.name, "dummy.jpg")
        
        # Copy again to verify name collision handling (should copy as dummy_1.jpg)
        dest_path2 = self.img_mgr.copy_image_to_person(self.dummy_img_path, "person_0001")
        self.assertTrue(dest_path2.exists())
        self.assertEqual(dest_path2.name, "dummy_1.jpg")

    def test_remove_image(self):
        dest_path = self.img_mgr.copy_image_to_person(self.dummy_img_path, "person_0001")
        self.assertTrue(dest_path.exists())
        
        self.img_mgr.remove_image_from_person(self.dummy_img_path, "person_0001")
        self.assertFalse(dest_path.exists())

    def test_rename_folder(self):
        self.img_mgr.copy_image_to_person(self.dummy_img_path, "person_0001")
        old_folder = os.path.join(self.out_dir, "person_0001")
        new_folder = os.path.join(self.out_dir, "Alice")
        
        self.assertTrue(os.path.exists(old_folder))
        self.assertFalse(os.path.exists(new_folder))
        
        self.img_mgr.rename_person_folder("person_0001", "Alice")
        
        self.assertFalse(os.path.exists(old_folder))
        self.assertTrue(os.path.exists(new_folder))
        self.assertTrue(os.path.exists(os.path.join(new_folder, "dummy.jpg")))

if __name__ == "__main__":
    unittest.main()
