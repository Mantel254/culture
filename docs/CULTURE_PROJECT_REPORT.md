**Culture AI Project — Comprehensive Technical Report**

**Executive Summary**
- **Project:** Culture AI — an interactive, context-aware assistant for Kenyan cultural knowledge.
- **Stack:** React + Vite frontend (kenya-s-cultural-mosaic), Django backend (config/), Redis memory, Chroma vector store, Groq LLM via LangChain adapters.
- **Purpose:** Provide visitors with culturally accurate answers, page-aware navigation, text highlighting, and short-term conversational memory.

**1. Project Overview**
- **Scope:** The system is a hybrid web application combining static content (community pages and assets) with AI-driven conversational features. The knowledge base is sourced from the repository's `culturalData` text files and site content.
- **Primary Users:** Students, tourists, educators, and general visitors seeking Kenyan cultural information.
- **High-level goals:** natural-language Q&A, navigation actions, content highlighting, selected-text awareness, session memory.

**2. High-Level Architecture**
- **Frontend:** [kenya-s-cultural-mosaic/src](kenya-s-cultural-mosaic/src) — a React/Vite app exposing routes for `/`, `/communities`, and `/community/:id`. The AI assistant widget lives in [kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx](kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx).
- **Backend:** [config/](config) — Django app with AI endpoints under [config/AI](config/AI). Core modules in [config/AI/ai](config/AI/ai) include memory, retrieval, embeddings, and vector DB adapters.
- **Vector DB:** Chroma persisted under `chroma_store/` created by the management command [config/AI/management/commands/index_communities.py](config/AI/management/commands/index_communities.py).
- **Memory Store:** Redis used for short-term conversation storage and community context; connection managed by [config/AI/ai/memory_manager.py](config/AI/ai/memory_manager.py).
- **LLM Integration:** Groq via LangChain wrapper implemented in [config/AI/ai/ai_client.py](config/AI/ai/ai_client.py). Embedding model uses HuggingFace models.

