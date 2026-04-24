"""
Embeddings configuration for vector database
"""

from langchain_huggingface import HuggingFaceEmbeddings


def get_embeddings_model():
    """Get the embedding model for vector database."""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )