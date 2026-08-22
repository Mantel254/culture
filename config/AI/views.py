# import json
# import logging
# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.views.decorators.http import require_http_methods
# from django.utils import timezone

# from AI.ai.memory_manager import (
#     ConversationMemoryManager, 
#     CommunityContextManager,
#     test_redis_connection
# )
# from AI.ai.retrieval_strategy import RetrievalStrategy, ResponseFormatter
# from AI.ai.ai_client import call_groq_llm
# from AI.ai.vector_db import search_community

# logger = logging.getLogger(__name__)
# logger.addHandler(logging.NullHandler())

# # List of communities for detection
# COMMUNITIES = [
#     "kikuyu", "agikuyu", "gikuyu",
#     "maasai", "masai",
#     "luo", "joluo",
#     "kalenjin",
#     "luhya", "abaluhya",
#     "kamba", "akamba",
#     "kisii", "gusii",
#     "meru", "ameru",
#     "embu", "aembu",
#     "mijikenda",
#     "pokomo",
#     "taita",
#     "samburu",
#     "turkana",
#     "rendille",
#     "gabbra",
#     "borana",
#     "somali",
#     "swahili", "waswahili",
#     "nandi",
#     "pokot",
#     "marakwet",
#     "tugen",
#     "kipsigis",
# ]


# def detect_community(message: str) -> str:
#     """Detect community from message text."""
#     message_lower = message.lower()
#     for community in COMMUNITIES:
#         if community in message_lower:
#             return community.capitalize()
#     return ""


# def build_system_prompt(page: str = "", selected_text: str = "", 
#                         community: str = "", history: str = "", 
#                         context: str = "") -> str:
#     """Build dynamic system prompt for LLM."""
    
#     system_prompt = f"""You are a knowledgeable cultural assistant for Kenyan communities. 
# Your responses should be accurate, respectful, and helpful.

# ## Response Format
# You MUST respond with valid JSON in this format:
# {{
#     "type": "message",
#     "content": "Your detailed response here",
#     "source": "llm"
# }}

# ## Context Information
# """
    
#     if page:
#         system_prompt += f"\nCurrent Page: {page}\n"
#     if selected_text:
#         system_prompt += f"\nSelected Text: {selected_text}\n"
#     if community:
#         system_prompt += f"\nActive Community: {community}\n"
#     if history:
#         system_prompt += f"\nConversation History:\n{history}\n"
#     if context:
#         system_prompt += f"\nKnowledge Base Context:\n{context}\n"
    
#     system_prompt += """
# ## Guidelines
# 1. Be concise but informative
# 2. Provide accurate cultural information
# 3. Be respectful of all communities
# 4. If unsure, say so clearly
# 5. Always respond with JSON format
# """
    
#     return system_prompt


# def call_llm_for_response(user_message: str, system_prompt: str) -> str:
#     """Call LLM and extract response content."""
#     try:
#         response = call_groq_llm(user_message, system_prompt)
        
#         # Try to parse JSON response
#         try:
#             response_json = json.loads(response)
#             if 'content' in response_json:
#                 return response_json['content']
#         except json.JSONDecodeError:
#             # If not JSON, use raw response
#             return response
#     except Exception as e:
#         logger.error(f"LLM call failed: {e}")
#         raise
    
#     return response


# @csrf_exempt
# @require_http_methods(["POST"])
# def ask_ai(request):
#     """
#     Main API endpoint for AI queries.
    
#     Expected JSON body:
#     {
#         "message": "User question",
#         "page": "current page path",
#         "selectedText": "highlighted text (optional)",
#         "conversation_id": "unique session ID"
#     }
#     """
#     try:
#         # Parse request body
#         raw_body = request.body.decode('utf-8', errors='replace')
#         logger.debug(f"Raw request body: {raw_body}")
#         try:
#             body = json.loads(raw_body)
#         except Exception as e:
#             logger.error(f"Failed to parse JSON body: {e}", exc_info=True)
#             raise
#         user_message = body.get('message', '').strip()
#         page = body.get('page', '')
#         selected_text = body.get('selectedText', '')
#         conversation_id = body.get('conversation_id', '')
        
#         if not user_message:
#             return JsonResponse({"error": "Message is required"}, status=400)
        
#         if not conversation_id:
#             conversation_id = f"anonymous_{timezone.now().timestamp()}"
        
#         logger.info(f"Processing query for conversation: {conversation_id}")
#         logger.debug(f"User message (len={len(user_message)}): {user_message}")
#         logger.debug(f"Request meta: origin={request.META.get('HTTP_ORIGIN')} content_type={request.META.get('CONTENT_TYPE')} user_agent={request.META.get('HTTP_USER_AGENT')}")
        
