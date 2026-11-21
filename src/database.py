import sqlite3
import numpy as np
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Any, Optional

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        # Create a connection with a high timeout to handle busy states
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        # Return rows as dictionary-like objects
        conn.row_factory = sqlite3.Row
        # Enable Foreign Keys
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Persons Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS Persons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                display_name TEXT NOT NULL,
                folder_name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # Embeddings Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS Embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id INTEGER NOT NULL,
                embedding BLOB NOT NULL,
                quality REAL,
                FOREIGN KEY(person_id) REFERENCES Persons(id) ON DELETE CASCADE
            );
            """)

            # Images Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS Images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                sha256 TEXT UNIQUE NOT NULL,
                processed INTEGER DEFAULT 0,
                width INTEGER,
                height INTEGER,
                date TEXT
            );
            """)

            # ImagePersons Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS ImagePersons (
                image_id INTEGER NOT NULL,
                person_id INTEGER NOT NULL,
                face_box TEXT NOT NULL, -- "x1,y1,x2,y2"
                confidence REAL,
                PRIMARY KEY(image_id, person_id, face_box),
                FOREIGN KEY(image_id) REFERENCES Images(id) ON DELETE CASCADE,
                FOREIGN KEY(person_id) REFERENCES Persons(id) ON DELETE CASCADE
            );
            """)

            # Indices for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_embeddings_person ON Embeddings(person_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_images_sha256 ON Images(sha256);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_imagepersons_person ON ImagePersons(person_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_imagepersons_image ON ImagePersons(image_id);")

            conn.commit()
            conn.close()

    def execute_write(self, query: str, params: Tuple = ()) -> int:
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(query, params)
                conn.commit()
                last_id = cursor.lastrowid
                return last_id if last_id is not None else 0
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()

    def execute_read(self, query: str, params: Tuple = ()) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    # Image Operations
    def add_image(self, path: str, sha256: str, width: int, height: int, date_str: str) -> int:
        query = """
        INSERT INTO Images (path, sha256, processed, width, height, date)
        VALUES (?, ?, 0, ?, ?, ?)
        ON CONFLICT(sha256) DO UPDATE SET path=excluded.path
        RETURNING id;
        """
        # SQLite's ON CONFLICT with RETURNING was added in 3.35.0. 
        # For compatibility with older SQLite versions, we do an insert or select.
        try:
            return self.execute_write(
                "INSERT INTO Images (path, sha256, processed, width, height, date) VALUES (?, ?, 0, ?, ?, ?)",
                (path, sha256, width, height, date_str)
            )
        except sqlite3.IntegrityError:
            # Already exists, fetch existing ID
            rows = self.execute_read("SELECT id FROM Images WHERE sha256 = ?", (sha256,))
            if rows:
                return rows[0]['id']
            # If path conflicts instead
            rows = self.execute_read("SELECT id FROM Images WHERE path = ?", (path,))
            if rows:
                return rows[0]['id']
            return 0

    def mark_image_processed(self, image_id: int, processed: int = 1):
        self.execute_write("UPDATE Images SET processed = ? WHERE id = ?", (processed, image_id))

    def get_image_by_sha256(self, sha256: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_read("SELECT * FROM Images WHERE sha256 = ?", (sha256,))
        return rows[0] if rows else None

    def get_image_by_path(self, path: str) -> Optional[Dict[str, Any]]:
        rows = self.execute_read("SELECT * FROM Images WHERE path = ?", (path,))
        return rows[0] if rows else None

    def get_all_images(self) -> List[Dict[str, Any]]:
        return self.execute_read("SELECT * FROM Images")

    # Person Operations
    def add_person(self, display_name: str, folder_name: str) -> int:
        return self.execute_write(
            "INSERT INTO Persons (display_name, folder_name) VALUES (?, ?)",
            (display_name, folder_name)
        )

    def get_next_person_number(self) -> int:
        rows = self.execute_read("SELECT folder_name FROM Persons WHERE folder_name LIKE 'person_%'")
        max_num = 0
        for r in rows:
            try:
                # Extracts 'XXXX' from 'person_XXXX'
                num_part = r['folder_name'].split('_')[1]
                num = int(num_part)
                if num > max_num:
                    max_num = num
            except (IndexError, ValueError):
                continue
        return max_num + 1

    def rename_person(self, person_id: int, new_display_name: str, new_folder_name: str):
        self.execute_write(
            "UPDATE Persons SET display_name = ?, folder_name = ? WHERE id = ?",
            (new_display_name, new_folder_name, person_id)
        )

    def get_all_persons(self, search_query: str = "") -> List[Dict[str, Any]]:
        if search_query:
            query = """
                SELECT p.*, 
                       (SELECT COUNT(DISTINCT ip.image_id) FROM ImagePersons ip WHERE ip.person_id = p.id) as photo_count,
                       (SELECT MIN(img.date) FROM ImagePersons ip JOIN Images img ON ip.image_id = img.id WHERE ip.person_id = p.id) as first_seen,
                       (SELECT MAX(img.date) FROM ImagePersons ip JOIN Images img ON ip.image_id = img.id WHERE ip.person_id = p.id) as last_seen
                FROM Persons p
                WHERE p.display_name LIKE ? OR p.folder_name LIKE ?
                ORDER BY photo_count DESC, p.id ASC
            """
            like_term = f"%{search_query}%"
            return self.execute_read(query, (like_term, like_term))
        else:
            query = """
                SELECT p.*, 
                       (SELECT COUNT(DISTINCT ip.image_id) FROM ImagePersons ip WHERE ip.person_id = p.id) as photo_count,
                       (SELECT MIN(img.date) FROM ImagePersons ip JOIN Images img ON ip.image_id = img.id WHERE ip.person_id = p.id) as first_seen,
                       (SELECT MAX(img.date) FROM ImagePersons ip JOIN Images img ON ip.image_id = img.id WHERE ip.person_id = p.id) as last_seen
                FROM Persons p
                ORDER BY photo_count DESC, p.id ASC
            """
            return self.execute_read(query)

    def get_person(self, person_id: int) -> Optional[Dict[str, Any]]:
        rows = self.execute_read("SELECT * FROM Persons WHERE id = ?", (person_id,))
        return rows[0] if rows else None

    # Embedding Operations
    def add_embedding(self, person_id: int, embedding: np.ndarray, quality: float) -> int:
        emb_bytes = embedding.astype(np.float32).tobytes()
        return self.execute_write(
            "INSERT INTO Embeddings (person_id, embedding, quality) VALUES (?, ?, ?)",
            (person_id, emb_bytes, quality)
        )

    def get_all_embeddings(self) -> List[Tuple[int, int, np.ndarray]]:
        # Returns list of (embedding_id, person_id, embedding_vector)
        rows = self.execute_read("SELECT id, person_id, embedding FROM Embeddings")
        results = []
        for r in rows:
            emb_vector = np.frombuffer(r['embedding'], dtype=np.float32)
            results.append((r['id'], r['person_id'], emb_vector))
        return results

    # Relationship Operations
    def link_image_person(self, image_id: int, person_id: int, face_box: Tuple[int, int, int, int], confidence: float):
        box_str = ",".join(map(str, face_box))
        # Insert using INSERT OR IGNORE or REPLACE depending on if we want to overwrite
        self.execute_write(
            """
            INSERT OR REPLACE INTO ImagePersons (image_id, person_id, face_box, confidence)
            VALUES (?, ?, ?, ?)
            """,
            (image_id, person_id, box_str, confidence)
        )

    def get_person_images(self, person_id: int) -> List[Dict[str, Any]]:
        # Returns images associated with a person
        query = """
            SELECT DISTINCT img.*, ip.face_box, ip.confidence
            FROM Images img
            JOIN ImagePersons ip ON img.id = ip.image_id
            WHERE ip.person_id = ?
            ORDER BY img.date DESC, img.id DESC
        """
        return self.execute_read(query, (person_id,))

    def get_image_persons(self, image_id: int) -> List[Dict[str, Any]]:
        # Returns persons present in an image along with their box
        query = """
            SELECT p.*, ip.face_box, ip.confidence
            FROM Persons p
            JOIN ImagePersons ip ON p.id = ip.person_id
            WHERE ip.image_id = ?
        """
        return self.execute_read(query, (image_id,))

    # Fusion (Merge)
    def merge_persons(self, from_person_id: int, to_person_id: int):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            try:
                # 1. Update ImagePersons associations
                # If the target person already exists with the same face box on the same image, delete the old one or skip
                # To be simple and robust:
                # Select all relations from the old person
                cursor.execute("SELECT image_id, face_box, confidence FROM ImagePersons WHERE person_id = ?", (from_person_id,))
                relations = cursor.fetchall()
                for rel in relations:
                    # Insert into target person
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO ImagePersons (image_id, person_id, face_box, confidence)
                        VALUES (?, ?, ?, ?)
                        """,
                        (rel['image_id'], to_person_id, rel['face_box'], rel['confidence'])
                    )
                # Delete relations from source person
                cursor.execute("DELETE FROM ImagePersons WHERE person_id = ?", (from_person_id,))

                # 2. Update Embeddings to reference the new person_id
                cursor.execute("UPDATE Embeddings SET person_id = ? WHERE person_id = ?", (to_person_id, from_person_id))

                # 3. Delete the source person
                cursor.execute("DELETE FROM Persons WHERE id = ?", (from_person_id,))

                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()

    # Separation / Reassignment
    def reassign_face(self, image_id: int, old_person_id: int, face_box: str, new_person_id: int, confidence: float):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            try:
                # Remove association from old person
                cursor.execute(
                    "DELETE FROM ImagePersons WHERE image_id = ? AND person_id = ? AND face_box = ?",
                    (image_id, old_person_id, face_box)
                )
                
                # Insert association for new person
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO ImagePersons (image_id, person_id, face_box, confidence)
                    VALUES (?, ?, ?, ?)
                    """,
                    (image_id, new_person_id, face_box, confidence)
                )
                
                # Note: Embeddings are linked to persons, but we don't know which embedding belongs to which face box in a multi-face image directly.
                # To keep it simple, we can either leave the embeddings or rebuild/re-extract if needed.
                # In most cases, updating the ImagePersons link is sufficient for user organization.
                # To be precise, if the reassigned face has a corresponding embedding, we could change its person_id.
                # Since we don't store embedding-to-box mapping directly, we can assign a portion of the source person's embeddings that are similar to the target person,
                # or we can simply update the ImagePersons table and rebuild the FAISS index if necessary.
                
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()

    def remove_image_person_link(self, image_id: int, person_id: int, face_box: str):
        self.execute_write(
            "DELETE FROM ImagePersons WHERE image_id = ? AND person_id = ? AND face_box = ?",
            (image_id, person_id, face_box)
        )
