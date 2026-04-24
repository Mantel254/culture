"""
Redis Memory Management Module

Handles conversation memory, community context, and metadata storage.
Maintains last 10 messages per conversation using Redis.
"""

import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import redis

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

# Redis configuration
REDIS_CONFIG = {
    "host": "localhost",
    "port": 6379,
    "db": 0,
    "decode_responses": True,
}

# Redis client (lazy initialization)
_redis_client = None


def get_redis_client():
    """Get or create Redis client connection."""
    global _redis_client
    if _redis_client is None:
        try:
            logger.debug(f"Attempting Redis connection to {REDIS_CONFIG['host']}:{REDIS_CONFIG['port']} db={REDIS_CONFIG['db']}")
            _redis_client = redis.Redis(**REDIS_CONFIG)
            _redis_client.ping()
            logger.info("Redis connection established")
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
            _redis_client = None
            raise
    return _redis_client


def test_redis_connection() -> bool:
    """Test Redis connection."""
    try:
        client = get_redis_client()
        client.ping()
        return True
    except (redis.ConnectionError, AttributeError):
        return False


class ConversationMemoryManager:
    """
    Manages conversation message storage in Redis.
    Maintains only the last N messages per conversation.
    """
    
    MEMORY_KEY_PREFIX = "chat:"
    MAX_MESSAGES = 10
    
    @classmethod
    def _get_key(cls, conversation_id: str) -> str:
        """Get Redis key for conversation."""
        return f"{cls.MEMORY_KEY_PREFIX}{conversation_id}"
    
    @classmethod
    def save_message(cls, conversation_id: str, role: str, content: str) -> bool:
        """
        Save a message to conversation history.
        
        Args:
            conversation_id: Unique conversation identifier
            role: "human" or "ai"
            content: Message content
            
        Returns:
            bool: True if successful
        """
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            
            # Add to list
            client.rpush(key, json.dumps(message))
            # Keep only last N messages
            client.ltrim(key, -cls.MAX_MESSAGES, -1)
            try:
                length = client.llen(key)
            except Exception:
                length = None
            logger.debug(f"Saved {role} message to {conversation_id} (len={length})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save message: {e}")
            return False
    
    @classmethod
    def get_memory(cls, conversation_id: str) -> List[Dict]:
        """
        Retrieve conversation history.
        
        Args:
            conversation_id: Unique conversation identifier
            
        Returns:
            List of message dictionaries
        """
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            
            messages = client.lrange(key, 0, -1)
            logger.debug(f"Retrieved {len(messages)} messages for {conversation_id}")
            return [json.loads(msg) for msg in messages]
            
        except Exception as e:
            logger.error(f"Failed to get memory: {e}")
            return []
    
    @classmethod
    def format_history_for_prompt(cls, history: List[Dict]) -> str:
        """
        Format conversation history for LLM prompt.
        
        Args:
            history: List of message dictionaries
            
        Returns:
            Formatted history string
        """
        if not history:
            return ""
        
        formatted = []
        for msg in history:
            role = "User" if msg['role'] == 'human' else "Assistant"
            formatted.append(f"{role}: {msg['content']}")
        
        return "\n".join(formatted)
    
    @classmethod
    def clear_memory(cls, conversation_id: str) -> bool:
        """
        Clear all messages for a conversation.
        
        Args:
            conversation_id: Unique conversation identifier
            
        Returns:
            bool: True if successful
        """
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            client.delete(key)
            logger.info(f"Cleared memory for {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to clear memory: {e}")
            return False


class CommunityContextManager:
    """
    Manages active community context per conversation.
    """
    
    COMMUNITY_KEY_PREFIX = "community:"
    
    @classmethod
    def _get_key(cls, conversation_id: str) -> str:
        return f"{cls.COMMUNITY_KEY_PREFIX}{conversation_id}"
    
    @classmethod
    def set_active_community(cls, conversation_id: str, community: str) -> bool:
        """Set active community for conversation."""
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            client.set(key, community)
            logger.debug(f"Set community {community} for {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to set community: {e}")
            return False
    
    @classmethod
    def get_active_community(cls, conversation_id: str) -> Optional[str]:
        """Get active community for conversation."""
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            community = client.get(key)
            logger.debug(f"Got community for {conversation_id}: {community}")
            return community if community else ""
        except Exception as e:
            logger.error(f"Failed to get community: {e}")
            return ""
    
    @classmethod
    def clear_active_community(cls, conversation_id: str) -> bool:
        """Clear active community context."""
        try:
            client = get_redis_client()
            key = cls._get_key(conversation_id)
            client.delete(key)
            logger.debug(f"Cleared community for {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to clear community: {e}")
            return False


class ConversationMetadataManager:
    """
    Manages additional metadata for conversations.
    """
    
    METADATA_KEY_PREFIX = "metadata:"
    
    @classmethod
    def _get_key(cls, conversation_id: str) -> str:
        return f"{cls.METADATA_KEY_PREFIX}{conversation_id}"
    
    @classmethod
    def set_metadata(cls, conversation_id: str, key: str, value: str) -> bool:
        """Set metadata value."""
        try:
            client = get_redis_client()
            redis_key = cls._get_key(conversation_id)
            client.hset(redis_key, key, value)
            return True
        except Exception as e:
            logger.error(f"Failed to set metadata: {e}")
            return False
    
    @classmethod
    def get_metadata(cls, conversation_id: str, key: str) -> Optional[str]:
        """Get metadata value."""
        try:
            client = get_redis_client()
            redis_key = cls._get_key(conversation_id)
            value = client.hget(redis_key, key)
            return value if value else ""
        except Exception as e:
            logger.error(f"Failed to get metadata: {e}")
            return ""