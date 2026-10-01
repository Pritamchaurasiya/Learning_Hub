import { prisma } from '../src/config'

const EBOOKS_DATA = [
  {
    id: 'ebook-dsa-handbook',
    title: 'The Algorithmic Mind: Data Structures & Asymptotic Mastery',
    slug: 'algorithmic-mind-dsa-mastery',
    author: 'Dr. Evelyn Vance & LearningHub AI Lab',
    category: 'Computer Science',
    difficulty: 'Advanced',
    description:
      'Rigorous proofs, recurrence relations, amortized analysis, advanced tree balancing (AVL, Red-Black), and graph traversals with interactive visualizations.',
    coverUrl:
      'https://images.unsplash.com/photo-1516116211227-bbc13c744be5?w=800&auto=format&fit=crop&q=80',
    totalChapters: 3,
    estimatedReadingTimeMins: 120,
    rating: 4.95,
    chapters: [
      {
        id: 'ch-dsa-1',
        title: '1. Asymptotic Analysis & Master Theorem Foundations',
        order: 1,
        estimatedReadTimeMins: 15,
        contentMarkdown: `# Chapter 1: Asymptotic Analysis & Recurrences

## 1.1 The Mathematical Necessity of Asymptotic Bounds
In modern software engineering, evaluating algorithmic performance solely by wall-clock time is inherently flawed. Hardware architectures, CPU cache hierarchies, operating system scheduler context-switches, and memory bus bandwidth introduce non-deterministic variance.

**Asymptotic analysis** abstracts machine-dependent constants to quantify how resource requirements scale relative to input size $n$.

### 1.1.1 The Formal Definitions
- **Big-O ($O$)**: Tight Upper Bound. $f(n) = O(g(n))$ if there exist positive constants $c$ and $n_0$ such that $0 \\le f(n) \\le c \\cdot g(n)$ for all $n \\ge n_0$.
- **Big-Omega ($\\Omega$)**: Tight Lower Bound. $f(n) = \\Omega(g(n))$ if $0 \\le c \\cdot g(n) \\le f(n)$ for all $n \\ge n_0$.
- **Big-Theta ($\\Theta$)**: Exact Asymptotic Bound. $f(n) = \\Theta(g(n))$ if and only if $f(n) = O(g(n))$ and $f(n) = \\Omega(g(n))$.

---

## 1.2 The Master Theorem
For recurrence relations characterizing divide-and-conquer algorithms of the form:

$$T(n) = a \\cdot T(n / b) + f(n)$$

where $a \\ge 1$, $b > 1$, and $f(n)$ is an asymptotically positive function:

1. **Case 1 (Leaf-heavy)**: If $f(n) = O(n^{\\log_b a - \\epsilon})$ for some constant $\\epsilon > 0$, then $T(n) = \\Theta(n^{\\log_b a})$.
2. **Case 2 (Balanced)**: If $f(n) = \\Theta(n^{\\log_b a} \\log^k n)$ for $k \\ge 0$, then $T(n) = \\Theta(n^{\\log_b a} \\log^{k+1} n)$.
3. **Case 3 (Root-heavy)**: If $f(n) = \\Omega(n^{\\log_b a + \\epsilon})$ for some constant $\\epsilon > 0$, and if $a \\cdot f(n/b) \\le c \\cdot f(n)$ for some constant $c < 1$ and all sufficiently large $n$, then $T(n) = \\Theta(f(n))$.

---

## 1.3 Amortized Complexity: Dynamic Arrays
When an array of capacity $C$ reaches its threshold, allocating a new memory buffer of size $2C$ and copying $n$ elements requires $O(n)$ time. However, because doubling occurs only every $n$ insertions:

$$\\text{Amortized Cost per Insertion} = \\frac{n \\times O(1) + \\sum_{i=1}^{\\log_2 n} 2^i}{n} = \\frac{O(n) + O(2n)}{n} = O(1)$$

Thus, the aggregate cost per operation remains strictly bounded and constant in the long run.`,
      },
      {
        id: 'ch-dsa-2',
        title: '2. Priority Queues, Binary Heaps & Fibonacci Heaps',
        order: 2,
        estimatedReadTimeMins: 20,
        contentMarkdown: `# Chapter 2: Priority Queues & Advanced Heap Structures

A **Priority Queue** is an abstract data type where each element has an associated key/priority, and elements with higher priority are dequeued before lower-priority elements.

## 2.1 Binary Heap Mechanics
An implicit binary heap is structured as a complete binary tree laid out sequentially in contiguous array memory:

- **Parent**: $\\lfloor (i - 1) / 2 \\rfloor$
- **Left Child**: $2i + 1$
- **Right Child**: $2i + 2$

### Invariant Preservation
Every node satisfies the heap-order property: in a min-heap, $\\text{val}(\\text{parent}) \\le \\text{val}(\\text{child})$.

\`\`\`typescript
function siftUp(heap: number[], idx: number): void {
  while (idx > 0) {
    const parent = Math.floor((idx - 1) / 2);
    if (heap[parent] <= heap[idx]) break;
    [heap[parent], heap[idx]] = [heap[idx], heap[parent]];
    idx = parent;
  }
}
\`\`\`

## 2.2 Fibonacci Heaps & Graph Optimization
Fibonacci heaps achieve $O(1)$ amortized decrease-key operations by lazily deferring tree consolidations until extracting the minimum. This drops Dijkstra's single-source shortest path runtime from $O((V + E) \\log V)$ to $O(E + V \\log V)$.`,
      },
      {
        id: 'ch-dsa-3',
        title: '3. Dynamic Programming & Optimal Substructure',
        order: 3,
        estimatedReadTimeMins: 25,
        contentMarkdown: `# Chapter 3: Dynamic Programming Foundations

Dynamic Programming (DP) is an algorithmic paradigm that solves complex optimization problems by breaking them down into simpler, overlapping subproblems and caching intermediate solutions.

## 3.1 Two Core Prerequisites
1. **Optimal Substructure**: An optimal solution to the overall problem contains within it optimal solutions to subproblems.
2. **Overlapping Subproblems**: The same recursive subproblems are encountered repeatedly rather than generating new subproblems at each step.

## 3.2 Top-Down vs Bottom-Up
- **Memoization (Top-Down)**: Follows the natural recursion tree while caching states in a hash map or lookup array.
- **Tabulation (Bottom-Up)**: Solves subproblems iteratively starting from the base cases, enabling space optimization by discarding unneeded earlier states.`,
      },
    ],
  },
  {
    id: 'ebook-distributed-systems',
    title: 'Designing Resilient Distributed & Cloud Systems',
    slug: 'distributed-systems-design',
    author: 'Principal Architect Marcus Sterling',
    category: 'Cloud Computing',
    difficulty: 'Advanced',
    description:
      'CAP & PACELC theorems, Paxos/Raft consensus, event-driven streaming architectures, idempotent consumers, and low-latency database replication.',
    coverUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    totalChapters: 2,
    estimatedReadingTimeMins: 150,
    rating: 4.92,
    chapters: [
      {
        id: 'ch-dist-1',
        title: '1. The CAP Theorem & Distributed Consistency Models',
        order: 1,
        estimatedReadTimeMins: 20,
        contentMarkdown: `# Chapter 1: The CAP & PACELC Theorems

In any networked distributed database where nodes can experience network partitions, trade-offs between consistency and availability are fundamental mathematical constraints.

## 1.1 The CAP Trade-Off
- **Consistency ($C$)**: Every read receives the most recent write or an error.
- **Availability ($A$)**: Every non-failing node returns a non-error response, without guaranteeing it contains the most recent write.
- **Partition Tolerance ($P$)**: The system continues to operate despite arbitrary message loss or network latency.

## 1.2 PACELC Extension
The PACELC theorem notes that even in the absence of partitions (**E**lse), there is an inherent trade-off between **L**atency and **C**onsistency:
> If Partition: Choose Availability ($A$) or Consistency ($C$);
> Else: Choose Latency ($L$) or Consistency ($C$).`,
      },
      {
        id: 'ch-dist-2',
        title: '2. Leader Election & Raft Consensus Algorithm',
        order: 2,
        estimatedReadTimeMins: 25,
        contentMarkdown: `# Chapter 2: Raft Consensus

Consensus algorithms allow a collection of machines to work as a coherent group that can survive failures of some of its members.

## 2.1 Node States in Raft
Every node in a Raft cluster exists in one of three states:
1. **Leader**: Handles all client requests, replicates log entries to followers.
2. **Follower**: Passive responder to Remote Procedure Calls (RPCs).
3. **Candidate**: Initiates elections when the heartbeat timer elapses without contact from a leader.

## 2.2 Safety Invariants
- **Election Safety**: At most one leader can be elected in a given term.
- **Leader Append-Only**: A leader never overwrites or truncates its own log entries.
- **Log Matching**: If two logs contain an entry with the same index and term, they are identical up to that index.`,
      },
    ],
  },
]