**3. Data Sources & Indexing**
- **Raw content:** The cultural knowledge corpus is located in `culturalData/` (plain text and optional JSON files). The management command extracts sections and chunks content (~500 chars) for indexing.
- **Indexing flow:** `python manage.py index_communities` runs [index_communities.py](config/AI/management/commands/index_communities.py) — it constructs embeddings (HuggingFace) and writes to Chroma collections in `chroma_store/`.
- **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` (configured via [config/AI/ai/embeddings.py](config/AI/ai/embeddings.py)).

**4. Backend Components & Responsibilities**
- **Views & API:** [config/AI/views.py](config/AI/views.py) exposes endpoints:
  - **POST** `/ai/api/ask/` — main user query API; accepts message, page, selectedText, conversation_id, etc.
  - **GET** `/ai/api/health/` — health checks (Redis, timestamp).
  - **POST** `/ai/api/memory/clear/` and **GET** `/ai/api/memory/get/` — memory operations.
- **Memory manager:** [config/AI/ai/memory_manager.py](config/AI/ai/memory_manager.py) — wraps Redis operations, keeps last 10 messages per conversation (rpush + ltrim), stores community context, and metadata.
- **Retrieval strategy:** [config/AI/ai/retrieval_strategy.py](config/AI/ai/retrieval_strategy.py) — decides between using vector DB or falling back to LLM based on a confidence score. Key parameters are `SIMILARITY_THRESHOLD` and `MIN_RESULT_LENGTH`.
- **Vector DB adapter:** [config/AI/ai/vector_db.py](config/AI/ai/vector_db.py) — loads Chroma collection and performs similarity search with optional metadata filter (community).
- **LLM client:** [config/AI/ai/ai_client.py](config/AI/ai/ai_client.py) — LangChain Groq adapter that sends a system prompt plus human message and returns textual responses.

**5. Retrieval Decision Logic (Detailed)**
- **Search:** For each query, the system attempts a vector search. If `community` is set, `search_community(query, community, k=5)` is used; otherwise `search_all_communities(query, k=5)`.
- **Confidence calculation:** The `RetrievalStrategy.calculate_confidence` method combines two signals:
  - **Number of results (30%):** normalized against 5 results.
  - **Average result length (70%):** normalized against 500 characters.
  - Combined: confidence ∈ [0,1].
- **Decision rule:** If results are empty, or confidence < `SIMILARITY_THRESHOLD` (default 0.4), or results are too short (< `MIN_RESULT_LENGTH`), the system uses an LLM fallback. Otherwise it returns a vector-grounded response formatted by `ResponseFormatter.format_vector_db_response`.

**6. Prompt Construction & Context**
- **Components included in the system prompt:** current page path/title, selected text (if any), active community, formatted conversation history, and top retrieval context.
- **History formatting:** Conversation history is loaded from Redis and formatted by `ConversationMemoryManager.format_history_for_prompt` (User: / Assistant: style) before being included in the prompt.
- **Response constraints:** The backend instructs the LLM to respond in a JSON envelope (type, content, source) to make frontend parsing deterministic.

**7. Conversation Memory & Community Context**
- **Short-term memory:** Conversation messages saved with role and timestamp. Only last `MAX_MESSAGES` (10) are kept to bound prompt size.
- **Community detection & context:** The backend attempts to detect community names in user text (a keyword list in [views.py](config/AI/views.py)). Detected community is stored with `CommunityContextManager.set_active_community` and reused for later retrieval queries.
- **Persistence across sessions:** The frontend stores a `conversation_id` in browser `localStorage` under `ai_conversation_id`; the ID is provided to API calls so Redis memory is scoped per conversation.

**8. Frontend Assistant — Behavior & Integration**
- **Widget location:** [kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx](kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx) contains the UI, voice activation, and the interaction flow.
- **Key features:**
  - **Voice activation:** Global listener looking for activation word "Johnson" to re-enable listening.
  - **Speech recognition & TTS:** Uses browser Web Speech API for input (continuous recognition) and speechSynthesis for responses.
  - **Selected text capture:** Listens to mouse/touch events to capture user-selected text and auto-acknowledges it.
  - **Persistent ID:** `getPersistentConversationId()` stores `ai_conversation_id` in `localStorage` and reuses it.
  - **Actions:** The assistant can return structured actions (e.g., navigate, highlight) which are implemented via [kenya-s-cultural-mosaic/src/utils/aiActions.ts](kenya-s-cultural-mosaic/src/utils/aiActions.ts).
- **Frontend API client:** [kenya-s-cultural-mosaic/src/utils/aiService.tsx](kenya-s-cultural-mosaic/src/utils/aiService.tsx) defines `askAI()` and other helper functions to call the Django API.

**9. API Contracts**
- **POST** `/ai/api/ask/` (Request)
  - **Fields:** `message` (required), `page`, `pageTitle`, `url`, `selectedText`, `conversation_id` (optional)
- **POST** `/ai/api/ask/` (Response)
  - **Fields:** `type` (message/error), `content` (string), `source` (vector_db/llm), `strategy` (e.g., llm_fallback), optional `confidence`, `vector_confidence`, `conversation_id`.
- **GET** `/ai/api/health/` returns `status: ok`, `redis: connected|disconnected`, `timestamp`.
- **Memory endpoints** allow clearing and fetching memory for debugging.

**10. Running the System (Developer Quick Start)**
- **Prerequisites:** Python 3.11+, Node.js, Redis server, optional CUDA/NVIDIA if using GPU for embeddings.
- **Backend:**
  - `cd config`
  - `python -m venv .venv && source .venv/bin/activate`
  - `pip install -r requirements.txt` (file at [config/requirements.txt](config/requirements.txt))
  - Start Redis (`redis-server`) or configure `REDIS_CONFIG` in `memory_manager.py`.
  - Run indexing: `python manage.py index_communities --clear` to rebuild `chroma_store/`.
  - `python manage.py runserver` to start Django.
- **Frontend:**
  - `cd kenya-s-cultural-mosaic`
  - `npm install`
  - `npm run dev` to serve Vite app.
- **Test:** Use `curl http://127.0.0.1:8000/ai/api/health/` and frontend interactions at `http://localhost:5173`.

