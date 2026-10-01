/**
 * High-Performance Binary Heap / Priority Queue
 *
 * Implements a generic Min/Max Heap with configurable comparator function.
 * Supports O(log N) insertion and extraction, O(1) peek, and O(N) array heapification.
 */

export type Comparator<T> = (a: T, b: T) => number

export class PriorityQueue<T> {
  private heap: T[] = []
  private readonly comparator: Comparator<T>

  /**
   * By default, creates a Min-Heap for numbers or objects with default natural ordering.
   * For Max-Heap, pass `(a, b) => b - a` or `(a, b) => (b > a ? 1 : b < a ? -1 : 0)`.
   */
  constructor(comparator?: Comparator<T>, initialItems?: T[]) {
    this.comparator =
      comparator ??
      ((a: unknown, b: unknown) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b
        }
        return String(a).localeCompare(String(b))
      })

    if (initialItems && initialItems.length > 0) {
      this.heap = [...initialItems]
      this.buildHeap()
    }
  }

  /**
   * Push item into priority queue.
   * Time Complexity: O(log N)
   */
  public push(item: T): void {
    this.heap.push(item)
    this.siftUp(this.heap.length - 1)
  }

  /**
   * Extract highest priority element from the heap.
   * Time Complexity: O(log N)
   */
  public pop(): T | undefined {
    if (this.heap.length === 0) return undefined
    if (this.heap.length === 1) return this.heap.pop()

    const top = this.heap[0]!
    const last = this.heap.pop()!
    this.heap[0] = last
    this.siftDown(0)
    return top
  }

  /**
   * Look at highest priority element without removing.
   * Time Complexity: O(1)
   */
  public peek(): T | undefined {
    return this.heap[0]
  }

  public size(): number {
    return this.heap.length
  }

  public isEmpty(): boolean {
    return this.heap.length === 0
  }

  public toArray(): T[] {
    return [...this.heap]
  }

  public clear(): void {
    this.heap = []
  }

  /**
   * Convert arbitrary array into a valid heap in linear time.
   * Time Complexity: O(N)
   */
  private buildHeap(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i)
    }
  }

  private siftUp(index: number): void {
    let current = index
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2)
      if (this.compare(current, parent) < 0) {
        this.swap(current, parent)
        current = parent
      } else {
        break
      }
    }
  }

  private siftDown(index: number): void {
    let current = index
    const length = this.heap.length

    while (true) {
      const left = 2 * current + 1
      const right = 2 * current + 2
      let smallest = current

      if (left < length && this.compare(left, smallest) < 0) {
        smallest = left
      }
      if (right < length && this.compare(right, smallest) < 0) {
        smallest = right
      }

      if (smallest !== current) {
        this.swap(current, smallest)
        current = smallest
      } else {
        break
      }
    }
  }

  private compare(i: number, j: number): number {
    return this.comparator(this.heap[i]!, this.heap[j]!)
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i]!
    this.heap[i] = this.heap[j]!
    this.heap[j] = temp
  }
}
