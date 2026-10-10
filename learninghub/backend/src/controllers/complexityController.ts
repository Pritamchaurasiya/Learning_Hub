import { Request, Response } from 'express'
import { complexityProfilerService, BenchmarkRequestParams } from '../services/ComplexityProfilerService'
import { sendSuccess, sendBadRequest, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class ComplexityController {
  public benchmark = async (req: Request, res: Response) => {
    try {
      const { algorithmName, codeSnippet, inputSizes, presetAlgorithm } = req.body as BenchmarkRequestParams

      if (!algorithmName && !presetAlgorithm) {
        return sendBadRequest(res, 'Either algorithmName or presetAlgorithm is required')
      }

      const payload = complexityProfilerService.benchmarkAlgorithm({
        algorithmName: algorithmName || 'Algorithm Benchmark',
        codeSnippet: codeSnippet || '// Benchmarked code',
        inputSizes,
        presetAlgorithm,
      })

      return sendSuccess(res, payload, 'Complexity benchmark completed successfully')
    } catch (error) {
      logger.error('[ComplexityController] Error running benchmark:', error instanceof Error ? error : new Error(String(error)))
      return sendInternalError(res, 'Failed to complete complexity profiling')
    }
  }

  public getPresets = async (_req: Request, res: Response) => {
    const presets = [
      {
        id: 'BINARY_SEARCH',
        name: 'Binary Search (Logarithmic)',
        complexity: 'O(log N)',
        code: `function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    let mid = (low + high) >> 1;
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
      },
      {
        id: 'LINEAR_SEARCH',
        name: 'Linear Scan (Single Pass)',
        complexity: 'O(N)',
        code: `function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}`,
      },
      {
        id: 'MERGE_SORT',
        name: 'Merge Sort (Divide & Conquer)',
        complexity: 'O(N log N)',
        code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}`,
      },
      {
        id: 'BUBBLE_SORT',
        name: 'Bubble Sort (Nested Comparison)',
        complexity: 'O(N^2)',
        code: `function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}`,
      },
      {
        id: 'FIBONACCI_RECURSIVE',
        name: 'Naive Fibonacci (Binary Recursion)',
        complexity: 'O(2^N)',
        code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
      },
    ]

    return sendSuccess(res, presets, 'Available complexity presets retrieved')
  }
}

export const complexityController = new ComplexityController()