**11. Testing & Verification**
- **Unit & integration tests:** The repository contains `test_fixes.py` and shell helpers `test_fixes.sh` and `VERIFY_ALL_FIXES.sh` to exercise functionality.
- **Manual checks:** Quick Reference (`QUICK_REFERENCE.md`) lists test phrases for memory, navigation, highlighting, and selection.
- **Index verification:** Use Redis CLI to inspect keys (`redis-cli KEYS "chat:*"`) and Chroma to confirm collections exist in `chroma_store/`.

**12. Security, Privacy & Ethical Considerations**
- **Data minimization:** Only short-term conversational memory is stored (last 10 messages) to limit user data retention.
- **Input sanitization:** Backend ensures `message` is present and trims content. For web security, Django CSRF and CORS settings must be configured (see `config/` Django settings).
- **Bias & accuracy:** The retrieval-first approach helps ground answers in curated cultural sources, reducing hallucinations. LLM fallback remains necessary for open-ended queries and should be monitored.

**13. Performance & Scaling**
- **Chroma vector store:** Local disk-backed Chroma is fine for moderate datasets. For larger corpora, move to a hosted vector DB or scale Chroma with multiple shards.
- **Redis:** Use managed Redis for production and tune `db` selection and retention policies.
- **LLM cost & latency:** The Groq LLM calls are fallbacks; retrieval-first reduces usage. Consider caching frequent queries and using smaller LLM models for cost control.

**14. Limitations & Known Gaps**
- **Index freshness:** Indexing must be re-run to reflect content changes (`index_communities`). No live incremental indexing is currently implemented.
- **Community detection robustness:** Detection uses a static keyword list. It may miss alternate names or misspellings.
- **Fallback explanations:** If vector results are insufficient, the LLM fallback's provenance is weaker; response should indicate uncertainty.
- **No long-term memory:** Redis memory is session-scoped by `conversation_id`; long-term user profiles are out of scope.

**15. Future Improvements & Roadmap**
- **Incremental indexing:** Watch `culturalData/` and update Chroma on content changes.
- **Better community detection:** Use a small classifier or fuzzy matching to recognize synonyms and multi-word community names.
- **Expanded telemetry:** Add request metrics, latency histograms, and LLM usage counters.
- **Testing harness:** Add automated end-to-end tests simulating voice and text interactions against a mocked LLM.
- **PDF/Doc export:** Provide user-facing export of conversations or cites for research.

**16. File Map & Important Artifacts**
- **Backend:**
  - [config/AI/views.py](config/AI/views.py)
  - [config/AI/ai/memory_manager.py](config/AI/ai/memory_manager.py)
  - [config/AI/ai/retrieval_strategy.py](config/AI/ai/retrieval_strategy.py)
  - [config/AI/ai/vector_db.py](config/AI/ai/vector_db.py)
  - [config/AI/ai/ai_client.py](config/AI/ai/ai_client.py)
  - [config/AI/management/commands/index_communities.py](config/AI/management/commands/index_communities.py)
- **Frontend:**
  - [kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx](kenya-s-cultural-mosaic/src/utils/AiAssistantWidget.tsx)
  - [kenya-s-cultural-mosaic/src/utils/aiService.tsx](kenya-s-cultural-mosaic/src/utils/aiService.tsx)
  - [kenya-s-cultural-mosaic/src/utils/aiActions.ts](kenya-s-cultural-mosaic/src/utils/aiActions.ts)
  - [kenya-s-cultural-mosaic/src/data/communities.ts](kenya-s-cultural-mosaic/src/data/communities.ts)

**17. Appendix — Useful Commands**
- Start Redis: `redis-server`
- Install backend deps: `pip install -r config/requirements.txt`
- Index content: `cd config && python manage.py index_communities --clear`
- Run backend: `cd config && python manage.py runserver`
- Run frontend: `cd kenya-s-cultural-mosaic && npm run dev`
- Check health: `curl http://127.0.0.1:8000/ai/api/health/`

**18. Next Steps I can take for you**
- Convert this draft to a formatted PDF and save it in the repo.
- Expand any section into deeper technical sub-sections (design diagrams, sequence diagrams, sample prompts).
- Add code excerpts and annotated walkthroughs of critical functions.

---

*Report generated from repository inspection on 2026-08-06.*
