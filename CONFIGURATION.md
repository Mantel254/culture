# Configuration Reference

This file documents all configurable parameters in the Redis Memory & AI Retrieval system.

## Memory Configuration

### File: `config/AI/ai/memory_manager.py`

#### Redis Connection
```python
REDIS_CONFIG = {
    "host": "localhost",        # Redis server hostname
    "port": 6379,              # Redis server port
    "db": 0,                   # Redis database number (0-15)
    "decode_responses": True,  # Decode responses to strings
}
```

**When to change:**
- Different Redis server: Change `host` and `port`
- Multiple tenants: Use different `db` values
- Docker environment: Set `host` to Docker service name

#### Memory Limits
```python
class ConversationMemoryManager:
    MEMORY_KEY_PREFIX = "chat:"           # Key prefix for messages
    COMMUNITY_KEY_PREFIX = "community:"   # Key prefix for community
    METADATA_KEY_PREFIX = "metadata:"     # Key prefix for metadata
    MAX_MESSAGES = 10                     # Last N messages to keep
```

**When to change:**
- `MAX_MESSAGES`: 
  - Increase (e.g., 20) for longer conversation context
  - Decrease (e.g., 5) for smaller memory footprint
  - Note: Large values = more context but slower matching

**Default recommendation:** 10 messages (≈ 3-5 minutes of conversation)

## Retrieval Strategy Configuration

### File: `config/AI/ai/retrieval_strategy.py`

#### Confidence Thresholds
```python
class RetrievalStrategy:
    SIMILARITY_THRESHOLD = 0.4      # Confidence score threshold (0-1)
    MIN_RESULT_LENGTH = 50          # Minimum chars for meaningful results
```

**SIMILARITY_THRESHOLD (0-1 scale):**
- Score calculation:
  ```
  confidence = (num_results * 0.3) + (result_length * 0.7)
  ```
- **0.3 (LOW)**: Often use vector DB, few LLM calls
- **0.4 (DEFAULT)**: Balanced approach
- **0.6 (HIGH)**: Prefer LLM reasoning, more expensive

**MIN_RESULT_LENGTH:**
- **30**: Accept very brief results
- **50 (DEFAULT)**: Need some detail
- **100+**: Only rich, detailed results

#### Example Tuning

**Fast & cheap (more Vector DB):**
```python
SIMILARITY_THRESHOLD = 0.2
MIN_RESULT_LENGTH = 30
```

**Best quality (more LLM):**
```python
SIMILARITY_THRESHOLD = 0.6
MIN_RESULT_LENGTH = 100
```

## Vector Database Configuration

### File: `config/AI/ai/vector_db.py`

#### Search Parameters
```python
def search_community(query: str, community: str, k: int = 3):
    # k = number of results to retrieve
```

Current settings:
- Community search: `k=3` results
- All communities search: `k=5` results

**When to change k:**
- More results (5-10): Slower but better coverage
- Fewer results (1-2): Faster but might miss relevant info

#### Caching
```python
_search_cache = {}  # In-memory cache
```

**Note:** Cache clears on server restart. For persistent cache, add Redis caching.

## LLM Configuration

### File: `config/AI/ai/ai_client.py`

```python
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.1-8b-instant",
    temperature=0,
    max_retries=2,
)
```

**Parameters:**
- **model**: LLM model to use
  - `"llama-3.1-8b-instant"` (current, fast, cheap)
  - `"llama-3.1-70b-versatile"` (powerful, slower, expensive)
- **temperature**: Randomness (0-1)
  - 0 (current): Deterministic, consistent
  - 0.3-0.7: More creative responses
- **max_retries**: Failed request retries

## Community Detection

### File: `config/AI/views.py`

```python
def detect_community(message: str) -> str:
    communities = [
        "kikuyu", "agikuyu",
        "maasai",
        "luo",
        "kalenjin",
        ...
    ]
```

**When to add communities:**
```python
communities.append("new_community")
```

**Note:** Matching is case-insensitive substring match

## System Prompt Configuration

### File: `config/AI/views.py`

Function: `build_system_prompt()`

Current behavior:
- Always returns JSON format
- Includes page context
- Includes selected text
- Includes community info
- Includes conversation history
- Includes knowledge base context

**To modify response format:**
Edit the system prompt in `build_system_prompt()`:
```python
system_prompt = f"""
# Modify this text to change AI behavior
"""
```

## Django Settings

### File: `config/config/settings.py`

Key settings:

```python
# CORS (frontend access)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",    # Vite dev server
    "http://localhost:3000",    # Alternative port
]

# Add more as needed:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://yourdomain.com",    # Production
]
```

## Frontend Configuration

### File: `kenya-s-cultural-mosaic/src/utils/aiService.tsx`

