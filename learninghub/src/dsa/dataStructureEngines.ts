/**
 * Interactive Data Structures Engines
 *
 * Provides animated state models for:
 * - Stack (LIFO: push, pop, peek, overflow)
 * - Queue & Circular Queue (FIFO: enqueue, dequeue, front, rear)
 * - Singly & Doubly Linked List (insert, delete, in-place pointer reversal)
 * - LRU Cache (Hash Map + Doubly Linked List visualizer)
 */

export interface StackItem {
  id: string
  value: string | number
  isNew?: boolean
  isPopping?: boolean
}

export interface QueueItem {
  id: string
  value: string | number
  isFront?: boolean
  isRear?: boolean
  isNew?: boolean
  isLeaving?: boolean
}

export interface LinkedListNodeVisual {
  id: string
  value: string | number
  nextId: string | null
  prevId: string | null
  highlight?: 'current' | 'target' | 'swapping' | null
}

export interface LRUCacheEntryVisual {
  key: string
  value: string
  isHead?: boolean
  isTail?: boolean
  status?: 'hit' | 'miss' | 'evicted' | 'inserted'
}

export class DataStructureEngines {
  // ── Stack Operations ──
  public static stackPush(
    stack: StackItem[],
    value: string | number,
    maxCapacity = 8
  ): { stack: StackItem[]; error?: string } {
    if (stack.length >= maxCapacity) {
      return { stack, error: `Stack Overflow: Exceeded maximum capacity of ${maxCapacity} items.` }
    }
    const newItem: StackItem = {
      id: `stack-${Date.now()}-${Math.random()}`,
      value,
      isNew: true,
    }
    return { stack: [...stack, newItem] }
  }

  public static stackPop(stack: StackItem[]): {
    stack: StackItem[]
    poppedItem?: StackItem
    error?: string
  } {
    if (stack.length === 0) {
      return { stack, error: 'Stack Underflow: Cannot pop from an empty stack.' }
    }
    const newStack = [...stack]
    const popped = newStack.pop()
    return { stack: newStack, poppedItem: popped }
  }

  // ── Queue Operations ──
  public static queueEnqueue(
    queue: QueueItem[],
    value: string | number,
    maxCapacity = 8
  ): { queue: QueueItem[]; error?: string } {
    if (queue.length >= maxCapacity) {
      return { queue, error: `Queue Overflow: Capacity limit of ${maxCapacity} items reached.` }
    }
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      value,
      isNew: true,
    }
    return { queue: [...queue, newItem] }
  }

  public static queueDequeue(queue: QueueItem[]): {
    queue: QueueItem[]
    dequeuedItem?: QueueItem
    error?: string
  } {
    if (queue.length === 0) {
      return { queue, error: 'Queue Underflow: Cannot dequeue from an empty queue.' }
    }
    const [dequeued, ...rest] = queue
    return { queue: rest, dequeuedItem: dequeued }
  }

  // ── Linked List Operations ──
  public static createLinkedList(values: (string | number)[]): LinkedListNodeVisual[] {
    return values.map((val, idx) => ({
      id: `ll-${idx}-${Date.now()}`,
      value: val,
      nextId: idx < values.length - 1 ? `ll-${idx + 1}` : null,
      prevId: idx > 0 ? `ll-${idx - 1}` : null,
    }))
  }

  public static reverseLinkedList(nodes: LinkedListNodeVisual[]): LinkedListNodeVisual[] {
    return [...nodes].reverse().map((node, idx, arr) => ({
      ...node,
      nextId: idx < arr.length - 1 ? arr[idx + 1]!.id : null,
      prevId: idx > 0 ? arr[idx - 1]!.id : null,
    }))
  }
}
