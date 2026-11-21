import numpy as np
from typing import Tuple, Optional, Dict, Any, List
from src.database import Database
from src.faiss_index import FAISSIndex

class Recognizer:
    def __init__(self, db: Database, index: FAISSIndex, threshold: float = 0.45):
        self.db = db
        self.index = index
        self.threshold = threshold
        # In-memory centroids: person_id -> normalized 512D prototype vector
        self.person_centroids: Dict[int, np.ndarray] = {}
        self.rebuild_index()

    def rebuild_index(self):
        """
        Loads all embeddings from the database and rebuilds the FAISS index + centroids.
        """
        db_embeddings = self.db.get_all_embeddings()
        self.index.rebuild(db_embeddings)
        self._calculate_centroids(db_embeddings)

    def _calculate_centroids(self, db_embeddings: List[Tuple[int, int, np.ndarray]]):
        """
        Calculates the average unit vector (centroid) for each person across all their faces.
        """
        person_vectors: Dict[int, List[np.ndarray]] = {}
        for _, pid, vec in db_embeddings:
            if pid not in person_vectors:
                person_vectors[pid] = []
            norm = np.linalg.norm(vec)
            norm_v = vec / norm if norm > 0 else vec
            person_vectors[pid].append(norm_v)

        self.person_centroids.clear()
        for pid, vecs in person_vectors.items():
            mean_vec = np.mean(vecs, axis=0)
            norm_m = np.linalg.norm(mean_vec)
            if norm_m > 0:
                self.person_centroids[pid] = (mean_vec / norm_m).astype(np.float32)

    def set_threshold(self, threshold: float):
        self.threshold = threshold

    def recognize_face(self, embedding: np.ndarray) -> Tuple[Optional[int], float]:
        """
        Dual-check recognition:
        1. Fast nearest-neighbor candidate from FAISS.
        2. Verified against person's centroid prototype to prevent identity drift.
        """
        norm = np.linalg.norm(embedding)
        norm_emb = (embedding / norm if norm > 0 else embedding).astype(np.float32)

        matches = self.index.search(norm_emb, threshold=self.threshold, top_k=3)
        if matches:
            best_match = matches[0]
            cand_id = best_match['person_id']
            similarity = best_match['similarity']

            # If centroid exists, compute cosine similarity against centroid prototype
            if cand_id in self.person_centroids:
                centroid_sim = float(np.dot(norm_emb, self.person_centroids[cand_id]))
                # Weighted combination: 60% nearest face + 40% centroid prototype
                combined_sim = 0.60 * similarity + 0.40 * centroid_sim
                if combined_sim >= self.threshold:
                    return cand_id, combined_sim
            else:
                return cand_id, similarity

        return None, 0.0

    def create_new_person(self) -> int:
        """
        Creates a new person in the database with a default serialized folder name.
        Returns the new person_id.
        """
        next_num = self.db.get_next_person_number()
        folder_name = f"person_{next_num:04d}"
        display_name = f"Person {next_num}"
        
        person_id = self.db.add_person(display_name, folder_name)
        return person_id

    def register_face(self, person_id: int, embedding: np.ndarray, quality: float) -> int:
        """
        Saves embedding in the database, adds to FAISS, and updates centroid incrementally.
        """
        embedding_id = self.db.add_embedding(person_id, embedding, quality)
        self.index.add_embedding(embedding_id, person_id, embedding)

        norm = np.linalg.norm(embedding)
        norm_emb = (embedding / norm if norm > 0 else embedding).astype(np.float32)

        if person_id in self.person_centroids:
            # Moving average update to preserve prototype fidelity
            updated = self.person_centroids[person_id] * 0.85 + norm_emb * 0.15
            norm_u = np.linalg.norm(updated)
            self.person_centroids[person_id] = (updated / norm_u if norm_u > 0 else updated).astype(np.float32)
        else:
            self.person_centroids[person_id] = norm_emb

        return embedding_id

    def find_merge_suggestions(self, threshold: float = 0.55) -> List[Dict[str, Any]]:
        """
        Scans person centroids to suggest potential merges for people with high similarity.
        Each person is included only once to prevent duplicate pairing suggestions.
        """
        raw_suggestions = []
        pids = list(self.person_centroids.keys())
        n = len(pids)

        for i in range(n):
            for j in range(i + 1, n):
                pid1 = pids[i]
                pid2 = pids[j]
                v1 = self.person_centroids[pid1]
                v2 = self.person_centroids[pid2]
                sim = float(np.dot(v1, v2))
                if sim >= threshold:
                    p1 = self.db.get_person(pid1)
                    p2 = self.db.get_person(pid2)
                    if p1 and p2:
                        raw_suggestions.append({
                            "person_a": {"id": pid1, "name": p1['display_name']},
                            "person_b": {"id": pid2, "name": p2['display_name']},
                            "similarity": round(sim * 100, 1),
                            "confidence": "Haute" if sim > 0.65 else "Moyenne"
                        })

        raw_suggestions.sort(key=lambda x: x["similarity"], reverse=True)

        # Ensure each person appears at most once across all suggestions
        unique_suggestions = []
        seen_pids = set()
        for item in raw_suggestions:
            pa_id = item["person_a"]["id"]
            pb_id = item["person_b"]["id"]
            if pa_id not in seen_pids and pb_id not in seen_pids:
                seen_pids.add(pa_id)
                seen_pids.add(pb_id)
                unique_suggestions.append(item)

        return unique_suggestions[:15]
