/**
 * Sorting Algorithm Step Generation Engines
 *
 * Each generator yields an immutable frame representing algorithm state,
 * enabling real-time playback, forward/backward scrubbing, pseudocode highlighting,
 * and audio pitch synthesis.
 */

export interface SortFrame {
  array: number[]
  comparing: [number, number] | []
  swapping: [number, number] | []
  sorted: number[]
  pivot: number | null
  auxiliary?: number[]
  codeLine: number
  description: string
  comparisons: number
  swaps: number
}

export interface SortAlgorithmInfo {
  id: string
  name: string
  timeComplexityBest: string
  timeComplexityAvg: string
  timeComplexityWorst: string
  spaceComplexity: string
  stable: boolean
  description: string
  pseudocode: string[]
}

export const SORTING_ALGORITHMS: Record<string, SortAlgorithmInfo> = {
  bubble: {
    id: 'bubble',
    name: 'Bubble Sort',
    timeComplexityBest: 'O(N)',
    timeComplexityAvg: 'O(N²)',
    timeComplexityWorst: 'O(N²)',
    spaceComplexity: 'O(1)',
    stable: true,
    description:
      'Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.',
    pseudocode: [
      'for i = 0 to N-1:',
      '  swapped = false',
      '  for j = 0 to N-i-2:',
      '    if arr[j] > arr[j+1]:',
      '      swap(arr[j], arr[j+1])',
      '      swapped = true',
      '  if not swapped: break',
    ],
  },
  selection: {
    id: 'selection',
    name: 'Selection Sort',
    timeComplexityBest: 'O(N²)',
    timeComplexityAvg: 'O(N²)',
    timeComplexityWorst: 'O(N²)',
    spaceComplexity: 'O(1)',
    stable: false,
    description:
      'Divides the list into a sorted and unsorted region. Repeatedly selects the minimum element from the unsorted region.',
    pseudocode: [
      'for i = 0 to N-1:',
      '  minIdx = i',
      '  for j = i+1 to N-1:',
      '    if arr[j] < arr[minIdx]: minIdx = j',
      '  if minIdx != i:',
      '    swap(arr[i], arr[minIdx])',
    ],
  },
  insertion: {
    id: 'insertion',
    name: 'Insertion Sort',
    timeComplexityBest: 'O(N)',
    timeComplexityAvg: 'O(N²)',
    timeComplexityWorst: 'O(N²)',
    spaceComplexity: 'O(1)',
    stable: true,
    description:
      'Builds the sorted array one item at a time by repeatedly taking the next element and inserting it into its correct position.',
    pseudocode: [
      'for i = 1 to N-1:',
      '  key = arr[i]',
      '  j = i - 1',
      '  while j >= 0 and arr[j] > key:',
      '    arr[j + 1] = arr[j]',
      '    j = j - 1',
      '  arr[j + 1] = key',
    ],
  },
  merge: {
    id: 'merge',
    name: 'Merge Sort',
    timeComplexityBest: 'O(N log N)',
    timeComplexityAvg: 'O(N log N)',
    timeComplexityWorst: 'O(N log N)',
    spaceComplexity: 'O(N)',
    stable: true,
    description:
      'Divide-and-conquer algorithm that divides the array in halves, sorts each half recursively, and merges the sorted halves.',
    pseudocode: [
      'function mergeSort(arr, left, right):',
      '  if left < right:',
      '    mid = floor((left + right) / 2)',
      '    mergeSort(arr, left, mid)',
      '    mergeSort(arr, mid+1, right)',
      '    merge(arr, left, mid, right)',
    ],
  },
  quick: {
    id: 'quick',
    name: 'Quick Sort',
    timeComplexityBest: 'O(N log N)',
    timeComplexityAvg: 'O(N log N)',
    timeComplexityWorst: 'O(N²)',
    spaceComplexity: 'O(log N)',
    stable: false,
    description:
      'Picks an element as pivot and partitions the array around the pivot such that smaller elements go left and greater go right.',
    pseudocode: [
      'function quickSort(arr, low, high):',
      '  if low < high:',
      '    pivotIdx = partition(arr, low, high)',
      '    quickSort(arr, low, pivotIdx - 1)',
      '    quickSort(arr, pivotIdx + 1, high)',
    ],
  },
  heap: {
    id: 'heap',
    name: 'Heap Sort',
    timeComplexityBest: 'O(N log N)',
    timeComplexityAvg: 'O(N log N)',
    timeComplexityWorst: 'O(N log N)',
    spaceComplexity: 'O(1)',
    stable: false,
    description:
      'Converts the array into a Binary Max-Heap, then repeatedly extracts the maximum root element and places it at the end.',
    pseudocode: [
      'buildMaxHeap(arr)',
      'for i = N-1 down to 1:',
      '  swap(arr[0], arr[i])',
      '  heapify(arr, 0, i)',
    ],
  },
}

