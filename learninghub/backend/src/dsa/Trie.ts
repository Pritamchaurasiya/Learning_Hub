/**
 * High-Performance Trie (Prefix Tree) Data Structure
 *
 * Provides O(L) time complexity for word insertion, prefix search, and auto-complete suggestions,
 * where L is the length of the string, vastly outperforming O(N) regex scanning.
 */

export interface TrieNodeMetadata {
  score?: number
  category?: string
  id?: string
  [key: string]: unknown
}

export class TrieNode {
  public children: Map<string, TrieNode> = new Map()
  public isEndOfWord = false
  public frequency = 0
  public metadata?: TrieNodeMetadata
  public word?: string
}

export class Trie {
  private root: TrieNode
  private wordCount = 0

  constructor() {
    this.root = new TrieNode()
  }

  /**
   * Insert a word into the Trie with optional metadata and search weight/score.
   * Time Complexity: O(L)
   * Space Complexity: O(L)
   */
  public insert(word: string, metadata?: TrieNodeMetadata): void {
    if (!word || typeof word !== 'string') return
    const normalized = word.trim().toLowerCase()
    if (normalized.length === 0) return

    let current = this.root
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i]!
      let child = current.children.get(char)
      if (!child) {
        child = new TrieNode()
        current.children.set(char, child)
      }
      current = child
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true
      this.wordCount++
    }
    current.frequency++
    current.word = normalized
    if (metadata) {
      current.metadata = { ...current.metadata, ...metadata }
    }
  }

  /**
   * Search if the exact word exists in the Trie.
   * Time Complexity: O(L)
   */
  public search(word: string): boolean {
    if (!word) return false
    const node = this.getNode(word.trim().toLowerCase())
    return node !== null && node.isEndOfWord
  }

  /**
   * Check if any word starts with the given prefix.
   * Time Complexity: O(L)
   */
  public startsWith(prefix: string): boolean {
    if (!prefix) return false
    return this.getNode(prefix.trim().toLowerCase()) !== null
  }

  /**
   * Retrieve auto-complete suggestions matching the given prefix, ranked by frequency and score.
   * Time Complexity: O(L + K) where K is number of matched descendants.
   */
  public getSuggestions(
    prefix: string,
    limit = 10
  ): Array<{ word: string; frequency: number; metadata?: TrieNodeMetadata }> {
    if (!prefix || typeof prefix !== 'string') return []
    const normalized = prefix.trim().toLowerCase()
    const startNode = this.getNode(normalized)
    if (!startNode) return []

    const results: Array<{ word: string; frequency: number; metadata?: TrieNodeMetadata }> = []
    this.collectWords(startNode, results)

    // Sort by frequency/score descending, then alphabetically
    results.sort((a, b) => {
      const scoreA = (a.metadata?.score ?? 0) + a.frequency * 2
      const scoreB = (b.metadata?.score ?? 0) + b.frequency * 2
      if (scoreB !== scoreA) return scoreB - scoreA
      return a.word.localeCompare(b.word)
    })

    return results.slice(0, limit)
  }

  /**
   * Delete a word from the Trie.
   * Time Complexity: O(L)
   */
  public delete(word: string): boolean {
    if (!word) return false
    const normalized = word.trim().toLowerCase()

    let existed = false
    const prune = (current: TrieNode, idx: number): boolean => {
      if (idx === normalized.length) {
        if (!current.isEndOfWord) return false
        current.isEndOfWord = false
        current.word = undefined
        existed = true
        return current.children.size === 0
      }

      const char = normalized[idx]!
      const next = current.children.get(char)
      if (!next) return false

      const shouldPrune = prune(next, idx + 1)
      if (shouldPrune) {
        current.children.delete(char)
        return !current.isEndOfWord && current.children.size === 0
      }

      return false
    }

    prune(this.root, 0)
    if (existed) {
      this.wordCount--
    }
    return existed
  }

  public size(): number {
    return this.wordCount
  }

  public clear(): void {
    this.root = new TrieNode()
    this.wordCount = 0
  }

  private getNode(prefix: string): TrieNode | null {
    let current = this.root
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i]!
      const next = current.children.get(char)
      if (!next) return null
      current = next
    }
    return current
  }

  private collectWords(
    node: TrieNode,
    results: Array<{ word: string; frequency: number; metadata?: TrieNodeMetadata }>
  ): void {
    if (node.isEndOfWord && node.word) {
      results.push({
        word: node.word,
        frequency: node.frequency,
        metadata: node.metadata,
      })
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results)
    }
  }
}
