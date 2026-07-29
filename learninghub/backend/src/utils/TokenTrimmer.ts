/**
 * Token Trimmer Utility
 *
 * Approximate tokenizer based on average character count per token (approx 4 chars = 1 token).
 * Sanitizes and trims inputs to prevent exceeding context window limits,
 * dropping excessive tokens safely while keeping core meaning if possible.
 */

// Common prompt injection patterns to detect
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above|all)\s+(instructions|prompts?|rules?)/i,
  /disregard\s+(previous|prior|above|all)\s+(instructions|prompts?|rules?)/i,
  /system\s+(prompt|instruction)/i,
  /you\s+are\s+an?\s+(ai|assistant|bot)|you\s+are\s+(ai|assistant|bot)/i,
  /forget\s+(everything|all\s+previous|the\s+above)/i,
  /new\s+(instructions?|rules?|guidelines?)/i,
  /override\s+(previous|prior|above)\s+(instructions?|prompts?)/i,
  /<\/?\s*(system|user|assistant|developer)\s*>/i,
  /role\s*:\s*(system|user|assistant|developer)/i,
  /###\s*(system|user|assistant)\s*###/i,
  /\[INST\]|\[INST\s*\/\s*\]/i, // Llama-style tags
  /<\|.*?\|>/i, // Special tokens like <|system|>
]

export class PromptInjectionError extends Error {
  constructor(
    message: string,
    public readonly matchedPattern: string
  ) {
    super(message)
    this.name = 'PromptInjectionError'
  }
}

export function detectPromptInjection(text: string): { detected: boolean; pattern?: string } {
  if (!text) return { detected: false }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.toString() }
    }
  }
  return { detected: false }
}

export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input) return input

  // First check for injection
  const injection = detectPromptInjection(input)
  if (injection.detected) {
    const patternStr = injection.pattern ?? ''
    throw new PromptInjectionError(`Prompt injection detected: ${patternStr}`, patternStr)
  }

  // Sanitize: trim, limit length, escape XML
  let sanitized = input.trim()
  if (sanitized.length > maxLength) {
    sanitized = `${sanitized.substring(0, maxLength)}...`
  }

  // Escape XML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  return sanitized
}

export class TokenTrimmer {
  private static CHARS_PER_TOKEN = 4

  /**
   * Trims a string down to a maximum estimated token count.
   */
  static trimToMaxTokens(text: string, maxTokens: number, ellipsis: string = '...'): string {
    if (!text) return text

    const maxChars = maxTokens * this.CHARS_PER_TOKEN
    if (text.length <= maxChars) {
      return text
    }

    // Safely trim
    const trimmed = text.substring(0, maxChars - ellipsis.length)
    return trimmed + ellipsis
  }

  /**
   * Estimates token count for a given text.
   */
  static estimateTokens(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  /**
   * Strips unnecessary whitespace and special characters to compress tokens.
   */
  static sanitize(text: string): string {
    if (!text) return text
    // Replace multiple spaces/newlines with a single space to save tokens
    return text.replace(/\s+/g, ' ').trim()
  }

  /**
   * Escapes XML/HTML brackets to prevent prompt injection in AI sandbox tags.
   */
  static escapeXML(text: string): string {
    if (!text) return text
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  /**
   * Full sanitization pipeline: sanitize whitespace, escape XML, check injection, trim tokens.
   */
  static safeProcess(text: string, maxTokens: number): string {
    const sanitized = this.sanitize(text)
    const escaped = this.escapeXML(sanitized)
    const injection = detectPromptInjection(escaped)
    if (injection.detected) {
      const patternStr = injection.pattern ?? ''
      throw new PromptInjectionError(
        `Prompt injection detected after sanitization: ${patternStr}`,
        patternStr
      )
    }
    return this.trimToMaxTokens(escaped, maxTokens)
  }
}