// ─── BUBBLE SORT GENERATOR ──────────────────────────────────────────
export function* generateBubbleSort(initialArr: number[]): Generator<SortFrame> {
  const arr = [...initialArr]
  const n = arr.length
  let comparisons = 0
  let swaps = 0
  const sorted: number[] = []

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [],
    pivot: null,
    codeLine: 0,
    description: 'Starting Bubble Sort',
    comparisons,
    swaps,
  }

  for (let i = 0; i < n; i++) {
    let swapped = false
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++
      yield {
        array: [...arr],
        comparing: [j, j + 1],
        swapping: [],
        sorted: [...sorted],
        pivot: null,
        codeLine: 3,
        description: `Comparing arr[${j}] (${arr[j]}) with arr[${j + 1}] (${arr[j + 1]})`,
        comparisons,
        swaps,
      }

      if (arr[j]! > arr[j + 1]!) {
        const temp = arr[j]!
        arr[j] = arr[j + 1]!
        arr[j + 1] = temp
        swaps++
        swapped = true

        yield {
          array: [...arr],
          comparing: [],
          swapping: [j, j + 1],
          sorted: [...sorted],
          pivot: null,
          codeLine: 4,
          description: `Swapped arr[${j}] and arr[${j + 1}]`,
          comparisons,
          swaps,
        }
      }
    }
    sorted.unshift(n - i - 1)
    if (!swapped) {
      // Remaining elements are already sorted
      for (let k = 0; k < n - i - 1; k++) {
        if (!sorted.includes(k)) sorted.push(k)
      }
      break
    }
  }

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: arr.map((_, i) => i),
    pivot: null,
    codeLine: 6,
    description: `Bubble Sort Complete! (${comparisons} comparisons, ${swaps} swaps)`,
    comparisons,
    swaps,
  }
}

// ─── SELECTION SORT GENERATOR ───────────────────────────────────────
export function* generateSelectionSort(initialArr: number[]): Generator<SortFrame> {
  const arr = [...initialArr]
  const n = arr.length
  let comparisons = 0
  let swaps = 0
  const sorted: number[] = []

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [],
    pivot: null,
    codeLine: 0,
    description: 'Starting Selection Sort',
    comparisons,
    swaps,
  }

  for (let i = 0; i < n; i++) {
    let minIdx = i
    yield {
      array: [...arr],
      comparing: [i, i],
      swapping: [],
      sorted: [...sorted],
      pivot: minIdx,
      codeLine: 1,
      description: `Current search window begins at index ${i}`,
      comparisons,
      swaps,
    }

    for (let j = i + 1; j < n; j++) {
      comparisons++
      yield {
        array: [...arr],
        comparing: [j, minIdx],
        swapping: [],
        sorted: [...sorted],
        pivot: minIdx,
        codeLine: 3,
        description: `Comparing arr[${j}] (${arr[j]}) with current min arr[${minIdx}] (${arr[minIdx]})`,
        comparisons,
        swaps,
      }

      if (arr[j]! < arr[minIdx]!) {
        minIdx = j
        yield {
          array: [...arr],
          comparing: [],
          swapping: [],
          sorted: [...sorted],
          pivot: minIdx,
          codeLine: 3,
          description: `New minimum found at index ${minIdx} (value: ${arr[minIdx]})`,
          comparisons,
          swaps,
        }
      }
    }

    if (minIdx !== i) {
      const temp = arr[i]!
      arr[i] = arr[minIdx]!
      arr[minIdx] = temp
      swaps++

      yield {
        array: [...arr],
        comparing: [],
        swapping: [i, minIdx],
        sorted: [...sorted],
        pivot: null,
        codeLine: 5,
        description: `Placed minimum ${arr[i]} at sorted position ${i}`,
        comparisons,
        swaps,
      }
    }

    sorted.push(i)
  }

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: arr.map((_, idx) => idx),
    pivot: null,
    codeLine: 5,
    description: `Selection Sort Complete! (${comparisons} comparisons, ${swaps} swaps)`,
    comparisons,
    swaps,
  }
}

