import os
import faiss
import numpy as np
import threading
from typing import List, Tuple, Dict, Optional, Any

class FAISSIndex:
    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        # Maps index offset (0, 1, ...) to (embedding_id, person_id)
        self.offset_map: List[Tuple[int, int]] = []
        self._lock = threading.Lock()

    def rebuild(self, db_embeddings: List[Tuple[int, int, np.ndarray]]):
        """
        Rebuilds the FAISS index from a list of (embedding_id, person_id, embedding_vector).
        """
        with self._lock:
            self.index = faiss.IndexFlatIP(self.dimension)
            self.offset_map = []
            
            if not db_embeddings:
                return

            vectors = []
            for emb_id, person_id, vec in db_embeddings:
                # Normalize vector to unit length for Cosine Similarity (Inner Product)
                norm = np.linalg.norm(vec)
                norm_vec = vec / norm if norm > 0 else vec
                
                vectors.append(norm_vec.astype(np.float32))
                self.offset_map.append((emb_id, person_id))

            if vectors:
                vectors_np = np.vstack(vectors)
                self.index.add(vectors_np)

    def add_embedding(self, embedding_id: int, person_id: int, vec: np.ndarray):
        """
        Add a single embedding to the index.
        """
        with self._lock:
            # Normalize vector to unit length
            norm = np.linalg.norm(vec)
            norm_vec = vec / norm if norm > 0 else vec
            
            norm_vec_np = np.expand_dims(norm_vec.astype(np.float32), axis=0)
            self.index.add(norm_vec_np)
            self.offset_map.append((embedding_id, person_id))

    def search(self, vec: np.ndarray, threshold: float = 0.0, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search the index for the closest matches.
        Returns a list of dicts: [{'embedding_id': int, 'person_id': int, 'similarity': float}]
        """
        with self._lock:
            if self.index.ntotal == 0:
                return []

            # Normalize query vector
            norm = np.linalg.norm(vec)
            norm_vec = vec / norm if norm > 0 else vec
            norm_vec_np = np.expand_dims(norm_vec.astype(np.float32), axis=0)

            # Search index
            k = min(top_k, self.index.ntotal)
            similarities, indices = self.index.search(norm_vec_np, k)

            results = []
            for sim, idx in zip(similarities[0], indices[0]):
                if idx == -1:
                    continue
                # Cosine similarity for unit vectors is the Inner Product
                if sim >= threshold:
                    emb_id, person_id = self.offset_map[idx]
                    results.append({
                        'embedding_id': emb_id,
                        'person_id': person_id,
                        'similarity': float(sim)
                    })
            return results

    def save(self, filepath: str):
        """
        Save FAISS index and the offset map to disk.
        """
        with self._lock:
            dir_name = os.path.dirname(filepath)
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
            # Write FAISS index
            faiss.write_index(self.index, filepath)
            # Write map
            map_path = filepath + ".map"
            with open(map_path, "w") as f:
                for emb_id, person_id in self.offset_map:
                    f.write(f"{emb_id},{person_id}\n")

    def load(self, filepath: str) -> bool:
        """
        Load FAISS index and offset map from disk. Returns True if successful.
        """
        with self._lock:
            map_path = filepath + ".map"
            if not os.path.exists(filepath) or not os.path.exists(map_path):
                return False
            try:
                self.index = faiss.read_index(filepath)
                self.offset_map = []
                with open(map_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            emb_id, person_id = map(int, line.split(","))
                            self.offset_map.append((emb_id, person_id))
                return True
            except Exception:
                return False
