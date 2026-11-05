from services.api.core.config import settings
from services.api.ai.base import BaseAIProvider
from services.api.ai.local_provider import LocalAIProvider

def get_ai_provider() -> BaseAIProvider:
    provider_name = settings.AI_PROVIDER.lower()
    
    if provider_name == "gemini" and settings.GEMINI_API_KEY:
        try:
            # We will provide a clean Gemini adapter if key is present
            from services.api.ai.gemini_provider import GeminiAIProvider
            return GeminiAIProvider(api_key=settings.GEMINI_API_KEY)
        except Exception:
            return LocalAIProvider()
    elif provider_name == "openai" and settings.OPENAI_API_KEY:
        try:
            from services.api.ai.openai_provider import OpenAIAIProvider
            return OpenAIAIProvider(api_key=settings.OPENAI_API_KEY)
        except Exception:
            return LocalAIProvider()
            
    # Default high-fidelity local provider
    return LocalAIProvider()