// ─── INSERTION SORT GENERATOR ───────────────────────────────────────
export function* generateInsertionSort(initialArr: number[]): Generator<SortFrame> {
  const arr = [...initialArr]
  const n = arr.length
  let comparisons = 0
  let swaps = 0
  const sorted: number[] = [0]

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [0],
    pivot: null,
    codeLine: 0,
    description: 'Starting Insertion Sort',
    comparisons,
    swaps,
  }

  for (let i = 1; i < n; i++) {
    const key = arr[i]!
    let j = i - 1

    yield {
      array: [...arr],
      comparing: [i, j],
      swapping: [],
      sorted: [...sorted],
      pivot: i,
      codeLine: 1,
      description: `Picking key element arr[${i}] = ${key} to insert into sorted prefix`,
      comparisons,
      swaps,
    }

    while (j >= 0) {
      comparisons++
      yield {
        array: [...arr],
        comparing: [j, j + 1],
        swapping: [],
        sorted: [...sorted],
        pivot: i,
        codeLine: 3,
        description: `Comparing arr[${j}] (${arr[j]}) with key (${key})`,
        comparisons,
        swaps,
      }

      if (arr[j]! > key) {
        arr[j + 1] = arr[j]!
        swaps++
        yield {
          array: [...arr],
          comparing: [],
          swapping: [j, j + 1],
          sorted: [...sorted],
          pivot: null,
          codeLine: 4,
          description: `Shifted arr[${j}] (${arr[j + 1]}) to index ${j + 1}`,
          comparisons,
          swaps,
        }
        j--
      } else {
        break
      }
    }

    arr[j + 1] = key
    sorted.push(i)

    yield {
      array: [...arr],
      comparing: [],
      swapping: [],
      sorted: Array.from({ length: i + 1 }, (_, idx) => idx),
      pivot: null,
      codeLine: 6,
      description: `Inserted key ${key} at position ${j + 1}`,
      comparisons,
      swaps,
    }
  }

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: arr.map((_, idx) => idx),
    pivot: null,
    codeLine: 6,
    description: `Insertion Sort Complete! (${comparisons} comparisons, ${swaps} shifts)`,
    comparisons,
    swaps,
  }
}

