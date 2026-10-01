import { fetchApi } from '../utils/api'
import type { EbookMetadata, EbookChapter, EbookFlashcard } from '../types/ebook'

export const DEMO_EBOOKS: EbookMetadata[] = [
  {
    id: 'ebook-dsa-handbook',
    title: 'Data Structures & Algorithms: The Interactive Handbook',
    slug: 'dsa-interactive-handbook',
    author: 'Dr. Sarah Chen & Alex Rivera',
    coverUrl:
      'https://images.unsplash.com/photo-1516116211227-bbc13c73395b?w=600&auto=format&fit=crop&q=80',
    description:
      'A visual and mathematical guide to mastering algorithms, asymptotic notation, graphs, dynamic programming, and complexity theory.',
    category: 'Computer Science',
    difficulty: 'Intermediate',
    totalChapters: 6,
    estimatedReadingTimeMins: 180,
    rating: 4.9,
    reviewCount: 342,
    fileSizeBytes: 4.8 * 1024 * 1024,
    tags: ['Algorithms', 'Data Structures', 'Big-O', 'Dynamic Programming'],
    publishedAt: '2026-01-15',
  },
  {
    id: 'ebook-system-design-primer',
    title: 'Distributed Systems & Microservices Architecture',
    slug: 'system-design-architecture-primer',
    author: 'Marcus Vance & Elena Rostova',
    coverUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    description:
      'High-scale architecture design patterns, distributed consensus (Raft/Paxos), caching hierarchies, and event-driven pipelines.',
    category: 'Cloud Computing',
    difficulty: 'Advanced',
    totalChapters: 8,
    estimatedReadingTimeMins: 240,
    rating: 4.95,
    reviewCount: 512,
    fileSizeBytes: 6.2 * 1024 * 1024,
    tags: ['System Design', 'Kafka', 'Redis', 'Microservices', 'Distributed Systems'],
    publishedAt: '2026-02-01',
  },
  {
    id: 'ebook-ml-foundations',
    title: 'Foundations of Deep Learning & Neural Network Mathematics',
    slug: 'ml-deep-learning-foundations',
    author: 'Dr. Priya Patel & Andrew Ng Lab',
    coverUrl:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
    description:
      'Linear algebra, multivariable calculus, backpropagation derivations, transformers, attention mechanisms, and loss manifolds.',
    category: 'Data Science',
    difficulty: 'Advanced',
    totalChapters: 7,
    estimatedReadingTimeMins: 210,
    rating: 4.88,
    reviewCount: 289,
    fileSizeBytes: 5.5 * 1024 * 1024,
    tags: ['Machine Learning', 'Mathematics', 'Transformers', 'Backprop'],
    publishedAt: '2026-02-10',
  },
]

