import { IAIAgent } from './AIAgent'
import { GeminiAdapter } from './GeminiAdapter'
import logger from '../../utils/logger'

export type AIProviderName = 'gemini' | 'openai' | 'anthropic'

export class AIServiceFactory {
  private static instance: IAIAgent
  private static provider: AIProviderName = 'gemini'

  /**
   * Initializes the factory with a specific provider.
   * If not called, defaults to 'gemini'.
   */
  public static initialize(provider: AIProviderName = 'gemini') {
    this.provider = provider
    logger.info(`[AIServiceFactory] Initialized with provider: ${provider}`)
  }

  /**
   * Returns a singleton instance of the configured AI Agent.
   */
  public static getAgent(): IAIAgent {
    if (!this.instance) {
      // We can use an environment variable to override provider selection
      const envProvider = process.env.AI_PROVIDER as AIProviderName
      if (envProvider) {
        this.provider = envProvider
      }

      switch (this.provider) {
        case 'gemini':
          try {
            this.instance = new GeminiAdapter()
          } catch (e) {
            logger.error(
              `[AIServiceFactory] Failed to initialize GeminiAdapter: ${e instanceof Error ? e.message : String(e)}`
            )
            throw e
          }
          break
        // Future extensions:
        // case 'openai':
        //   this.instance = new OpenAIAdapter();
        //   break;
        // case 'anthropic':
        //   this.instance = new AnthropicAdapter();
        //   break;
        default:
          logger.warn(
            `[AIServiceFactory] Unknown provider ${this.provider}, falling back to Gemini`
          )
          try {
            this.instance = new GeminiAdapter()
          } catch (e) {
            logger.error(
              `[AIServiceFactory] Failed to initialize GeminiAdapter: ${e instanceof Error ? e.message : String(e)}`
            )
            throw e
          }
      }
    }
    return this.instance
  }
}
