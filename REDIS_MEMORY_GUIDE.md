# Redis Memory Management & Retrieval Strategy Guide

## Overview

This system implements a two-tier AI response strategy:

1. **Vector Database Retrieval** - Fast semantic search for cultural knowledge
2. **LLM Fallback** - GPT-based reasoning when vector DB results are insufficient
3. **Redis Memory Management** - Stores last 10 messages per conversation for context

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Query (API)                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Memory Manager (Redis)     │
        │  - Store/retrieve context    │
        │  - Track communities         │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Retrieval Strategy         │
        │  1. Check Vector DB          │
        │  2. Calculate confidence     │
        │  3. LLM fallback if weak     │
        └──────────────────────────────┘
                   │            │
          ┌────────▼──┐    ┌───▼──────┐
          │ Vector DB │    │   LLM    │
          └───────────┘    └──────────┘
```

## Setup

### 1. Start Redis Server

Redis must be running for this system to work.

**On Linux/Mac:**
```bash
# Using Homebrew
brew services start redis

# Or manually
redis-server
```

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:latest
```

**Verify Redis is running:**
```bash
redis-cli ping
# Response: PONG
```

### 2. Install Dependencies

Redis package is already installed. Verify:
```bash
pip list | grep redis
# Output: redis                 7.0.x
```

## Usage

### API Endpoints

#### 1. Main Query Endpoint

```
POST /AI/api/ask/
```

**Request Body:**
```json
{
  "message": "Tell me about the Kikuyu culture",
  "page": "home",
  "selectedText": "some highlighted text (optional)",
  "conversation_id": "user_123_session_1"
}
```

**Response:**
```json
{
  "type": "message",
  "content": "Knowledge about Kikuyu culture...",
  "source": "vector_db",
  "strategy": "vector_db",
  "communities": ["Kikuyu"]
}
```

#### 2. Health Check

```
GET /AI/api/health/
```

**Response:**
```json
{
  "status": "ok",
  "redis": "connected"
}
```

#### 3. Get Conversation Memory

```
GET /AI/api/memory/get/?conversation_id=user_123_session_1
```

**Response:**
```json
{
  "conversation_id": "user_123_session_1",
  "community": "kikuyu",
  "message_count": 3,
  "messages": [
    {"role": "human", "content": "Tell me about Kikuyu", "timestamp": "2024-01-01T10:00:00"},
    {"role": "ai", "content": "The Kikuyu are...", "timestamp": "2024-01-01T10:00:05"},
    ...
  ]
}
```

#### 4. Clear Conversation Memory

```
POST /AI/api/memory/clear/
```

**Request Body:**
```json
{
  "conversation_id": "user_123_session_1"
}
```

**Response:**
```json
{
  "status": "cleared",
  "conversation_id": "user_123_session_1"
}
```

## Memory Management

### Redis Data Structure

**Conversation Messages** (last 10 stored):
```
Key: chat:conversation_id
Type: Redis List (FIFO)
Max items: 10
Data: JSON objects with role, content, timestamp
```

**Active Community Context**:
```
Key: community:conversation_id
Type: Redis String
Value: community name
```

**Metadata**:
```
Key: metadata:conversation_id
Type: Redis Hash
Fields: key-value pairs
```

### Python API

#### ConversationMemoryManager

```python
from AI.ai.memory_manager import ConversationMemoryManager

# Save a message
ConversationMemoryManager.save_message(
    conversation_id="user_123",
    role="human",
    content="What about Maasai traditions?"
)

# Retrieve last 10 messages
history = ConversationMemoryManager.get_memory("user_123")

# Format history for LLM prompt
history_text = ConversationMemoryManager.format_history_for_prompt(history)

# Clear conversation
ConversationMemoryManager.clear_memory("user_123")
```

#### CommunityContextManager

```python
from AI.ai.memory_manager import CommunityContextManager

# Set active community
CommunityContextManager.set_active_community("user_123", "kikuyu")

# Get active community
community = CommunityContextManager.get_active_community("user_123")

# Clear community context
CommunityContextManager.clear_active_community("user_123")
```

## Retrieval Strategy

### How It Works

1. **User sends query** with optional conversation_id
2. **Detect community** from query or use stored context
3. **Search vector DB** for relevant information
4. **Calculate confidence score** (0-1)
   - Based on number of results, result length, relevance
5. **Decision logic**:
   - If confidence ≥ 0.4: Use vector DB results
   - If confidence < 0.4: Call LLM for better response
6. **Save to memory** for future context

### Confidence Scoring

```python
score = (num_results_score * 0.3) + (avg_length_score * 0.7)
```

- **num_results_score**: 0-1 based on result count (max 5)
- **avg_length_score**: 0-1 based on result detail (max 500 chars each)

### Example Flow

**Query:** "Tell me about Kikuyu marriage customs"

```
1. ✅ Community detected: "kikuyu"
2. 🔍 Vector DB search: 3 results found
   - Results length: ~400 chars average
   - Confidence: 0.78 (high)
3. ✅ Result quality sufficient
4. 📤 Return vector DB results directly
5. 💾 Save to Redis memory
```

**Query:** "What is a traditional greeting?"

```
1. ⚠️ No community detected
2. 🔍 Vector DB search: All communities (0 good matches)
   - Confidence: 0.15 (low)
3. ❌ Result quality insufficient
4. 🤖 Call LLM with system prompt
5. 📤 Return LLM-generated response
6. 💾 Save to Redis memory
```

