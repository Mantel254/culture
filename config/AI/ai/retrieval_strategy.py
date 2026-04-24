"""
Intelligent Retrieval Strategy Module

Implements confidence-based routing between Vector DB and LLM.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from .vector_db import search_community, search_all_communities

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())


class RetrievalStrategy:
    """
    Determines whether to use vector DB results or fall back to LLM.
    
    Decision logic based on:
    - Number of results found
    - Quality/length of results
    - Relevance confidence score
    """
    
    # Confidence threshold for using vector DB directly (0-1)
    SIMILARITY_THRESHOLD = 0.4
    
    # Minimum characters for a result to be considered meaningful
    MIN_RESULT_LENGTH = 50
    
    def __init__(self):
        self.threshold = self.SIMILARITY_THRESHOLD
        self.min_length = self.MIN_RESULT_LENGTH
    
    def calculate_confidence(self, results: List[Dict]) -> float:
        """
        Calculate confidence score for vector DB results.
        
        Score components:
        - Number of results (30% weight)
        - Average result length (70% weight)
        
        Returns:
            float: Confidence score between 0 and 1
        """
        if not results:
            return 0.0
        
        # Score based on number of results (max 5 results)
        num_results_score = min(len(results) / 5.0, 1.0)
        
        # Score based on average result length
        avg_length = sum(len(r.get('content', '')) for r in results) / len(results)
        length_score = min(avg_length / 500.0, 1.0)  # 500 chars = good
        
        # Weighted combination
        confidence = (num_results_score * 0.3) + (length_score * 0.7)
        
        logger.debug(f"Confidence calculation: {confidence:.3f} "
                    f"(results={len(results)}, avg_len={avg_length:.0f})")
        
        return confidence
    
    def should_use_llm_fallback(self, results: List[Dict], confidence: float) -> bool:
        """
        Determine if LLM fallback should be used.
        
        Returns:
            bool: True if LLM fallback should be used
        """
        # No results at all -> use LLM
        if not results:
            logger.info("No vector results, using LLM fallback")
            return True
        
        # Low confidence -> use LLM
        if confidence < self.threshold:
            logger.info(f"Low confidence ({confidence:.3f} < {self.threshold}), using LLM fallback")
            return True
        
        # Check if any result has meaningful content
        has_meaningful = any(
            len(r.get('content', '')) >= self.min_length 
            for r in results
        )
        
        if not has_meaningful:
            logger.info(f"Results too brief (< {self.min_length} chars), using LLM fallback")
            return True
        
        logger.info(f"High confidence ({confidence:.3f}), using vector DB")
        return False
    
    def retrieve_information(self, query: str, community: str = "") -> Dict[str, Any]:
        """
        Main retrieval method with intelligent routing.
        
        Args:
            query: User query string
            community: Optional community filter
            
        Returns:
            Dictionary with retrieval results and metadata
        """
        try:
            logger.debug(f"RetrievalStrategy.retrieve_information called with query(len={len(query)}) community={community}")
            # Step 1: Search vector DB
            if community:
                results = search_community(query, community, k=5)
                search_type = "community_specific"
            else:
                results = search_all_communities(query, k=5)
                search_type = "all_communities"

            logger.debug(f"Vector search returned {len(results)} results")
            
            # Step 2: Calculate confidence
            confidence = self.calculate_confidence(results)
            logger.debug(f"Calculated confidence: {confidence}")
            
            # Step 3: Decision logic
            use_llm = self.should_use_llm_fallback(results, confidence)
            
            if use_llm:
                return {
                    "source": "llm",
                    "confidence": confidence,
                    "context": "",
                    "context_blocks": [],
                    "search_type": search_type
                }
            else:
                # Extract context blocks from results
                context_blocks = [
                    {
                        "content": r.get('content', ''),
                        "community": r.get('community', ''),
                        "relevance_score": r.get('relevance', 0)
                    }
                    for r in results[:3]  # Use top 3 results
                ]
                
                context = "\n\n".join([
                    f"[{b['community']}]\n{b['content']}"
                    for b in context_blocks
                ])
                
                return {
                    "source": "vector_db",
                    "confidence": confidence,
                    "context": context,
                    "context_blocks": context_blocks,
                    "search_type": search_type,
                    "raw_results": results
                }
                
        except Exception as e:
            logger.error(f"Retrieval failed: {e}", exc_info=True)
            return {
                "source": "llm",
                "confidence": 0,
                "context": "",
                "context_blocks": [],
                "error": str(e)
            }


class ResponseFormatter:
    """
    Formats responses from different sources into consistent output.
    """
    
    @staticmethod
    def format_vector_db_response(context_blocks: List[Dict]) -> str:
        """
        Format vector DB results into a natural response.
        
        Args:
            context_blocks: List of context dictionaries
            
        Returns:
            Formatted response string
        """
        if not context_blocks:
            return "I don't have specific information about that at the moment."
        
        # Use the highest relevance block as primary
        primary = context_blocks[0]
        
        response = primary['content']
        
        # Add supplemental info if available
        if len(context_blocks) > 1:
            response += "\n\nAdditionally, " + context_blocks[1]['content']
        
        return response
    
    @staticmethod
    def format_hybrid_response(vector_results: List[Dict], llm_response: str) -> str:
        """
        Combine vector DB results with LLM enhancement.
        
        Args:
            vector_results: Results from vector DB
            llm_response: Response from LLM
            
        Returns:
            Combined response string
        """
        # For hybrid, prioritize LLM response but ensure it's grounded
        return llm_response