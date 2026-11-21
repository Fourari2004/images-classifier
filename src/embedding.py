import numpy as np

def validate_embedding(embedding: np.ndarray) -> bool:
    """
    Validates if the embedding is a 512-dimensional float32 numpy array.
    """
    if not isinstance(embedding, np.ndarray):
        return False
    if embedding.shape != (512,):
        return False
    if embedding.dtype != np.float32 and embedding.dtype != np.float64:
        return False
    return True

def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """
    Compute the cosine similarity between two embeddings.
    If they are already normalized (L2 norm = 1.0), it's just the dot product.
    """
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    dot_product = np.dot(emb1, emb2)
    return float(dot_product / (norm1 * norm2))
