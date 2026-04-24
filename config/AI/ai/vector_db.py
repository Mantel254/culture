"""
Vector Database Module for Cultural Knowledge Retrieval
Uses Chroma DB for storing and searching community cultural data
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CHROMA_DIR = BASE_DIR / "chroma_store"

# Embedding model
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Initialize Chroma client
_chroma_client = None
_vector_store = None


def get_vector_store():
    """Get or create Chroma vector store."""
    global _vector_store
    
    if _vector_store is None:
        try:
            logger.debug(f"Checking Chroma DB at {CHROMA_DIR}")
            if CHROMA_DIR.exists():
                _vector_store = Chroma(
                    persist_directory=str(CHROMA_DIR),
                    embedding_function=embedding_model,
                    collection_name="cultural_knowledge"
                )
                logger.info(f"Loaded Chroma DB from {CHROMA_DIR}")
            else:
                logger.warning(f"Chroma DB not found at {CHROMA_DIR}")
                _vector_store = None
        except Exception as e:
            logger.error(f"Failed to load vector store: {e}")
            _vector_store = None
    
    return _vector_store


def search_community(query: str, community: str, k: int = 3) -> List[Dict]:
    """
    Search within a specific community's knowledge base.
    
    Args:
        query: Search query
        community: Community name
        k: Number of results to return
        
    Returns:
        List of result dictionaries with content and metadata
    """
    try:
        logger.debug(f"search_community called: community={community} query_len={len(query)} k={k}")
        vector_store = get_vector_store()
        if not vector_store:
            logger.debug("No vector store available, returning empty results")
            return []

        # Search with metadata filter
        results = vector_store.similarity_search_with_score(
            query,
            k=k,
            filter={"community": community.lower()}
        )

        parsed = [
            {
                "content": doc.page_content,
                "community": doc.metadata.get("community", ""),
                "section": doc.metadata.get("section", ""),
                "relevance": float(score),
                "source": doc.metadata.get("source", "")
            }
            for doc, score in results
        ]
        logger.debug(f"search_community returning {len(parsed)} results")
        return parsed

    except Exception as e:
        logger.error(f"Community search failed: {e}", exc_info=True)
        return []


def search_all_communities(query: str, k: int = 5) -> List[Dict]:
    """
    Search across all communities.
    
    Args:
        query: Search query
        k: Number of results to return
        
    Returns:
        List of result dictionaries
    """
    try:
        logger.debug(f"search_all_communities called: query_len={len(query)} k={k}")
        vector_store = get_vector_store()
        if not vector_store:
            logger.debug("No vector store available, returning empty results")
            return []

        results = vector_store.similarity_search_with_score(query, k=k)

        parsed = [
            {
                "content": doc.page_content,
                "community": doc.metadata.get("community", ""),
                "section": doc.metadata.get("section", ""),
                "relevance": float(score),
                "source": doc.metadata.get("source", "")
            }
            for doc, score in results
        ]
        logger.debug(f"search_all_communities returning {len(parsed)} results")
        return parsed

    except Exception as e:
        logger.error(f"Global search failed: {e}", exc_info=True)
        return []


def get_indexed_info() -> Dict[str, Any]:
    """
    Get information about indexed communities and documents.
    
    Returns:
        Dictionary with indexing statistics
    """
    try:
        vector_store = get_vector_store()
        if not vector_store:
            return {
                "status": "not_indexed",
                "total_chunks": 0,
                "communities_indexed": []
            }
        
        # Get collection info
        collection = vector_store._collection
        count = collection.count()
        
        # Get unique communities from metadata
        # This is simplified - in production, you'd query metadata
        communities = ["kikuyu", "maasai", "luo", "kalenjin", "luhya", "kamba"]
        
        return {
            "status": "indexed",
            "total_chunks": count,
            "communities_indexed": communities
        }
        
    except Exception as e:
        logger.error(f"Failed to get indexed info: {e}")
        return {
            "status": "error",
            "total_chunks": 0,
            "communities_indexed": [],
            "error": str(e)
        }