export const DEMO_CHAPTERS: Record<string, EbookChapter[]> = {
  'ebook-dsa-handbook': [
    {
      id: 'ch-dsa-1',
      ebookId: 'ebook-dsa-handbook',
      title: '1. Asymptotic Analysis & Master Theorem Foundations',
      order: 1,
      estimatedReadTimeMins: 15,
      summary:
        'This chapter establishes formal bounds for runtime and memory complexity. We dissect Big-O, Big-Omega, Big-Theta, and master the Master Theorem for divide-and-conquer recurrence relations.',
      keyTakeaways: [
        'Big-O represents tight asymptotic upper bounds, not loose worst cases.',
        'Master Theorem solves recurrences of the form T(n) = aT(n/b) + f(n).',
        'Amortized analysis accounts for rare expensive operations distributed over many fast ones (e.g. dynamic array resizing).',
      ],
      glossary: [
        {
          id: 'g-1',
          term: 'Big-O Notation',
          definition:
            'A mathematical notation describing the limiting behavior of a function when the argument tends towards infinity.',
        },
        {
          id: 'g-2',
          term: 'Recurrence Relation',
          definition:
            'An equation that defines a sequence based on a rule to find the subsequent term from previous terms.',
        },
      ],
      contentMarkdown: `# Chapter 1: Asymptotic Analysis & Recurrences

## 1.1 The Mathematical Necessity of Asymptotic Bounds
In modern software engineering, evaluating algorithmic performance solely by wall-clock time is inherently flawed. Hardware architectures, CPU cache hierarchies, operating system scheduler context-switches, and memory bus bandwidth introduce non-deterministic variance.

**Asymptotic analysis** abstracts machine-dependent constants to quantify how resource requirements scale relative to input size $n$.

### 1.1.1 The Formal Definitions
- **Big-O ($O$)**: Tight Upper Bound. $f(n) = O(g(n))$ if there exist positive constants $c$ and $n_0$ such that $0 \le f(n) \le c \cdot g(n)$ for all $n \ge n_0$.
- **Big-Omega ($\Omega$)**: Tight Lower Bound. $f(n) = \Omega(g(n))$ if $0 \le c \cdot g(n) \le f(n)$ for all $n \ge n_0$.
- **Big-Theta ($\Theta$)**: Exact Asymptotic Bound. $f(n) = \Theta(g(n))$ if and only if $f(n) = O(g(n))$ and $f(n) = \Omega(g(n))$.

---

## 1.2 The Master Theorem
For recurrence relations characterizing divide-and-conquer algorithms of the form:

$$T(n) = a \\cdot T(n / b) + f(n)$$

where $a \\ge 1$, $b > 1$, and $f(n)$ is an asymptotically positive function:

1. **Case 1 (Leaf-heavy)**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then $T(n) = \\Theta(n^{\\log_b a})$.
2. **Case 2 (Balanced)**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ for $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.
3. **Case 3 (Root-heavy)**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and if $a \\cdot f(n/b) \\le c \\cdot f(n)$ for some constant $c < 1$ and all sufficiently large $n$, then $T(n) = \\Theta(f(n))$.

---

## 1.3 Amortized Complexity: The Dynamic Array Case Study
When an array of capacity $C$ reaches its threshold, allocating a new memory buffer of size $2C$ and copying $n$ elements requires $O(n)$ time. However, because doubling occurs only every $n$ insertions:

$$\\text{Amortized Cost per Insertion} = \\frac{n \\times O(1) + \\sum_{i=1}^{\\log_2 n} 2^i}{n} = \\frac{O(n) + O(2n)}{n} = O(1)$$

Thus, the aggregate cost per operation remains constant in the long run.`,
    },
    {
      id: 'ch-dsa-2',
      ebookId: 'ebook-dsa-handbook',
      title: '2. Priority Queues, Binary Heaps & Fibonacci Heaps',
      order: 2,
      estimatedReadTimeMins: 20,
      summary:
        'A comprehensive exploration of array-backed binary heaps, d-ary heaps, decrease-key optimizations, and Fibonacci heaps utilized in Dijkstra and Prim algorithms.',
      contentMarkdown: `# Chapter 2: Priority Queues & Advanced Heap Structures

A **Priority Queue** is an abstract data type where each element has an associated key/priority, and elements with higher priority are dequeued before lower-priority elements.

## 2.1 Binary Heap Mechanics
An implicit binary heap is structured as a complete binary tree laid out sequentially in contiguous array memory:
- Parent of node at index $i$: $\\lfloor (i - 1) / 2 \\rfloor$
- Left child: $2i + 1$
- Right child: $2i + 2$

### Sift-Up vs Sift-Down
- **Sift-Up (Insert)**: Places the new key at the array tail and bubbles upward in $O(\\log n)$ time.
- **Sift-Down (Extract-Min)**: Replaces the root with the last element and sinks downward in $O(\\log n)$ time.
- **Linear-Time Build Heap**: By sifting down from index $\\lfloor n / 2 \\rfloor$ down to 0, total operations equal $\\sum_{h=0}^{\\lfloor \\log n \\rfloor} \\frac{n}{2^{h+1}} O(h) = O(n)$.`,
    },
  ],
}

