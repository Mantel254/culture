"""
AI Client for Groq LLM Integration
"""

import logging
from django.conf import settings
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

# Initialize Groq LLM
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.1-8b-instant",
    temperature=0,
    max_retries=2,
)


def call_groq_llm(user_message: str, system_prompt: str) -> str:
    """
    Call Groq LLM with system prompt and user message.
    
    Args:
        user_message: The user's question
        system_prompt: System context and instructions
        
    Returns:
        LLM response as string
    """
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        logger.debug(f"Calling Groq LLM: system_prompt_len={len(system_prompt)} user_message_len={len(user_message)}")
        response = llm.invoke(messages)
        logger.debug(f"Groq LLM raw response type={type(response)}")
        resp_content = getattr(response, 'content', str(response))
        logger.debug(f"Groq LLM response (len={len(resp_content)}): {resp_content}")
        return resp_content
    except Exception as e:
        logger.error(f"Groq API call failed: {e}", exc_info=True)
        raise