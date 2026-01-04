import os
import asyncio
import time
import uuid
from typing import AsyncGenerator

import google.generativeai as genai

# Configure Gemini API only if key is available
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
else:
    print("Warning: GEMINI_API_KEY not set. Gemini functionality will be disabled.")


async def _gemini_token_stream(prompt: str, model: str, system_context: str | None = None) -> AsyncGenerator[str, None]:
    # Use google.generativeai streaming; if it's not configured this will raise.
    if not os.getenv("GEMINI_API_KEY"):
        raise RuntimeError("GEMINI_API_KEY not configured")

    # Example streaming call - adapt if SDK surface differs in your environment
    # We will call the streaming generator and yield pieces.
    try:
        # The actual SDK may provide a streaming iterator; include optional system context
        messages = []
        if system_context:
            messages.append({"role": "system", "content": system_context})
        messages.append({"role": "user", "content": prompt})
        response = genai.chat.completions.stream(model=model, messages=messages)
        async for event in response:
            # event may contain delta text
            delta = getattr(event, "delta", None) or event
            text = ""
            # try to extract text from common shapes
            if isinstance(delta, dict):
                text = delta.get("content", "") or delta.get("text", "")
            else:
                try:
                    text = str(delta)
                except Exception:
                    text = ""
            if text:
                yield text
    except Exception as e:
        raise


async def stream_chat_tokens(request, prompt: str, model: str, system_context: str | None = None) -> AsyncGenerator[str, None]:
    # meta event: send chat_id and message_id on first yield
    # Consumers build SSE lines from yielded strings (SSE payloads)
    # Generate a unique chat/message id for new chats
    # First yield meta event as JSON string
    chat_id = str(uuid.uuid4())
    message_id = str(uuid.uuid4())
    meta = f"event: meta\ndata: {{\"chat_id\": \"{chat_id}\", \"message_id\": \"{message_id}\"}}\n\n"
    yield meta

    try:
        async for token in _gemini_token_stream(prompt, model, system_context=system_context):
            # check disconnect
            try:
                if await request.is_disconnected():
                    break
            except Exception:
                pass
            # send token event
            # escape newlines
            token_payload = token.replace("\n", "\\n")
            yield f"event: token\ndata: {{\"text\": \"{token_payload}\"}}\n\n"
        # done
        yield "event: done\ndata: {}\n\n"
    except asyncio.CancelledError:
        # client disconnected / aborted
        try:
            yield "event: error\ndata: {\"message\": \"generation aborted\"}\n\n"
        except Exception:
            pass
    except Exception as e:
        yield f"event: error\ndata: {{\"message\": \"{str(e)}\"}}\n\n"
