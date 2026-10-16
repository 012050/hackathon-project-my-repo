import json
import logging
import os

logger = logging.getLogger(__name__)

AI_BASE_URL = os.getenv("AI_BASE_URL", "http://192.168.1.221:8000/v1")
AI_MODEL = os.getenv("AI_MODEL", "qwen")
AI_API_KEY = os.getenv("AI_API_KEY", "anything")


class LLMError(RuntimeError):
    pass


_OPENAI_CLIENT = None


def _get_client():
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        from openai import OpenAI

        _OPENAI_CLIENT = OpenAI(base_url=AI_BASE_URL, api_key=AI_API_KEY)
    return _OPENAI_CLIENT


def mock_mode() -> bool:
    return os.getenv("MOCK", "").strip().lower() in ("1", "true", "yes")


def chat(messages: list[dict]) -> str:
    """최종 답변(content)만 반환. thinking 모델이라 max_tokens는 미지정."""
    try:
        resp = _get_client().chat.completions.create(model=AI_MODEL, messages=messages)
    except Exception as exc:
        raise LLMError(f"LLM 요청 실패: {exc}") from exc
    content = resp.choices[0].message.content
    if not content:
        raise LLMError("LLM 응답 content가 비어 있음")
    return content


def chat_json(messages: list[dict]):
    return extract_json(chat(messages))


def extract_json(text: str):
    cleaned = text.strip()
    for marker in ("```json", "```"):
        if cleaned.startswith(marker):
            cleaned = cleaned[len(marker):]
    end = cleaned.rfind("```")
    if end != -1:
        cleaned = cleaned[:end]
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(cleaned):
        if ch in "[{":
            try:
                value, _ = decoder.raw_decode(cleaned, idx)
            except json.JSONDecodeError:
                continue
            if isinstance(value, (list, dict)):
                return value
    raise LLMError(f"LLM 응답에서 JSON 파싱 실패: {text[:200]}")