#         # Step 1: Detect or retrieve community context
#         detected_community = detect_community(user_message)
#         logger.debug(f"Detected community: {detected_community}")
#         stored_community = CommunityContextManager.get_active_community(conversation_id)
#         logger.debug(f"Stored community for {conversation_id}: {stored_community}")
#         active_community = detected_community or stored_community or ""
        
#         # Update community context if detected
#         if detected_community:
#             CommunityContextManager.set_active_community(conversation_id, detected_community)
        
#         # Step 2: Get conversation history
#         conversation_history = ConversationMemoryManager.get_memory(conversation_id)
#         logger.debug(f"Conversation history count: {len(conversation_history)}")
#         history_text = ConversationMemoryManager.format_history_for_prompt(conversation_history)
        
#         # Step 3: Retrieve information using strategy
#         retrieval_strategy = RetrievalStrategy()
#         logger.debug(f"Starting retrieval for query (len={len(user_message)}) community={active_community}")
#         retrieval_result = retrieval_strategy.retrieve_information(
#             query=user_message,
#             community=active_community
#         )
#         logger.debug(f"Retrieval result: source={retrieval_result.get('source')} confidence={retrieval_result.get('confidence')}")
        
#         # Step 4: Build system prompt and get response
#         system_prompt = build_system_prompt(
#             page=page,
#             selected_text=selected_text,
#             community=active_community,
#             history=history_text,
#             context=retrieval_result.get('context', '')
#         )
#         logger.debug(f"Built system prompt (len={len(system_prompt)} chars)")
        
#         # Step 5: Get final response
#         if retrieval_result['source'] == 'vector_db':
#             # Use vector DB results directly
#             response_content = ResponseFormatter.format_vector_db_response(
#                 retrieval_result['context_blocks']
#             )
#             final_response = {
#                 "type": "message",
#                 "content": response_content,
#                 "source": "vector_db",
#                 "strategy": "vector_db",
#                 "communities": [active_community] if active_community else []
#             }
#         else:
#             # Call LLM for response
#             logger.info("Using LLM fallback to generate response")
#             llm_response = call_llm_for_response(user_message, system_prompt)
#             logger.debug(f"LLM response (len={len(llm_response)}): {llm_response}")
#             final_response = {
#                 "type": "message",
#                 "content": llm_response,
#                 "source": "llm",
#                 "strategy": "llm_fallback",
#                 "vector_confidence": retrieval_result.get('confidence', 0)
#             }
        
#         # Step 6: Save to memory
#         # Save user and AI messages into Redis memory (best-effort)
#         try:
#             ConversationMemoryManager.save_message(
#                 conversation_id=conversation_id,
#                 role="human",
#                 content=user_message
#             )
#             ConversationMemoryManager.save_message(
#                 conversation_id=conversation_id,
#                 role="ai",
#                 content=final_response['content']
#             )
#             logger.debug("Saved conversation messages to Redis memory")
#         except Exception as e:
#             logger.error(f"Failed to save messages to memory: {e}", exc_info=True)
        
#         # Step 7: Return response
#         logger.info(f"Responding to conversation {conversation_id} with source={final_response.get('source')}")
#         return JsonResponse(final_response)
        
#     except json.JSONDecodeError:
#         return JsonResponse({"error": "Invalid JSON body"}, status=400)
#     except Exception as e:
#         logger.error(f"Error processing query: {e}", exc_info=True)
#         return JsonResponse({"error": str(e)}, status=500)


# def health_check(request):
#     """System health check endpoint."""
#     redis_status = "connected" if test_redis_connection() else "disconnected"
    
#     return JsonResponse({
#         "status": "ok",
#         "redis": redis_status,
#         "timestamp": timezone.now().isoformat()
#     })


# @csrf_exempt
# @require_http_methods(["POST"])
# def clear_conversation(request):
#     """Clear conversation memory."""
#     try:
#         body = json.loads(request.body.decode('utf-8'))
#         conversation_id = body.get('conversation_id', '')
        
#         if not conversation_id:
#             return JsonResponse({"error": "conversation_id required"}, status=400)
        
#         ConversationMemoryManager.clear_memory(conversation_id)
#         CommunityContextManager.clear_active_community(conversation_id)
        
#         return JsonResponse({
#             "status": "cleared",
#             "conversation_id": conversation_id
#         })
#     except json.JSONDecodeError:
#         return JsonResponse({"error": "Invalid JSON body"}, status=400)


# @require_http_methods(["GET"])
# def get_conversation_memory(request):
#     """Retrieve conversation memory."""
#     conversation_id = request.GET.get('conversation_id', '')
    
#     if not conversation_id:
#         return JsonResponse({"error": "conversation_id required"}, status=400)
    
