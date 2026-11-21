import numpy as np
from typing import Tuple, Optional, Dict, Any
from src.database import Database
from src.faiss_index import FAISSIndex

class Recognizer:
    def __init__(self, db: Database, index: FAISSIndex, threshold: float = 0.45):
        self.db = db
        self.index = index
        self.threshold = threshold
        self.rebuild_index()

    def rebuild_index(self):
        """
        Loads all embeddings from the database and rebuilds the FAISS index.
        """
        db_embeddings = self.db.get_all_embeddings()
        self.index.rebuild(db_embeddings)

    def set_threshold(self, threshold: float):
        self.threshold = threshold

    def recognize_face(self, embedding: np.ndarray) -> Tuple[Optional[int], float]:
        """
        Compares embedding with the FAISS index.
        Returns (person_id, similarity) if a match is found above threshold, else (None, 0.0).
        """
        # Search for closest matches
        matches = self.index.search(embedding, threshold=self.threshold, top_k=1)
        if matches:
            best_match = matches[0]
            return best_match['person_id'], best_match['similarity']
        return None, 0.0

    def create_new_person(self) -> int:
        """
        Creates a new person in the database with a default serialized folder name.
        Returns the new person_id.
        """
        next_num = self.db.get_next_person_number()
        # Formatted folder name: person_0001, person_0002, etc.
        folder_name = f"person_{next_num:04d}"
        display_name = f"Person {next_num}"
        
        person_id = self.db.add_person(display_name, folder_name)
        return person_id

    def register_face(self, person_id: int, embedding: np.ndarray, quality: float) -> int:
        """
        Saves embedding in the database and adds it to the FAISS index.
        Returns the embedding_id.
        """
        embedding_id = self.db.add_embedding(person_id, embedding, quality)
        self.index.add_embedding(embedding_id, person_id, embedding)
        return embedding_id
