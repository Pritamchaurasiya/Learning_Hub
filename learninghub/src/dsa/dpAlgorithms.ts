/**
 * Dynamic Programming (DP) Visualizer Step Generators
 *
 * Implements 0/1 Knapsack, Longest Common Subsequence (LCS), and Coin Change
 * with interactive 2D table state snapshots, cell formula explanations, and backtrack paths.
 */

export interface DPTableFrame {
  dp: number[][]
  currentRow: number
  currentCol: number
  dependentCells: [number, number][]
  highlightPath: [number, number][]
  description: string
  formula: string
}

export interface KnapsackItem {
  id: number
  name: string
  weight: number
  value: number
}

// ─── 0/1 KNAPSACK GENERATOR ──────────────────────────────────────────
export function* generateKnapsackDP(
  items: KnapsackItem[],
  capacity: number
): Generator<DPTableFrame> {
  const n = items.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0))

  yield {
    dp: dp.map(row => [...row]),
    currentRow: 0,
    currentCol: 0,
    dependentCells: [],
    highlightPath: [],
    description: `Initialized DP table of size (${n + 1} × ${capacity + 1}) with zeros. Base case: 0 items or 0 capacity = value 0`,
    formula: 'dp[0][w] = 0, dp[i][0] = 0',
  }

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1]!
    for (let w = 1; w <= capacity; w++) {
      if (item.weight <= w) {
        const withoutItem = dp[i - 1]![w]!
        const withItem = item.value + dp[i - 1]![w - item.weight]!
        dp[i]![w] = Math.max(withoutItem, withItem)

        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: w,
          dependentCells: [
            [i - 1, w],
            [i - 1, w - item.weight],
          ],
          highlightPath: [],
          description: `Item '${item.name}' (wt:${item.weight}, val:${item.value}): Max of excluding [${withoutItem}] vs including [${item.value} + dp[${i - 1}][${w - item.weight}] (${withItem})] = ${dp[i]![w]}`,
          formula: `dp[${i}][${w}] = max(dp[${i - 1}][${w}], ${item.value} + dp[${i - 1}][${w - item.weight}]) = ${dp[i]![w]}`,
        }
      } else {
        dp[i]![w] = dp[i - 1]![w]!

        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: w,
          dependentCells: [[i - 1, w]],
          highlightPath: [],
          description: `Item '${item.name}' weight (${item.weight}) exceeds capacity (${w}). Carried over previous value ${dp[i]![w]}`,
          formula: `dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i]![w]}`,
        }
      }
    }
  }

  // Backtrack to find chosen items
  const chosenPath: [number, number][] = []
  let currW = capacity
  for (let i = n; i > 0 && currW > 0; i--) {
    if (dp[i]![currW] !== dp[i - 1]![currW]) {
      chosenPath.push([i, currW])
      const item = items[i - 1]!
      currW -= item.weight
    }
  }

  yield {
    dp: dp.map(row => [...row]),
    currentRow: n,
    currentCol: capacity,
    dependentCells: [],
    highlightPath: chosenPath,
    description: `Optimal Solution Found! Maximum Value = ${dp[n]![capacity]} with ${chosenPath.length} selected items.`,
    formula: `Result: max_value = ${dp[n]![capacity]}`,
  }
}