#     messages = ConversationMemoryManager.get_memory(conversation_id)
#     community = CommunityContextManager.get_active_community(conversation_id)
    
#     return JsonResponse({
#         "conversation_id": conversation_id,
#         "community": community,
#         "message_count": len(messages),
#         "messages": messages
#     })

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from AI.ai.memory_manager import (
    ConversationMemoryManager,
    CommunityContextManager,
    test_redis_connection
)
from AI.ai.retrieval_strategy import RetrievalStrategy, ResponseFormatter
from AI.ai.ai_client import call_groq_llm

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


# =========================
# COMMUNITY DETECTION
# =========================
COMMUNITIES = [
    "kikuyu", "agikuyu", "gikuyu",
    "maasai", "masai",
    "luo", "joluo",
    "kalenjin",
    "luhya", "abaluhya",
    "kamba", "akamba",
    "kisii", "gusii",
    "meru", "ameru",
    "embu", "aembu",
    "mijikenda",
    "pokomo",
    "taita",
    "samburu",
    "turkana",
    "rendille",
    "gabbra",
    "borana",
    "somali",
    "swahili", "waswahili",
    "nandi",
    "pokot",
    "marakwet",
    "tugen",
    "kipsigis",
]


def detect_community(message: str) -> str:
    message_lower = message.lower()
    for community in COMMUNITIES:
        if community in message_lower:
            detected = community.capitalize()
            logger.debug(f"[COMMUNITY DETECT] Found: {detected}")
            return detected
    logger.debug("[COMMUNITY DETECT] None found")
    return ""


# =========================
# PROMPT BUILDER
# =========================
def build_system_prompt(page="", selected_text="", community="", history="", context="", page_title="") -> str:
    prompt = f"""You are a knowledgeable cultural assistant for Kenyan communities. 
Answer questions in plain English with accurate, detailed information.
Use clear formatting with headings, bullet points, and paragraphs as appropriate.

IMPORTANT: For normal questions, respond ONLY with plain text. Do NOT wrap in JSON.
HOWEVER: If the user mentions a specific page element or asks you to highlight something, you MAY respond with a JSON action.

Plain text response example:
The Maasai are a Bantu ethnic group...

Highlight action example (only when user wants to highlight page content):
{{"type": "action", "action": "highlight", "selector": "heading", "content": "Here's the section about Maasai culture"}}
"""

    if page_title:
        prompt += f"\nCurrent Page: {page_title}"
    if page:
        prompt += f"({page})"
    if selected_text:
        prompt += f"\n\nUser highlighted this text, so provide targeted info: \"{selected_text}\"\nConsider responding with a highlight action to draw attention to related content on the page."
    if community:
        prompt += f"\n\nFocusing on the {community} community"
    if history:
        prompt += f"\n\nConversation context:\n{history}"
    if context:
        prompt += f"\n\nRelevant information:\n{context}"

    prompt += """

## Available communities to reference:
Kikuyu, Maasai, Luo, Kalenjin, Luhya, Kamba, Kisii, Meru, Embu, Mijikenda, Somali

## When to use highlight actions:
- User selected text on the page and wants it highlighted
- User asks to "highlight" or "show me" something specific
- User asks to "find" a section or heading
- Current page has relevant content that should be brought to attention

## When to use plain text:
- General knowledge questions (default)
- Questions about culture, traditions, practices
- Most conversational queries

Be accurate, respectful, and helpful in all responses."""

    logger.debug(f"[PROMPT BUILT] length={len(prompt)}")
    return prompt


# =========================
# SAFE LLM CALL
# =========================
def call_llm_safe(user_message: str, system_prompt: str) -> dict:
    try:
        logger.debug("[LLM] Calling Groq...")
        raw = call_groq_llm(user_message, system_prompt)

        logger.debug(f"[LLM RAW RESPONSE] {str(raw)[:500]}")

        response_text = raw.strip() if isinstance(raw, str) else str(raw)
        
        # Try to parse as JSON (for action responses)
        try:
            parsed = json.loads(response_text)
            logger.debug("[LLM] Parsed as JSON action response")
            # Ensure it has required fields
            if "type" in parsed and "action" in parsed:
                return parsed
            elif "type" in parsed and "content" in parsed:
                return parsed
        except json.JSONDecodeError:
            # Not JSON, treat as plain text
            pass
        
        # Default: wrap as plain text message
        return {
            "type": "message",
            "content": response_text,
            "source": "llm",
        }

    except Exception as e:
        logger.error(f"[LLM ERROR] {e}", exc_info=True)
        return {
            "type": "error",
            "content": "LLM failed",
            "error": str(e),
            "source": "llm"
        }