export const ebookService = {
  async getEbooks(params?: { category?: string; search?: string }): Promise<EbookMetadata[]> {
    try {
      const query = new URLSearchParams()
      if (params?.category && params.category !== 'All') query.set('category', params.category)
      if (params?.search) query.set('search', params.search)
      const res = (await fetchApi(`/ebooks?${query.toString()}`)) as { data: EbookMetadata[] }
      if (res?.data && res.data.length > 0) return res.data
    } catch {}
    // Fallback to rich curated local books
    let list = [...DEMO_EBOOKS]
    if (params?.category && params.category !== 'All') {
      list = list.filter(b => b.category.toLowerCase() === params.category!.toLowerCase())
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        b => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
      )
    }
    return list
  },

  async getEbookById(id: string): Promise<EbookMetadata | null> {
    try {
      const res = (await fetchApi(`/ebooks/${id}`)) as { data: EbookMetadata }
      if (res?.data) return res.data
    } catch {}
    return DEMO_EBOOKS.find(b => b.id === id) || null
  },

  async getChapters(ebookId: string): Promise<EbookChapter[]> {
    try {
      const res = (await fetchApi(`/ebooks/${ebookId}/chapters`)) as { data: EbookChapter[] }
      if (res?.data && res.data.length > 0) return res.data
    } catch {}
    return DEMO_CHAPTERS[ebookId] || DEMO_CHAPTERS['ebook-dsa-handbook'] || []
  },

  async getChapter(ebookId: string, chapterId: string): Promise<EbookChapter | null> {
    const chapters = await this.getChapters(ebookId)
    return chapters.find(c => c.id === chapterId) || chapters[0] || null
  },

  async summarizeChapterAI(
    chapterTitle: string,
    content: string
  ): Promise<{
    summary: string
    keyTakeaways: string[]
    definitions: Array<{ term: string; definition: string }>
  }> {
    try {
      const res = (await fetchApi('/ai/ebook/summarize-chapter', {
        method: 'POST',
        body: JSON.stringify({ chapterTitle, chapterContent: content }),
      })) as {
        summary: string
        keyTakeaways: string[]
        definitions: Array<{ term: string; definition: string }>
      }
      if (res?.summary) return res
    } catch {}
    return {
      summary: `**High-Yield Summary for "${chapterTitle}"**:\n\nThis chapter rigorously examines core foundational concepts, edge cases, and algorithmic asymptotic trade-offs. It emphasizes deriving formulas from first principles, comparing linear vs logarithmic structures, and understanding practical memory layout implications.`,
      keyTakeaways: [
        'Always evaluate asymptotic behavior over machine-specific clock speeds.',
        'Leverage recurrence relations and the Master Theorem for divide-and-conquer analysis.',
        'Amortized bounds provide long-term operational guarantees.',
      ],
      definitions: [
        {
          term: 'Asymptotic Analysis',
          definition: 'Evaluating algorithm complexity as input size approaches infinity.',
        },
        {
          term: 'Amortized Cost',
          definition: 'Average cost of an operation in a sequence of operations.',
        },
      ],
    }
  },

  async explainParagraphAI(
    paragraph: string,
    context?: string
  ): Promise<{ explanation: string; analogy: string; bulletPoints: string[] }> {
    try {
      const res = (await fetchApi('/ai/ebook/explain-paragraph', {
        method: 'POST',
        body: JSON.stringify({ paragraphText: paragraph, chapterContext: context }),
      })) as {
        explanation: string
        analogy: string
        bulletPoints: string[]
      }
      if (res?.explanation) return res
    } catch {}
    return {
      explanation:
        'This passage explains how resource constraints scale as inputs grow. Rather than measuring seconds, it mathematically models the growth rate so the algorithm behaves predictably regardless of machine specifications.',
      analogy:
        "Think of measuring a car's fuel efficiency not by minutes traveled in traffic, but by gallons per mile under standardized conditions.",
      bulletPoints: [
        'Removes hardware bias from performance measurement.',
        'Focuses on dominant growth terms as input reaches infinity.',
        'Enables direct mathematical comparison between competing algorithms.',
      ],
    }
  },

  async generateFlashcardsAI(chapterId: string, content: string): Promise<EbookFlashcard[]> {
    try {
      if (content && content.trim().length > 20) {
        const lines = content
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
        const flashcards: EbookFlashcard[] = []

        let cardIndex = 1
        for (const dl of lines) {
          if (flashcards.length >= 4) break
          if (dl.includes(':') && !dl.startsWith('http')) {
            const parts = dl.replace(/^[-*#]\s*/, '').split(/:\s+/)
            if (parts.length >= 2 && parts[0].length > 3 && parts[0].length < 80 && parts[1].length > 10) {
              flashcards.push({
                id: `card-${chapterId}-${cardIndex++}`,
                chapterId,
                front: `What is ${parts[0].replace(/\*\*/g, '').trim()}?`,
                back: parts[1].replace(/\*\*/g, '').trim(),
                explanation: 'Core concept extracted from current chapter curriculum.',
              })
            }
          }
        }

        if (flashcards.length >= 2) {
          return flashcards
        }
      }
    } catch {
      // Graceful fallback to foundational cards
    }

    return [
      {
        id: `card-${chapterId}-1`,
        chapterId,
        front: 'What is the core principle of this chapter?',
        back: 'Understanding fundamental abstractions and their operational invariant guarantees.',
        explanation: 'Systematic reasoning enables optimal algorithmic and architectural choices.',
      },
      {
        id: `card-${chapterId}-2`,
        chapterId,
        front: 'What is the formal definition of Big-O notation?',
        back: 'f(n) <= c * g(n) for all n >= n0 and c > 0',
        explanation: 'Big-O represents a tight asymptotic upper bound.',
      },
      {
        id: `card-${chapterId}-3`,
        chapterId,
        front: 'Why is amortized analysis important for dynamic data structures?',
        back: 'Because infrequent worst-case reorganizations are averaged over large sequences of cheap operations.',
        explanation:
          'Total cost over n operations remains linear, ensuring O(1) average performance.',
      },
    ]
  },
}
