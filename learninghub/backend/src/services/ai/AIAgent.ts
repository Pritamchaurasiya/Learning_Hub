export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIProviderOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIGenerationResult {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Interface representing an AI Provider adapter.
 * Implementing this ensures that the core logic remains decoupled from
 * specific third-party SDKs (e.g., Google Generative AI, OpenAI, Anthropic).
 */
export interface IAIAgent {
  /**
   * Generates a single text response based on a prompt.
   */
  generateText(prompt: string, options?: AIProviderOptions): Promise<AIGenerationResult>

  /**
   * Generates a response from a multi-turn chat history.
   */
  generateChat(messages: AIMessage[], options?: AIProviderOptions): Promise<AIGenerationResult>

  /**
   * Specifically handles structured JSON output generation.
   * Prompts the AI to strictly return a JSON object/array.
   */
  generateJSON<T>(prompt: string, options?: AIProviderOptions): Promise<T>

  /**
   * Generates a streaming response from a multi-turn chat history.
   */
  generateChatStream?(
    messages: AIMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown>
}
