import unittest
import numpy as np
import os
import tempfile
from pathlib import Path
from src.database import Database

class TestDatabase(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        os.close(self.temp_db_fd)
        self.db = Database(self.temp_db_path)

    def tearDown(self):
        try:
            os.remove(self.temp_db_path)
        except OSError:
            pass

    def test_image_operations(self):
        # Add a new image
        img_id = self.db.add_image("C:/test_folder/img1.jpg", "hash_img1_12345", 800, 600, "2026-06-30T00:00:00")
        self.assertGreater(img_id, 0)

        # Retrieve image by SHA256
        img = self.db.get_image_by_sha256("hash_img1_12345")
        self.assertIsNotNone(img)
        self.assertEqual(img['path'], "C:/test_folder/img1.jpg")
        self.assertEqual(img['width'], 800)
        self.assertEqual(img['processed'], 0)

        # Mark as processed
        self.db.mark_image_processed(img_id, 1)
        img = self.db.get_image_by_sha256("hash_img1_12345")
        self.assertEqual(img['processed'], 1)

        # Test duplicate insertion (should return same ID or handle gracefully)
        dup_id = self.db.add_image("C:/other_folder/img1_dup.jpg", "hash_img1_12345", 800, 600, "2026-06-30T00:00:00")
        self.assertEqual(img_id, dup_id)

    def test_person_operations(self):
        # Test person numbers
        num1 = self.db.get_next_person_number()
        self.assertEqual(num1, 1)

        p1_id = self.db.add_person("Alice", "person_0001")
        self.assertGreater(p1_id, 0)

        num2 = self.db.get_next_person_number()
        self.assertEqual(num2, 2)

        p2_id = self.db.add_person("Bob", "person_0002")
        
        # Test renaming
        self.db.rename_person(p1_id, "Alice Smith", "Alice_Smith")
        p1 = self.db.get_person(p1_id)
        self.assertEqual(p1['display_name'], "Alice Smith")
        self.assertEqual(p1['folder_name'], "Alice_Smith")

    def test_embedding_operations(self):
        p_id = self.db.add_person("Alice", "person_0001")
        emb = np.random.rand(512).astype(np.float32)
        
        emb_id = self.db.add_embedding(p_id, emb, 0.95)
        self.assertGreater(emb_id, 0)
        
        all_embs = self.db.get_all_embeddings()
        self.assertEqual(len(all_embs), 1)
        self.assertEqual(all_embs[0][1], p_id)
        np.testing.assert_array_almost_equal(all_embs[0][2], emb)

    def test_image_person_relations(self):
        img_id = self.db.add_image("C:/img.jpg", "hash_xyz", 800, 600, "2026")
        p_id = self.db.add_person("Alice", "person_0001")
        
        # Link image to person
        face_box = (50, 50, 150, 150)
        self.db.link_image_person(img_id, p_id, face_box, 0.98)
        
        # Query relations
        img_persons = self.db.get_image_persons(img_id)
        self.assertEqual(len(img_persons), 1)
        self.assertEqual(img_persons[0]['display_name'], "Alice")
        self.assertEqual(img_persons[0]['face_box'], "50,50,150,150")

    def test_merge_persons(self):
        # Create Alice and Bob
        alice_id = self.db.add_person("Alice", "person_0001")
        bob_id = self.db.add_person("Bob", "person_0002")
        
        # Add image and associate to Bob
        img_id = self.db.add_image("C:/photo.jpg", "hash_photo", 800, 600, "2026")
        self.db.link_image_person(img_id, bob_id, (20, 20, 100, 100), 0.9)
        
        # Add Bob's embedding
        emb = np.ones(512, dtype=np.float32)
        self.db.add_embedding(bob_id, emb, 0.9)
        
        # Merge Bob into Alice
        self.db.merge_persons(bob_id, alice_id)
        
        # Check Bob is deleted
        self.assertIsNone(self.db.get_person(bob_id))
        
        # Check photo is now linked to Alice
        relations = self.db.get_image_persons(img_id)
        self.assertEqual(len(relations), 1)
        self.assertEqual(relations[0]['id'], alice_id)
        
        # Check embeddings are transferred to Alice
        embs = self.db.get_all_embeddings()
        self.assertEqual(len(embs), 1)
        self.assertEqual(embs[0][1], alice_id)

if __name__ == "__main__":
    unittest.main()
