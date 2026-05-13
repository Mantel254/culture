# Product Requirements Document (PRD)

## 1. Overview

The Culture AI system is a hybrid web application that delivers an interactive, culturally-aware assistant for Kenyan communities. It combines a React frontend with a Django backend, AI-driven conversation capabilities, contextual navigation, text highlighting, and memory persistence.

## 2. Purpose

Provide Kenyan culture learners and site visitors with an intelligent assistant that can:
- answer cultural questions,
- navigate the website on request,
- highlight relevant page content,
- understand selected text,
- remember conversation context across sessions.

## 3. Target Users

- Students researching Kenyan communities.
- Tourists exploring cultural heritage.
- Educators wanting quick cultural summaries.
- General users browsing the website and seeking guided assistance.

## 4. Key Problems Solved

- Users need natural-language access to cultural information.
- Users need help navigating a culturally-focused website without manual browsing.
- Users want the assistant to understand page context and text selections.
- Previously, the AI had no persistent memory across requests.

## 5. Goals

### Primary Goals
- Deliver conversational AI for cultural questions.
- Maintain context and memory across multi-turn interactions.
- Support navigation instructions from user prompts.
- Support page text selection and visual highlighting.

### Secondary Goals
- Provide transparent backend status via health checks.
- Use robust community detection to keep answers relevant.
- Preserve conversation state using browser-side IDs and Redis.

## 6. Features

### 6.1 AI Cultural Chat
- Frontend sends user questions to `/ai/api/ask/`.
- Backend builds a prompt including page, selected text, conversation history, and community context.
- Backend attempts retrieval from a vector database before falling back to LLM.

### 6.2 Persistent Conversation Memory
- Uses `conversation_id` stored in browser `localStorage`.
- Redis stores last messages, community context, and metadata.
- Conversation memory is loaded for every request.

### 6.3 Context-Aware Navigation
- AI can return structured navigation actions.
- Frontend interprets `action: "navigate"` and routes users to `/`, `/communities`, or `/community/{id}`.

### 6.4 Text Highlighting
- AI can return `action: "highlight"` with selector and reason.
- Frontend applies pulsing golden highlight to matching DOM elements.

### 6.5 Selected Text Support
- Frontend captures user-selected text on page.
- Selected text is sent with requests to improve context-aware answers.
- AI acknowledges selection when present.

## 7. User Experience Requirements

- Users should not need to refresh to continue a conversation.
- Voice activation should reactivate on keyword "Johnson".
- Text selection should be automatically recognized and acknowledged.
- Navigation and highlighting actions should be explained before execution.

## 8. Success Metrics

- >90% successful AI responses with a valid JSON reply.
- 95% of conversation sessions retain context over 3 turns.
- Navigation requests correctly route users in 9 out of 10 cases.
- Highlight actions correctly identify page elements in 85% of supported cases.

## 9. Non-Functional Requirements

- Backend must support CORS for local frontend development.
- AI endpoint must return responses within 3 seconds under normal load.
- Redis must be available for memory and community state.
- The system must gracefully fall back to LLM if vector retrieval fails.

## 10. Constraints and Assumptions

- The knowledge base is focused on Kenyan communities from provided cultural data.
- Voice recognition depends on browser Web Speech API support.
- `conversation_id` may be semi-persistent and rebuilt if missing.
- The AI response format is expected to be structured JSON.

## 11. Out of Scope

- Full multilingual support beyond English.
- Offline or mobile-only functionality.
- Long-term archival memory beyond session-level Redis storage.
- Third-party authentication or user accounts.
