// Swap the active client per function by changing the client name.
// All env vars are optional — only the one you use needs to be set.

client<llm> GeminiFlash {
  provider google-ai
  options {
    model "gemini-2.5-flash"
    api_key env.GEMINI_API_KEY
  }
}

client<llm> ClaudeHaiku {
  provider anthropic
  options {
    model "claude-3-5-haiku-20241022"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> QwenVL {
  provider openai-generic
  options {
    base_url "https://openrouter.ai/api/v1"
    model "qwen/qwen2.5-vl-32b-instruct"
    api_key env.OPENROUTER_API_KEY
  }
}
