# Functional Requirements Document (FRD)

## 1. Introduction

This document describes the functional requirements for the Culture AI system. It covers user interactions, backend API behavior, data flows, and acceptance criteria.

## 2. System Components

- Frontend: `kenya-s-cultural-mosaic` React/Vite app.
- Backend: Django app in `config/` with AI endpoints in `config/AI/`.
- Memory store: Redis for conversation history and community context.
- AI engine: Groq LLM + retrieval strategy via vector search.

## 3. User Stories

1. As a site visitor, I want to ask questions about Kenyan communities so I can learn quickly.
2. As a user, I want the assistant to remember my previous questions so I can continue a conversation naturally.
3. As a user, I want the assistant to take me to the right page when I ask for a community.
4. As a user, I want the assistant to highlight important page elements when requested.
5. As a user, I want the assistant to understand the text I select on the page.

## 4. Functional Requirements

### 4.1 AI Query Endpoint

- Endpoint: `POST /ai/api/ask/`
- Request fields:
  - `message` (string, required)
  - `page` (string, optional)
  - `pageTitle` (string, optional)
  - `url` (string, optional)
  - `selectedText` (string, optional)
  - `conversation_id` (string, optional)

- Response fields:
  - `type` (string): usually `message` or `error`
  - `content` (string)
  - `source` (string): `vector_db` or `llm`
  - `strategy` (string): `llm_fallback` when using LLM
  - `confidence` (number, optional)
  - `vector_confidence` (number, optional)
  - `conversation_id` (string)

- Behavior:
  - Reject requests missing `message` with `400`.
  - Generate `conversation_id` if missing, using a browser-derived seed.
  - Detect a community from user text and store it if found.
  - Load conversation history via `ConversationMemoryManager.get_memory()`.
  - Retrieve knowledge using `RetrievalStrategy.retrieve_information()`.
  - Build an LLM prompt with page details, selected text, history, community, and retrieval context.
  - If vector retrieval is available, return a vector-based response.
  - Otherwise call LLM fallback and return response.
  - Save user and AI messages to Redis memory.

### 4.2 Health Endpoint

- Endpoint: `GET /ai/api/health/`
- Response fields:
  - `status`: `ok`
  - `redis`: `connected` or `disconnected`
  - `timestamp`

### 4.3 Memory Management Endpoints

- `POST /ai/api/memory/clear/`
  - Request: `conversation_id`
  - Clears both message history and community context.
  - Response: status confirmation.

- `GET /ai/api/memory/get/?conversation_id={id}`
  - Returns the conversation memory for the given ID.

### 4.4 Conversation Memory

- Store last 10 messages per `conversation_id`.
- Store community context as `community:{conversation_id}`.
- Use Redis list and key-value storage.
- Trim memory to avoid unbounded growth.

### 4.5 Community Detection

- Detect community names from user messages using a list of Kenyan community keywords.
- Set active community for the conversation when detection occurs.
- Reuse stored community across subsequent requests.

### 4.6 Prompt Construction

- Build system prompt that includes:
  - Current page path and title.
  - Selected text when present.
  - Active community.
  - Conversation history.
  - Retrieval context.
- Instruct the agent to respond in valid JSON format.
- Instruct the agent to use navigation/highlight actions when required.

### 4.7 Frontend Assistant Actions

- `askAI()` sends request payload to backend API.
- Persist `conversation_id` in `localStorage` as `ai_conversation_id`.
- Capture page text selection and send it as `selectedText`.
- Support voice transcription and keyword-based reactivation via `VoiceActivation`.
- Process AI responses and handle actions:
  - `navigate`: route user using React Router.
  - `highlight`: apply DOM highlight animation.

### 4.8 Navigation Actions

- AI response can include structured navigation instructions.
- Frontend navigates to:
  - `/` home,
  - `/communities`,
  - `/community/{id}` for specific community pages.
- Navigation should be accompanied by user-facing explanation.

### 4.9 Highlight Actions

- AI response can include `action: "highlight"`.
- Frontend resolves a selector or text description to DOM elements.
- Apply a temporary CSS highlight animation.
- Remove highlight automatically after 5 seconds.

### 4.10 Selected Text Understanding

- Detect when user selects text on the page using global event listeners.
- Auto-acknowledge selected text in the AI flow.
- Include selected text in request payload for targeted responses.

## 5. Data Flow

1. User speaks or types a message.
2. Frontend collects page URL/title and any selected text.
3. Frontend sends JSON request to `/ai/api/ask/`.
4. Backend detects community and loads Redis memory.
5. Backend retrieves external context or falls back to LLM.
6. Backend returns a structured AI response.
7. Frontend displays text, may invoke navigation/highlighting, and stores `conversation_id`.

## 6. API Contract

### Request Example
```json
POST /ai/api/ask/
{
  "message": "Tell me about Kikuyu",
  "page": "/communities",
  "pageTitle": "Communities",
  "url": "http://localhost:5173/communities",
  "selectedText": "",
  "conversation_id": "conv_1234567_abcd"
}
```

### Response Example
```json
{
  "type": "message",
  "content": "The Kikuyu are an ethnic group ...",
  "source": "llm",
  "strategy": "llm_fallback",
  "vector_confidence": 0,
  "conversation_id": "conv_1234567_abcd"
}
```

### Navigation Action Example
```json
{
  "type": "action",
  "action": "navigate",
  "content": "Taking you to the Kikuyu community page.",
  "target": "/community/kikuyu",
  "conversation_id": "conv_123..."
}
```

### Highlight Action Example
```json
{
  "type": "action",
  "action": "highlight",
  "selector": "#page-title",
  "reason": "Highlighting the page title for emphasis.",
  "conversation_id": "conv_123..."
}
```

## 7. Acceptance Criteria

- A valid message request returns status `200` and includes `conversation_id`.
- The system returns `400` if `message` is missing.
- Navigation requests route the user correctly.
- Highlight requests visually animate the selected element.
- Selected page text is included in the backend prompt.
- Conversation memory persists for multi-turn dialogue.
- Health endpoint returns Redis connectivity status.

## 8. Error Handling

- Backend returns a JSON error object when input validation fails.
- Backend returns status `500` with an error payload when internal processing fails.
- Frontend surfaces fetch errors clearly to the user.
- Invalid or incomplete response payloads are handled gracefully by the frontend.

## 9. Constraints and Assumptions

- AI behavior depends on LLM response quality and vector retrieval availability.
- Browser speech recognition requires Web Speech API support.
- `conversation_id` may be generated on the frontend and reused across sessions.
- Request and response payloads are sent as JSON over HTTP.

## 10. Notes

- Current supported routes for navigation are `/`, `/communities`, and `/community/{id}`.
- The assistant is optimized for Kenyan community content and may not perform well outside that domain.
- Existing documentation and fix reports confirm the system is designed for cultural exploration and guided browsing.