# =========================
# MAIN ENDPOINT
# =========================
@csrf_exempt
@require_http_methods(["POST"])
def ask_ai(request):
    try:
        print("Received request for ask_ai endpoint")
        # -------- Parse Request --------
        raw_body = request.body.decode("utf-8", errors="replace")
        logger.debug(f"[REQUEST RAW] {raw_body}")

        body = json.loads(raw_body)

        user_message = body.get("message", "").strip()
        page = body.get("page", "")
        page_title = body.get("pageTitle", "")
        url = body.get("url", "")
        selected_text = body.get("selectedText") or ""
        conversation_id = body.get("conversation_id", "")
        frontend_community = body.get("community")  # Community from frontend URL context

        if not user_message:
            return JsonResponse({"error": "Message is required"}, status=400)

        if not conversation_id:
            # Generate from browser user agent (semi-persistent)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            timestamp_seed = int(timezone.now().timestamp() / 300)  # 5-minute buckets
            conversation_id = f"user_{hash(user_agent)}_{timestamp_seed}"

        logger.info(f"[REQUEST] conversation_id={conversation_id}")
        logger.debug(f"[USER MESSAGE] {user_message}")
        logger.debug(f"[CONTEXT] page={page} title={page_title} selected_text_len={len(selected_text)}")

        # -------- Community --------
        detected = detect_community(user_message)
        stored = CommunityContextManager.get_active_community(conversation_id)

        # Priority: frontend context > detected > stored > empty
        active = frontend_community or detected or stored or ""
        logger.debug(f"[COMMUNITY] frontend={frontend_community} detected={detected} stored={stored} active={active}")

        if detected:
            CommunityContextManager.set_active_community(conversation_id, detected)

        # -------- Memory --------
        history = ConversationMemoryManager.get_memory(conversation_id)
        history_text = ConversationMemoryManager.format_history_for_prompt(history)

        logger.debug(f"[MEMORY] messages={len(history)}")

        # -------- Retrieval --------
        strategy = RetrievalStrategy()
        retrieval = strategy.retrieve_information(
            query=user_message,
            community=active
        )

        logger.debug(f"[RETRIEVAL] {retrieval}")

        # -------- Prompt --------
        system_prompt = build_system_prompt(
            page=page,
            page_title=page_title,
            selected_text=selected_text,
            community=active,
            history=history_text,
            context=retrieval.get("context", "")
        )

        # -------- Response --------
        # Always use LLM for consistent natural language responses
        logger.info(f"[RESPONSE] Using LLM (source={retrieval.get('source')})")
        
        final_response = call_llm_safe(user_message, system_prompt)
        
        # Track source and confidence
        final_response["retrieval_source"] = retrieval.get("source")
        final_response["retrieval_confidence"] = retrieval.get("confidence", 0)
        final_response["vector_context_available"] = bool(retrieval.get("context_blocks"))

        # -------- Save Memory --------
        try:
            ConversationMemoryManager.save_message(conversation_id, "human", user_message)
            ConversationMemoryManager.save_message(conversation_id, "ai", final_response.get("content", ""))

            logger.debug("[MEMORY SAVED]")
        except Exception as e:
            logger.error(f"[MEMORY ERROR] {e}", exc_info=True)

        # Include conversation_id in response for frontend
        final_response["conversation_id"] = conversation_id

        logger.info(f"[FINAL RESPONSE] {final_response.get('source')}")

        return JsonResponse(final_response)

    except Exception as e:
        logger.error(f"[FATAL ERROR] {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


# =========================
# HEALTH
# =========================
def health_check(request):
    redis_status = "connected" if test_redis_connection() else "disconnected"

    logger.debug(f"[HEALTH] redis={redis_status}")

    return JsonResponse({
        "status": "ok",
        "redis": redis_status,
        "timestamp": timezone.now().isoformat()
    })


# =========================
# CLEAR MEMORY
# =========================
@csrf_exempt
@require_http_methods(["POST"])
def clear_conversation(request):
    body = json.loads(request.body.decode("utf-8"))
    cid = body.get("conversation_id", "")

    ConversationMemoryManager.clear_memory(cid)
    CommunityContextManager.clear_active_community(cid)

    logger.info(f"[CLEAR] conversation={cid}")

    return JsonResponse({"status": "cleared", "conversation_id": cid})


# =========================
# GET MEMORY
# =========================
@require_http_methods(["GET"])
def get_conversation_memory(request):
    cid = request.GET.get("conversation_id", "")

    messages = ConversationMemoryManager.get_memory(cid)
    community = CommunityContextManager.get_active_community(cid)

    logger.debug(f"[GET MEMORY] {cid} count={len(messages)}")

    return JsonResponse({
        "conversation_id": cid,
        "community": community,
        "messages": messages
    })