## Frontend Integration

### JavaScript Example

```javascript
async function askAI(message, community = null) {
  const response = await fetch('/AI/api/ask/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      page: window.location.pathname,
      selectedText: getSelectedText(), // Your function
      conversation_id: getUserSessionId(), // Your function
    })
  });
  
  const data = await response.json();
  
  console.log('Response source:', data.source); // "vector_db" or "hybrid"
  console.log('Strategy used:', data.strategy);
  console.log('Content:', data.content);
  
  return data;
}

// Usage
await askAI("Tell me about Kikuyu culture");
```

### React Example

```jsx
import { useState, useEffect } from 'react';

export function AIAssistant({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleQuery = async (userMessage) => {
    setLoading(true);
    
    try {
      const response = await fetch('/AI/api/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          page: window.location.pathname,
          conversation_id: sessionId,
        })
      });
      
      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: data.content, source: data.source }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
          {msg.source && <small> (from {msg.source})</small>}
        </div>
      ))}
    </div>
  );
}
```

## Monitoring & Debugging

### Check Redis Connection

```bash
redis-cli
> PING
PONG

# Check keys
> KEYS *
> KEYS chat:*          # All conversations
> KEYS community:*     # Active communities

# Check specific conversation
> LRANGE chat:user_123 0 -1
```

### View System Health

```python
from AI.ai.memory_manager import test_redis_connection

if test_redis_connection():
    print("✅ Redis is connected")
else:
    print("❌ Redis connection failed")
```

### Test Vector DB Retrieval

```python
from AI.ai.vector_db import search_all_communities, get_indexed_info

# Check indexing status
info = get_indexed_info()
print(f"Total chunks: {info['total_chunks']}")
print(f"Communities: {info['communities_indexed']}")

# Test search
results = search_all_communities("Tell me about culture", k=5)
for result in results:
    print(result)
```

## Troubleshooting

### Issue: Redis Connection Error

```
redis.exceptions.ConnectionError: Error -2 connecting to localhost:6379
```

**Solution:**
1. Ensure Redis server is running: `redis-cli ping`
2. Check Redis host and port in `memory_manager.py`
3. If running in Docker: `docker ps` to verify container

### Issue: No Vector DB Results

```
Vector DB Confidence: 0.00%
```

**Solution:**
1. Verify cultural data is indexed: `python manage.py index_communities`
2. Check indexed communities: `python manage.py shell` then `from AI.ai.vector_db import get_indexed_info; print(get_indexed_info())`
3. View Chroma database: `chroma_store/` directory

### Issue: Memory Not Persisting

**Solution:**
1. Check conversation_id is being sent from frontend
2. Verify Redis persistence settings
3. Test Redis directly: `redis-cli LRANGE chat:test_id 0 -1`

## Configuration

### Adjust Confidence Threshold

In `retrieval_strategy.py`:
```python
class RetrievalStrategy:
    SIMILARITY_THRESHOLD = 0.4  # Change this (0-1)
    MIN_RESULT_LENGTH = 50       # Change this (characters)
```

Lower threshold = Use vector DB more often
Higher threshold = Use LLM more often

### Change Max Memory Messages

In `memory_manager.py`:
```python
class ConversationMemoryManager:
    MAX_MESSAGES = 10  # Change this
```

### Adjust Redis Connection

In `memory_manager.py`:
```python
REDIS_CONFIG = {
    "host": "localhost",      # Change this
    "port": 6379,            # Change this
    "db": 0,                 # Change this
    "decode_responses": True,
}
```

## Performance Notes

- **Vector DB search**: ~50-100ms per query
- **LLM inference**: ~500-2000ms depending on model
- **Memory operations**: ~1-5ms per operation
- **Total response time**: 0.5-3 seconds depending on strategy

## Best Practices

1. **Always send conversation_id** from frontend for persistence
2. **Merge conversation history** with system prompt for better context
3. **Test community detection** with various community names
4. **Monitor Redis memory** with `redis-cli INFO memory`
5. **Regularly clear old conversations** to avoid Redis memory bloat
6. **Set up data expiration** on Redis keys (optional)

## Example: Setting Key Expiration

```python
# Expire conversations after 24 hours
def save_message(conversation_id, role, message):
    key = f"chat:{conversation_id}"
    redis_client.rpush(key, json.dumps({"role": role, "content": message}))
    redis_client.ltrim(key, -10, -1)
    redis_client.expire(key, 86400)  # 24 hours
```

## API Response Reference

### Successful Vector DB Response
```json
{
  "type": "message",
  "content": "Cultural information from knowledge base...",
  "source": "vector_db",
  "strategy": "vector_db",
  "communities": ["Kikuyu"]
}
```

### Successful LLM Fallback Response
```json
{
  "type": "message",
  "content": "AI-generated response with reasoning...",
  "source": "llm",
  "strategy": "llm_fallback",
  "vector_confidence": 0.15
}
```

### Error Response
```json
{
  "error": "Error message describing the issue"
}
```

## Next Steps

1. Start Redis server: `redis-server`
2. Index cultural data: `python manage.py index_communities`
3. Test API endpoint with conversation_id
4. Monitor logs and verify memory storage
5. Deploy frontend code to send conversation_id
6. Set up Redis persistence for production
