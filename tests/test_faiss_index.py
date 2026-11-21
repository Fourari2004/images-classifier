import unittest
import numpy as np
import tempfile
import os
from src.faiss_index import FAISSIndex

class TestFAISSIndex(unittest.TestCase):
    def setUp(self):
        self.index = FAISSIndex(dimension=8) # Small dimension for testing

    def test_rebuild_and_search(self):
        # Generate some synthetic embeddings
        # Vectors normalized manually for check
        v1 = np.array([1, 0, 0, 0, 0, 0, 0, 0], dtype=np.float32)
        v2 = np.array([0, 1, 0, 0, 0, 0, 0, 0], dtype=np.float32)
        v3 = np.array([0.707, 0.707, 0, 0, 0, 0, 0, 0], dtype=np.float32)
        
        db_embeddings = [
            (10, 100, v1),
            (20, 200, v2),
            (30, 300, v3)
        ]
        
        self.index.rebuild(db_embeddings)
        self.assertEqual(self.index.index.ntotal, 3)
        
        # Search for v1
        results = self.index.search(v1, threshold=0.5, top_k=2)
        self.assertEqual(len(results), 2) # v1 (1.0 similarity) and v3 (~0.707 similarity)
        self.assertEqual(results[0]['person_id'], 100)
        self.assertAlmostEqual(results[0]['similarity'], 1.0, places=4)
        self.assertEqual(results[1]['person_id'], 300)
        self.assertAlmostEqual(results[1]['similarity'], 0.707, places=3)

    def test_add_embedding(self):
        v1 = np.array([1, 0, 0, 0, 0, 0, 0, 0], dtype=np.float32)
        self.index.add_embedding(1, 101, v1)
        self.assertEqual(self.index.index.ntotal, 1)
        
        results = self.index.search(v1, threshold=0.9)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['person_id'], 101)

    def test_save_and_load(self):
        v1 = np.array([1, 0, 0, 0, 0, 0, 0, 0], dtype=np.float32)
        self.index.add_embedding(1, 101, v1)
        
        # Create temp file paths
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_index.bin")
            
            # Save
            self.index.save(filepath)
            self.assertTrue(os.path.exists(filepath))
            self.assertTrue(os.path.exists(filepath + ".map"))
            
            # Load in new index
            new_index = FAISSIndex(dimension=8)
            success = new_index.load(filepath)
            self.assertTrue(success)
            self.assertEqual(new_index.index.ntotal, 1)
            
            results = new_index.search(v1, threshold=0.9)
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['person_id'], 101)

if __name__ == "__main__":
    unittest.main()