```typescript
// API endpoint
const API_URL = "http://127.0.0.1:8000/AI/api/ask/";  // Change this

// Backend URL (for all endpoints)
const BACKEND_URL = "http://127.0.0.1:8000";

// Conversation storage
const STORAGE_KEY = "ai_conversation_id";  // Change if needed
```

**When to change:**
- Production deployment: Update to production URL
- Different backend port: Update port number
- Multiple backends: Use environment variables

## Environment Variables

### File: `.env`

```bash
GROQ_API_KEY=your-api-key-here
DEBUG=True
SECRET_KEY=your-secret-key

# Add these (optional):
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# API settings
API_TIMEOUT=30
MAX_RETRIES=2
```

## Performance Tuning

### For Production

**High traffic scenario:**
```python
# memory_manager.py
MAX_MESSAGES = 5          # Reduce memory usage
REDIS_CONFIG["db"] = 1    # Use separate DB

# retrieval_strategy.py
SIMILARITY_THRESHOLD = 0.5  # Bias toward vector DB
MIN_RESULT_LENGTH = 30      # Accept briefer results

# vector_db.py
k=3  # Reduce search results
```

**Rich context scenario:**
```python
# memory_manager.py
MAX_MESSAGES = 20         # Keep more context

# retrieval_strategy.py
SIMILARITY_THRESHOLD = 0.6  # Be selective
MIN_RESULT_LENGTH = 100     # Demand quality

# vector_db.py
k=5  # Get more options
```

## Monitoring Configuration

### Redis Monitoring

```bash
# Real-time monitor
redis-cli monitor

# Memory stats
redis-cli INFO memory

# Slow queries
redis-cli slowlog get 10

# Key patterns
redis-cli --scan  # Show all keys
redis-cli KEYS 'chat:*'
```

### Django Logging

Add to settings.py:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'ai_debug.log',
        },
    },
    'loggers': {
        'AI': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

## API Rate Limiting (Future)

To add rate limiting, modify `views.py`:

```python
from django.views.decorators.cache import cache_page

@cache_page(60)  # Cache for 60 seconds
@csrf_exempt
def ask_ai(request):
    ...
```

## Docker Configuration

### docker-compose.yml (Create this)

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./config
    ports:
      - "8000:8000"
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - GROQ_API_KEY=${GROQ_API_KEY}

  frontend:
    build: ./kenya-s-cultural-mosaic
    ports:
      - "5173:5173"
    environment:
      - VITE_BACKEND_URL=http://backend:8000

volumes:
  redis_data:
```

## Secrets Management

### For Production

Never hardcode secrets. Use environment variables:

```python
# settings.py
from django.conf import settings

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY")
```

## Scaling Considerations

### Single Server (Current)
- Works fine for < 100 concurrent users
- Redis in-memory storage

### Multiple Servers
1. Use managed Redis (AWS ElastiCache, Redis Cloud)
2. Add database persistence
3. Implement session sharing

### Changes needed:
```python
# memory_manager.py
REDIS_CONFIG = {
    "host": "redis.mycompany.com",  # Managed Redis
    "port": 6379,
    "password": os.getenv("REDIS_PASSWORD"),
}
```

## Testing Configuration

### Load Testing

```python
# Create test_load.py
import asyncio
import aiohttp

async def test_concurrent_queries(num_users=10):
    tasks = [test_single_query() for _ in range(num_users)]
    results = await asyncio.gather(*tasks)
    return results
```

## Common Configuration Patterns

### Pattern: Memory-Optimized
```python
# memory_manager.py
MAX_MESSAGES = 5

# retrieval_strategy.py
SIMILARITY_THRESHOLD = 0.3
MIN_RESULT_LENGTH = 30

# vector_db.py
k=2
```
**Use when:** Low memory availability, fast responses prioritized

### Pattern: Quality-Focused
```python
# memory_manager.py
MAX_MESSAGES = 20

# retrieval_strategy.py
SIMILARITY_THRESHOLD = 0.6
MIN_RESULT_LENGTH = 100

# vector_db.py
k=10
```
**Use when:** Accuracy is critical, cost is secondary

### Pattern: Balanced (Current Default)
```python
# memory_manager.py
MAX_MESSAGES = 10

# retrieval_strategy.py
SIMILARITY_THRESHOLD = 0.4
MIN_RESULT_LENGTH = 50

# vector_db.py
k=3-5
```
**Use when:** Good balance between cost, speed, quality

## Checklist: Configuration Review

Before going to production, verify:

- [ ] Redis is configured for persistence
- [ ] Database backups are enabled
- [ ] API keys are in environment variables
- [ ] CORS is restricted to allowed origins
- [ ] Logging is configured
- [ ] Rate limiting is in place
- [ ] Memory limits are reasonable
- [ ] LLM model choice is appropriate
- [ ] Conversation expiration is set
- [ ] Monitoring/alerting is enabled
