# Quick Start Guide: Redis Memory & AI Retrieval

## 🚀 Get Started in 5 Minutes

### Step 1: Start Redis Server

**Option A (Local):**
```bash
# macOS with Homebrew
brew services start redis

# Linux
sudo systemctl start redis-server

# Or manually
redis-server
```

**Option B (Docker):**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Verify Redis is running:**
```bash
redis-cli ping
# Expected output: PONG
```

### Step 2: Verify Backend Dependencies

```bash
cd /home/mntel/Desktop/projects/culture
source .venv/bin/activate

# Check redis is installed
pip list | grep redis

# Check other AI dependencies
pip list | grep langchain
pip list | grep groq
```

### Step 3: Start Django Server

```bash
cd /home/mntel/Desktop/projects/culture/config

# Index cultural data (one time)
python manage.py index_communities

# Start development server
python manage.py runserver
```

### Step 4: Test the API

Using curl:
```bash
curl -X POST http://localhost:8000/AI/api/ask/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about Kikuyu culture",
    "page": "home",
    "conversation_id": "test_user_1"
  }'
```

Expected response:
```json
{
  "type": "message",
  "content": "Information about Kikuyu culture...",
  "source": "vector_db",
  "strategy": "vector_db"
}
```

### Step 5: Test Frontend Integration

In your React app, use the updated `aiService.tsx`:
```typescript
import { askAI } from './utils/aiService';

// Simple usage
const response = await askAI("Tell me about Maasai traditions");
console.log(response.content);
console.log(response.source); // "vector_db" or "llm"

// With context
const response = await askAI(
  "What about marriage?",
  "/communities",  // page
  "Kikuyu people"  // selected text
);
```

## 📊 Check System Status

```bash
# Check Redis connection
redis-cli ping

# Monitor Redis in real-time
redis-cli monitor

# Check memory usage
redis-cli INFO memory

# View all keys
redis-cli KEYS '*'

# View specific conversation
redis-cli LRANGE chat:test_user_1 0 -1

# Get active community
redis-cli GET community:test_user_1
```

## 🔍 Verify Everything Works

### 1. Health Check
```bash
curl http://localhost:8000/AI/api/health/
# Expected: {"status": "ok", "redis": "connected"}
```

### 2. Memory Management
```bash
# Get conversation history
curl "http://localhost:8000/AI/api/memory/get/?conversation_id=test_user_1"

# Clear conversation
curl -X POST http://localhost:8000/AI/api/memory/clear/ \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": "test_user_1"}'
```

### 3. Vector DB Indexing
```bash
cd /home/mntel/Desktop/projects/culture/config
python manage.py shell

# Inside shell:
from AI.ai.vector_db import get_indexed_info
info = get_indexed_info()
print(f"Total chunks: {info['total_chunks']}")
print(f"Communities: {info['communities_indexed']}")
```

## 📱 Frontend Setup

### Update AiAssistantWidget.tsx

```typescript
import { askAI, getConversationMemory } from '@/utils/aiService';

export function AiAssistantWidget() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async (question: string) => {
    setLoading(true);
    try {
      // Get selected text (optional)
      const selectedText = window.getSelection?.()?.toString() || '';
      
      const result = await askAI(question, 'communities', selectedText);
      setResponse(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-widget">
      {/* Your UI components */}
      {response && (
        <div>
          <p>{response.content}</p>
          <small>Source: {response.source}</small>
        </div>
      )}
    </div>
  );
}
```

## ✅ Common Issues & Solutions

### Issue: "Redis connection refused"
```
Solution: Start Redis server
redis-server
```

### Issue: "No indexed communities"
```
Solution: Run indexing command
cd config
python manage.py index_communities
```

### Issue: Frontend can't connect to backend
```
Solution: Enable CORS in Django settings (already configured)
Check backend is running: http://localhost:8000/AI/api/health/
```

### Issue: Memory not persisting
```
Solution: Make sure conversation_id is sent from frontend
Check: redis-cli KEYS chat:*
```

## 🔧 Configuration Tweaks

### Adjust Vector DB confidence threshold
File: `config/AI/ai/retrieval_strategy.py`
```python
SIMILARITY_THRESHOLD = 0.4  # Try 0.3 or 0.5
```

### Change Redis database
File: `config/AI/ai/memory_manager.py`
```python
REDIS_CONFIG = {
    "db": 1,  # Change from 0 to 1
}
```

### Increase conversation memory
File: `config/AI/ai/memory_manager.py`
```python
MAX_MESSAGES = 20  # Change from 10 to 20
```

## 📚 Key Files

- **Backend AI Logic**: `config/AI/views.py`
- **Memory Management**: `config/AI/ai/memory_manager.py`
- **Retrieval Strategy**: `config/AI/ai/retrieval_strategy.py`
- **Vector Database**: `config/AI/ai/vector_db.py`
- **Frontend Service**: `kenya-s-cultural-mosaic/src/utils/aiService.tsx`
- **API URLs**: `config/AI/urls.py`

## 📖 Full Documentation

See `REDIS_MEMORY_GUIDE.md` for:
- Architecture overview
- Detailed API documentation
- Complete Python APIs
- Performance notes
- Best practices
- Production setup

## 🎯 Next Steps

1. ✅ Redis running
2. ✅ Backend indexed and started
3. ✅ Frontend updated to use new aiService
4. ✅ Test with browser/curl
5. ✅ Monitor with Redis CLI
6. ✅ Deploy to production

## 🚨 Emergency Debug

If something breaks:

```bash
# Stop everything
redis-cli shutdown
pkill -f "python manage.py runserver"

# Clear Redis database
redis-cli FLUSHDB

# Restart fresh
redis-server &
cd config && python manage.py runserver

# Test again
curl -X POST http://localhost:8000/AI/api/ask/ \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "conversation_id": "test"}'
```

## 📞 Support Resources

- Redis GUI: [RedisInsight](https://redis.com/redis-enterprise/redis-insight/)
- Django Docs: https://docs.djangoproject.com/
- LangChain Docs: https://python.langchain.com/
- Chroma Vector DB: https://docs.trychroma.com/

---

**You're all set! 🎉 The system now has:**
- ✅ Redis memory for last 10 messages
- ✅ Vector DB retrieval from cultural knowledge base
- ✅ LLM fallback for complex questions
- ✅ Conversation persistence
- ✅ Full API documentation