// ─── QUICK SORT GENERATOR ───────────────────────────────────────────
export function* generateQuickSort(initialArr: number[]): Generator<SortFrame> {
  const arr = [...initialArr]
  let comparisons = 0
  let swaps = 0
  const sorted: number[] = []

  function* quickSortHelper(low: number, high: number): Generator<SortFrame> {
    if (low < high) {
      const pivotIndex: number = yield* partition(low, high)
      sorted.push(pivotIndex)
      yield* quickSortHelper(low, pivotIndex - 1)
      yield* quickSortHelper(pivotIndex + 1, high)
    } else if (low === high) {
      if (!sorted.includes(low)) sorted.push(low)
    }
  }

  function* partition(low: number, high: number): Generator<SortFrame, number, unknown> {
    const pivotValue = arr[high]!
    let i = low - 1

    yield {
      array: [...arr],
      comparing: [],
      swapping: [],
      sorted: [...sorted],
      pivot: high,
      codeLine: 2,
      description: `Selected pivot arr[${high}] = ${pivotValue}`,
      comparisons,
      swaps,
    }

    for (let j = low; j < high; j++) {
      comparisons++
      yield {
        array: [...arr],
        comparing: [j, high],
        swapping: [],
        sorted: [...sorted],
        pivot: high,
        codeLine: 3,
        description: `Comparing arr[${j}] (${arr[j]}) with pivot (${pivotValue})`,
        comparisons,
        swaps,
      }

      if (arr[j]! < pivotValue) {
        i++
        if (i !== j) {
          const temp = arr[i]!
          arr[i] = arr[j]!
          arr[j] = temp
          swaps++

          yield {
            array: [...arr],
            comparing: [],
            swapping: [i, j],
            sorted: [...sorted],
            pivot: high,
            codeLine: 4,
            description: `Swapped smaller element arr[${i}] with arr[${j}]`,
            comparisons,
            swaps,
          }
        }
      }
    }

    const temp = arr[i + 1]!
    arr[i + 1] = arr[high]!
    arr[high] = temp
    swaps++

    yield {
      array: [...arr],
      comparing: [],
      swapping: [i + 1, high],
      sorted: [...sorted],
      pivot: i + 1,
      codeLine: 4,
      description: `Placed pivot ${pivotValue} at partition index ${i + 1}`,
      comparisons,
      swaps,
    }

    return i + 1
  }

  yield* quickSortHelper(0, arr.length - 1)

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: arr.map((_, idx) => idx),
    pivot: null,
    codeLine: 4,
    description: `Quick Sort Complete! (${comparisons} comparisons, ${swaps} swaps)`,
    comparisons,
    swaps,
  }
}

// ─── MERGE SORT GENERATOR ───────────────────────────────────────────
export function* generateMergeSort(initialArr: number[]): Generator<SortFrame> {
  const arr = [...initialArr]
  let comparisons = 0
  let swaps = 0
  const sorted: number[] = []

  function* mergeSortHelper(left: number, right: number): Generator<SortFrame> {
    if (left >= right) return
    const mid = Math.floor((left + right) / 2)

    yield* mergeSortHelper(left, mid)
    yield* mergeSortHelper(mid + 1, right)
    yield* merge(left, mid, right)
  }

  function* merge(left: number, mid: number, right: number): Generator<SortFrame> {
    const leftArr = arr.slice(left, mid + 1)
    const rightArr = arr.slice(mid + 1, right + 1)
    let i = 0
    let j = 0
    let k = left

    yield {
      array: [...arr],
      comparing: [left, right],
      swapping: [],
      sorted: [...sorted],
      pivot: mid,
      codeLine: 5,
      description: `Merging sub-arrays [${left}..${mid}] and [${mid + 1}..${right}]`,
      comparisons,
      swaps,
    }

    while (i < leftArr.length && j < rightArr.length) {
      comparisons++
      yield {
        array: [...arr],
        comparing: [left + i, mid + 1 + j],
        swapping: [],
        sorted: [...sorted],
        pivot: mid,
        codeLine: 5,
        description: `Comparing left (${leftArr[i]}) and right (${rightArr[j]}) elements`,
        comparisons,
        swaps,
      }

      if (leftArr[i]! <= rightArr[j]!) {
        arr[k] = leftArr[i]!
        i++
      } else {
        arr[k] = rightArr[j]!
        j++
      }
      swaps++
      yield {
        array: [...arr],
        comparing: [],
        swapping: [k, k],
        sorted: [...sorted],
        pivot: null,
        codeLine: 5,
        description: `Placed ${arr[k]} at merged index ${k}`,
        comparisons,
        swaps,
      }
      k++
    }

    while (i < leftArr.length) {
      arr[k] = leftArr[i]!
      swaps++
      i++
      k++
    }

    while (j < rightArr.length) {
      arr[k] = rightArr[j]!
      swaps++
      j++
      k++
    }

    if (left === 0 && right === arr.length - 1) {
      for (let idx = 0; idx < arr.length; idx++) {
        if (!sorted.includes(idx)) sorted.push(idx)
      }
    }
  }

  yield* mergeSortHelper(0, arr.length - 1)

  yield {
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: arr.map((_, idx) => idx),
    pivot: null,
    codeLine: 5,
    description: `Merge Sort Complete! (${comparisons} comparisons, ${swaps} write operations)`,
    comparisons,
    swaps,
  }
}