async function seed() {
  console.log('📚 Seeding eBooks into PostgreSQL...')

  for (const bookData of EBOOKS_DATA) {
    const { chapters, ...ebookFields } = bookData

    const ebook = await prisma.ebook.upsert({
      where: { slug: ebookFields.slug },
      update: {
        title: ebookFields.title,
        author: ebookFields.author,
        category: ebookFields.category,
        difficulty: ebookFields.difficulty,
        description: ebookFields.description,
        coverUrl: ebookFields.coverUrl,
        totalChapters: ebookFields.totalChapters,
        estimatedReadingTimeMins: ebookFields.estimatedReadingTimeMins,
        rating: ebookFields.rating,
      },
      create: {
        id: ebookFields.id,
        title: ebookFields.title,
        slug: ebookFields.slug,
        author: ebookFields.author,
        category: ebookFields.category,
        difficulty: ebookFields.difficulty,
        description: ebookFields.description,
        coverUrl: ebookFields.coverUrl,
        totalChapters: ebookFields.totalChapters,
        estimatedReadingTimeMins: ebookFields.estimatedReadingTimeMins,
        rating: ebookFields.rating,
      },
    })

    console.log(`  ✓ Ebook: ${ebook.title}`)

    for (const ch of chapters) {
      await prisma.ebookChapter.upsert({
        where: {
          ebookId_order: {
            ebookId: ebook.id,
            order: ch.order,
          },
        },
        update: {
          title: ch.title,
          contentMarkdown: ch.contentMarkdown,
          estimatedReadTimeMins: ch.estimatedReadTimeMins,
        },
        create: {
          id: ch.id,
          ebookId: ebook.id,
          title: ch.title,
          order: ch.order,
          contentMarkdown: ch.contentMarkdown,
          estimatedReadTimeMins: ch.estimatedReadTimeMins,
        },
      })
      console.log(`    - Chapter ${ch.order}: ${ch.title}`)
    }
  }

  console.log('✅ eBooks and Chapters seeded successfully!')
}

seed()
  .catch(err => {
    console.error('Failed to seed ebooks:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