// ─── LONGEST COMMON SUBSEQUENCE GENERATOR ────────────────────────────
export function* generateLCS(text1: string, text2: string): Generator<DPTableFrame> {
  const m = text1.length
  const n = text2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  yield {
    dp: dp.map(row => [...row]),
    currentRow: 0,
    currentCol: 0,
    dependentCells: [],
    highlightPath: [],
    description: `Initialized LCS table for strings "${text1}" and "${text2}".`,
    formula: 'dp[0][j] = 0, dp[i][0] = 0',
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i]![j] = 1 + dp[i - 1]![j - 1]!
        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: j,
          dependentCells: [[i - 1, j - 1]],
          highlightPath: [],
          description: `Characters MATCH '${text1[i - 1]}' === '${text2[j - 1]}'. Diagonal increment: 1 + dp[${i - 1}][${j - 1}] = ${dp[i]![j]}`,
          formula: `dp[${i}][${j}] = 1 + dp[${i - 1}][${j - 1}] = ${dp[i]![j]}`,
        }
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: j,
          dependentCells: [
            [i - 1, j],
            [i, j - 1],
          ],
          highlightPath: [],
          description: `Characters mismatch ('${text1[i - 1]}' != '${text2[j - 1]}'). Max of Top (${dp[i - 1]![j]}) and Left (${dp[i]![j - 1]}) = ${dp[i]![j]}`,
          formula: `dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = ${dp[i]![j]}`,
        }
      }
    }
  }

  // Backtrack LCS path
  const lcsPath: [number, number][] = []
  let r = m
  let c = n
  let lcsString = ''
  while (r > 0 && c > 0) {
    if (text1[r - 1] === text2[c - 1]) {
      lcsPath.push([r, c])
      lcsString = text1[r - 1] + lcsString
      r--
      c--
    } else if (dp[r - 1]![c]! >= dp[r]![c - 1]!) {
      r--
    } else {
      c--
    }
  }

  yield {
    dp: dp.map(row => [...row]),
    currentRow: m,
    currentCol: n,
    dependentCells: [],
    highlightPath: lcsPath,
    description: `LCS Computation Complete! Length = ${dp[m]![n]}, Sequence = "${lcsString}"`,
    formula: `LCS("${text1}", "${text2}") = "${lcsString}" (Length: ${dp[m]![n]})`,
  }
}

// ─── EDIT DISTANCE (LEVENSHTEIN) GENERATOR ───────────────────────────
export function* generateEditDistance(word1: string, word2: string): Generator<DPTableFrame> {
  const m = word1.length
  const n = word2.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j

  yield {
    dp: dp.map(row => [...row]),
    currentRow: 0,
    currentCol: 0,
    dependentCells: [],
    highlightPath: [],
    description: `Initialized Edit Distance table for "${word1}" -> "${word2}". Base cases: converting empty string requires insertions/deletions.`,
    formula: 'dp[i][0] = i, dp[0][j] = j',
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: j,
          dependentCells: [[i - 1, j - 1]],
          highlightPath: [],
          description: `Characters match '${word1[i - 1]}'. No edit operation needed. Inherited diagonal value: ${dp[i]![j]}`,
          formula: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[i]![j]}`,
        }
      } else {
        const insertOp = dp[i]![j - 1]!
        const deleteOp = dp[i - 1]![j]!
        const replaceOp = dp[i - 1]![j - 1]!
        dp[i]![j] = 1 + Math.min(insertOp, deleteOp, replaceOp)

        yield {
          dp: dp.map(row => [...row]),
          currentRow: i,
          currentCol: j,
          dependentCells: [
            [i, j - 1],
            [i - 1, j],
            [i - 1, j - 1],
          ],
          highlightPath: [],
          description: `Characters mismatch ('${word1[i - 1]}' != '${word2[j - 1]}'). 1 + min(Insert[${insertOp}], Delete[${deleteOp}], Replace[${replaceOp}]) = ${dp[i]![j]}`,
          formula: `dp[${i}][${j}] = 1 + min(${insertOp}, ${deleteOp}, ${replaceOp}) = ${dp[i]![j]}`,
        }
      }
    }
  }

  // Backtrack edit operations path
  const editPath: [number, number][] = []
  let r = m
  let c = n
  while (r > 0 || c > 0) {
    editPath.push([r, c])
    if (r > 0 && c > 0 && word1[r - 1] === word2[c - 1]) {
      r--
      c--
    } else if (r > 0 && c > 0 && dp[r]![c] === 1 + dp[r - 1]![c - 1]!) {
      r--
      c--
    } else if (r > 0 && dp[r]![c] === 1 + dp[r - 1]![c]!) {
      r--
    } else if (c > 0) {
      c--
    } else {
      break
    }
  }

  yield {
    dp: dp.map(row => [...row]),
    currentRow: m,
    currentCol: n,
    dependentCells: [],
    highlightPath: editPath,
    description: `Minimum Edit Distance = ${dp[m]![n]} operations to convert "${word1}" to "${word2}".`,
    formula: `Result: EditDistance("${word1}", "${word2}") = ${dp[m]![n]}`,
  }
}
