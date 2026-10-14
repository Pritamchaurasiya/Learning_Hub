import { IAIAgent } from './AIAgent'
import { GeminiAdapter } from './GeminiAdapter'
import { OpenAIAdapter } from './OpenAIAdapter'
import { AnthropicAdapter } from './AnthropicAdapter'
import { GroqAdapter } from './GroqAdapter'
import { OllamaAdapter } from './OllamaAdapter'
import { AIRouter } from './AIRouter'
import logger from '../../utils/logger'

export type AIProviderName = 'router' | 'gemini' | 'groq' | 'ollama' | 'openai' | 'anthropic'

export class AIServiceFactory {
  private static instance?: IAIAgent
  private static provider: AIProviderName = 'gemini'

  /**
   * Initializes the factory with a specific provider and clears any cached instance.
   */
  public static initialize(provider: AIProviderName = 'gemini') {
    this.provider = provider
    this.instance = undefined
    logger.info(`[AIServiceFactory] Initialized with provider: ${provider}`)
  }

  /**
   * Resets the cached singleton instance.
   */
  public static reset() {
    this.instance = undefined
  }

  /**
   * Returns a dedicated instance of the multi-model AIRouter.
   */
  public static getRouter(): AIRouter {
    return new AIRouter()
  }

  /**
   * Returns a singleton instance of the configured AI Agent.
   */
  public static getAgent(): IAIAgent {
    if (!this.instance) {
      const envProvider = process.env.AI_PROVIDER as AIProviderName
      if (envProvider) {
        this.provider = envProvider
      }

      switch (this.provider) {
        case 'router':
          this.instance = new AIRouter()
          break

        case 'groq':
          try {
            this.instance = new GroqAdapter()
          } catch (e) {
            logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
            try {
              this.instance = new GeminiAdapter();
            } catch (e) {
              throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          break

        case 'ollama':
          try {
            this.instance = new OllamaAdapter()
          } catch (e) {
            logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
            try {
              this.instance = new GeminiAdapter();
            } catch (e) {
              throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          break

        case 'openai':
          try {
            this.instance = new OpenAIAdapter()
          } catch (e) {
            logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
            try {
              this.instance = new GeminiAdapter();
            } catch (e) {
              throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          break

        case 'anthropic':
          try {
            this.instance = new AnthropicAdapter()
          } catch (e) {
            logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
            try {
              this.instance = new GeminiAdapter();
            } catch (e) {
              throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          break

        case 'gemini':
          try {
            this.instance = new GeminiAdapter()
          } catch (e) {
            logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
            try {
              this.instance = new GeminiAdapter();
            } catch (e) {
              throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          break

        default:
          logger.warn(`[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`);
          try {
            this.instance = new GeminiAdapter();
          } catch (e) {
            throw new Error(`[AIServiceFactory] Failed to initialize Gemini adapter: ${e instanceof Error ? e.message : String(e)}`);
          }
      }
    }
    return this.instance
  }
}
