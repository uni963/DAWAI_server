// AI Assistant で使用する定数

export const DEFAULT_MODELS = [
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic" },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic" },
  { id: "gpt-4", name: "GPT-4", provider: "openai" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "google" }
];

export const CHAT_MODES = {
  AGENT: "agent",
  CHAT: "chat"
};

export const PROCESSING_STATES = {
  IDLE: { isGenerating: false, isThinking: false, progress: 0 },
  GENERATING: { isGenerating: true, isThinking: false, progress: 0 },
  THINKING: { isGenerating: false, isThinking: true, progress: 0 }
}; 