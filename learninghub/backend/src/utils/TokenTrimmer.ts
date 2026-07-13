/**
 * Token Trimmer Utility
 *
 * Approximate tokenizer based on average character count per token (approx 4 chars = 1 token).
 * Sanitizes and trims inputs to prevent exceeding context window limits,
 * dropping excessive tokens safely while keeping core meaning if possible.
 */

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
}
