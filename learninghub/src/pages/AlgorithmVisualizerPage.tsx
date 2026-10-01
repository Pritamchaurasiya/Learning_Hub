import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Network,
  GitFork,
  Cpu,
  BarChart3,
  Code2,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  SORTING_ALGORITHMS,
  generateBubbleSort,
  generateSelectionSort,
  generateInsertionSort,
  generateQuickSort,
  generateMergeSort,
  type SortFrame,
} from '../dsa/sortingAlgorithms'
import {
  generateDijkstra,
  generateAStar,
  generateBFS,
  type NodeType,
  type PathfindingFrame,
} from '../dsa/pathfindingAlgorithms'
import { TreeEngine, type TreeNodeVisual } from '../dsa/treeAlgorithms'
import {
  generateKnapsackDP,
  generateLCS,
  generateEditDistance,
  type DPTableFrame,
  type KnapsackItem,
} from '../dsa'
import {
  DataStructureEngines,
  type StackItem,
  type QueueItem,
  type LinkedListNodeVisual,
} from '../dsa/dataStructureEngines'

// ── Web Audio Pitch Synthesizer ──────────────────────────────────────
class SoundSynth {
  private static ctx: AudioContext | null = null
  public static isMuted = true

  private static getContext(): AudioContext | null {
    if (!SoundSynth.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        SoundSynth.ctx = new AudioCtx()
      }
    }
    if (SoundSynth.ctx && SoundSynth.ctx.state === 'suspended') {
      SoundSynth.ctx.resume().catch(() => {})
    }
    return SoundSynth.ctx
  }

  public static playNote(val: number, maxVal = 100): void {
    if (SoundSynth.isMuted) return
    try {
      const ctx = SoundSynth.getContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const freq = 120 + (val / maxVal) * 600
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch {
      // Audio context policy fallback
    }
  }
}

type TabMode = 'sorting' | 'pathfinding' | 'trees' | 'dp' | 'structures'

export default function AlgorithmVisualizerPage() {
  useDocumentTitle('Interactive DSA Visualizer Studio')

  const [activeTab, setActiveTab] = useState<TabMode>('sorting')
  const [soundEnabled, setSoundEnabled] = useState(false)

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    SoundSynth.isMuted = !next
  }

  return (
    <AnimatedPage>
      <SEO
        title="Interactive Algorithm & Data Structure Visualizer Studio"
        description="Visualize sorting algorithms, graph pathfinding, binary trees, dynamic programming, and data structures in real time with step-by-step playback."
      />

      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Title & Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Algorithm & DSA Visualizer Studio
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Explore time complexities, trace execution frames, and inspect algorithmic state
              transitions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={soundEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={toggleSound}
              className="gap-2"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
              <span>Audio {soundEnabled ? 'On' : 'Muted'}</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800">
          {[
            { id: 'sorting', label: 'Sorting Algorithms', icon: BarChart3 },
            { id: 'pathfinding', label: 'Graph & Pathfinding', icon: Network },
            { id: 'trees', label: 'Trees & AVL Balancing', icon: GitFork },
            { id: 'dp', label: 'Dynamic Programming', icon: Cpu },
            { id: 'structures', label: 'Data Structures', icon: Layers },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabMode)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md shadow-black/5 dark:shadow-none'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Active Tab View */}
        <AnimatePresence mode="wait">
          {activeTab === 'sorting' && <SortingVisualizerSection key="sorting" />}
          {activeTab === 'pathfinding' && <PathfindingVisualizerSection key="pathfinding" />}
          {activeTab === 'trees' && <TreeVisualizerSection key="trees" />}
          {activeTab === 'dp' && <DPVisualizerSection key="dp" />}
          {activeTab === 'structures' && <DataStructuresSection key="structures" />}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 1. SORTING VISUALIZER SECTION
// ════════════════════════════════════════════════════════════════════════
function SortingVisualizerSection() {
  const [algorithm, setAlgorithm] = useState<string>('quick')
  const [arraySize, setArraySize] = useState<number>(24)
  const [speed, setSpeed] = useState<number>(50)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [distribution, setDistribution] = useState<
    'random' | 'reversed' | 'nearly_sorted' | 'few_unique'
  >('random')

  const [frames, setFrames] = useState<SortFrame[]>([])
  const [frameIndex, setFrameIndex] = useState<number>(0)
  const [baseArray, setBaseArray] = useState<number[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const generateNewArray = useCallback(
    (dist: 'random' | 'reversed' | 'nearly_sorted' | 'few_unique' = distribution) => {
      setIsPlaying(false)
      const newArr: number[] = []

      if (dist === 'reversed') {
        const step = 80 / Math.max(1, arraySize - 1)
        for (let i = 0; i < arraySize; i++) {
          newArr.push(Math.round(90 - i * step))
        }
      } else if (dist === 'nearly_sorted') {
        const step = 80 / Math.max(1, arraySize - 1)
        for (let i = 0; i < arraySize; i++) {
          newArr.push(Math.round(15 + i * step))
        }
        // Swap 2 random pairs to make it nearly sorted
        for (let s = 0; s < 2; s++) {
          const idx1 = Math.floor(Math.random() * (arraySize - 2))
          const idx2 = idx1 + 1
          const temp = newArr[idx1]!
          newArr[idx1] = newArr[idx2]!
          newArr[idx2] = temp
        }
      } else if (dist === 'few_unique') {
        const uniqueVals = [20, 45, 70, 90]
        for (let i = 0; i < arraySize; i++) {
          newArr.push(uniqueVals[Math.floor(Math.random() * uniqueVals.length)]!)
        }
      } else {
        for (let i = 0; i < arraySize; i++) {
          newArr.push(Math.floor(Math.random() * 85) + 10)
        }
      }

      setBaseArray(newArr)

      let gen: Generator<SortFrame>
      switch (algorithm) {
        case 'bubble':
          gen = generateBubbleSort(newArr)
          break
        case 'selection':
          gen = generateSelectionSort(newArr)
          break
        case 'insertion':
          gen = generateInsertionSort(newArr)
          break
        case 'quick':
          gen = generateQuickSort(newArr)
          break
        case 'merge':
        default:
          gen = generateMergeSort(newArr)
          break
      }

      const collected: SortFrame[] = []
      for (const frame of gen) {
        collected.push(frame)
      }
      setFrames(collected)
      setFrameIndex(0)
    },
    [arraySize, algorithm, distribution]
  )

  useEffect(() => {
    generateNewArray()
  }, [generateNewArray])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setFrameIndex(prev => {
          if (prev < frames.length - 1) {
            const nextIdx = prev + 1
            const currFrame = frames[nextIdx]
            if (currFrame?.comparing.length) {
              SoundSynth.playNote(currFrame.array[currFrame.comparing[0]!] ?? 50)
            }
            return nextIdx
          } else {
            setIsPlaying(false)
            return prev
          }
        })
      }, speed)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, frames, speed])

  const currentFrame = frames[frameIndex] ?? {
    array: baseArray,
    comparing: [],
    swapping: [],
    sorted: [],
    pivot: null,
    codeLine: 0,
    description: 'Ready',
    comparisons: 0,
    swaps: 0,
  }

  const algoInfo = SORTING_ALGORITHMS[algorithm] ?? SORTING_ALGORITHMS['quick']!

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(SORTING_ALGORITHMS).map(a => (
              <Button
                key={a.id}
                variant={algorithm === a.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setAlgorithm(a.id)}
                className="font-bold text-xs"
              >
                {a.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateNewArray(distribution)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false)
                setFrameIndex(0)
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white min-w-[90px]"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Start'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={frameIndex <= 0}
              onClick={() => {
                setIsPlaying(false)
                setFrameIndex(p => Math.max(0, p - 1))
              }}
              className="p-2"
              title="Step backward 1 frame"
              aria-label="Step backward 1 frame"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={frameIndex >= frames.length - 1}
              onClick={() => {
                setIsPlaying(false)
                setFrameIndex(p => Math.min(frames.length - 1, p + 1))
              }}
              className="p-2"
              title="Step forward 1 frame"
              aria-label="Step forward 1 frame"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Array Distribution Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/80 text-xs">
          <span className="font-bold text-gray-500 mr-1">Initial Order:</span>
          {[
            { id: 'random', label: 'Random' },
            { id: 'reversed', label: 'Reversed (Worst-case)' },
            { id: 'nearly_sorted', label: 'Nearly Sorted' },
            { id: 'few_unique', label: 'Few Unique (Duplicates)' },
          ].map(d => (
            <button
              key={d.id}
              onClick={() => {
                const nextDist = d.id as typeof distribution
                setDistribution(nextDist)
                generateNewArray(nextDist)
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                distribution === d.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-500 w-24">Speed ({speed}ms):</span>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-500 w-24">Size ({arraySize}):</span>
            <input
              type="range"
              min="10"
              max="50"
              step="2"
              value={arraySize}
              onChange={e => setArraySize(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-gray-950 text-white border-gray-800 shadow-xl flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500" /> Default
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-400 animate-pulse" /> Comparing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" /> Swapping
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-400" /> Sorted
              </span>
            </div>
            <span className="font-mono text-gray-500">
              Frame {frameIndex + 1}/{frames.length}
            </span>
          </div>

          <div className="flex items-end justify-center gap-1.5 h-64 w-full px-2">
            {currentFrame.array.map((val, idx) => {
              const isComparing =
                currentFrame.comparing.length > 0 &&
                (currentFrame.comparing[0] === idx || currentFrame.comparing[1] === idx)
              const isSwapping =
                currentFrame.swapping.length > 0 &&
                (currentFrame.swapping[0] === idx || currentFrame.swapping[1] === idx)
              const isSorted = currentFrame.sorted.includes(idx)
              const isPivot = currentFrame.pivot === idx

              let bgClass = 'bg-indigo-500/80 hover:bg-indigo-400'
              if (isPivot) bgClass = 'bg-purple-500 shadow-lg shadow-purple-500/50'
              if (isComparing) bgClass = 'bg-amber-400 shadow-lg shadow-amber-400/50'
              if (isSwapping) bgClass = 'bg-rose-500 shadow-lg shadow-rose-500/50'
              if (isSorted) bgClass = 'bg-emerald-400 shadow-md shadow-emerald-400/30'

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full transition-all duration-75"
                >
                  <div
                    style={{ height: `${val}%` }}
                    className={`w-full rounded-t-md transition-all duration-75 ${bgClass}`}
                  />
                  {arraySize <= 30 && (
                    <span className="text-[9px] font-mono text-gray-400 mt-1">{val}</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800 space-y-2 text-xs font-mono text-gray-300">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-sans font-bold uppercase tracking-wider shrink-0">
                Timeline Scrub:
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(0, frames.length - 1)}
                value={frameIndex}
                onChange={e => {
                  setIsPlaying(false)
                  setFrameIndex(Number(e.target.value))
                }}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                aria-label="Scrub algorithm animation frames"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-indigo-400">{currentFrame.description}</span>
              <div className="flex gap-4 text-gray-400">
                <span>
                  Comparisons: <strong className="text-white">{currentFrame.comparisons}</strong>
                </span>
                <span>
                  Swaps: <strong className="text-white">{currentFrame.swaps}</strong>
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-black tracking-tight text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-500" />
              {algoInfo.name} Complexity
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-gray-400 block font-medium">Best Time</span>
                <span className="font-mono font-bold text-emerald-500">
                  {algoInfo.timeComplexityBest}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-gray-400 block font-medium">Average Time</span>
                <span className="font-mono font-bold text-amber-500">
                  {algoInfo.timeComplexityAvg}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-gray-400 block font-medium">Worst Time</span>
                <span className="font-mono font-bold text-rose-500">
                  {algoInfo.timeComplexityWorst}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-gray-400 block font-medium">Space Complexity</span>
                <span className="font-mono font-bold text-indigo-500">
                  {algoInfo.spaceComplexity}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
              {algoInfo.description}
            </p>
          </Card>

          <Card className="p-4 bg-gray-950 text-white border-gray-800 font-mono text-xs overflow-x-auto">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mb-2">
              Pseudocode Tracing
            </div>
            <div className="space-y-1">
              {algoInfo.pseudocode.map((line, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-0.5 rounded ${
                    currentFrame.codeLine === idx
                      ? 'bg-indigo-600/50 text-amber-300 font-bold border-l-2 border-amber-400'
                      : 'text-gray-400'
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 2. PATHFINDING VISUALIZER SECTION
// ════════════════════════════════════════════════════════════════════════
const GRID_ROWS = 15
const GRID_COLS = 28

function PathfindingVisualizerSection() {
  const [algo, setAlgo] = useState<'dijkstra' | 'astar' | 'bfs'>('astar')
  const startPos: [number, number] = [7, 4]
  const targetPos: [number, number] = [7, 23]
  const [grid, setGrid] = useState<NodeType[][]>(() =>
    Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('empty'))
  )
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [drawMode, setDrawMode] = useState<'wall' | 'weight' | 'erase'>('wall')
  const [frames, setFrames] = useState<PathfindingFrame[]>([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const clearPathOnly = useCallback(() => {
    setIsPlaying(false)
    setGrid(prev =>
      prev.map(row => row.map(cell => (cell === 'visited' || cell === 'path' ? 'empty' : cell)))
    )
    setFrames([])
    setFrameIndex(0)
  }, [])

  const clearBoard = () => {
    setIsPlaying(false)
    setGrid(Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('empty')))
    setFrames([])
    setFrameIndex(0)
  }

  const generateMaze = () => {
    clearBoard()
    const newGrid: NodeType[][] = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill('empty')
    )
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (
          !(r === startPos[0] && c === startPos[1]) &&
          !(r === targetPos[0] && c === targetPos[1])
        ) {
          if (Math.random() < 0.28) {
            newGrid[r]![c] = 'wall'
          }
        }
      }
    }
    setGrid(newGrid)
  }

  const startPathfinding = () => {
    clearPathOnly()
    let gen: Generator<PathfindingFrame>
    if (algo === 'dijkstra') {
      gen = generateDijkstra(grid, startPos, targetPos)
    } else if (algo === 'astar') {
      gen = generateAStar(grid, startPos, targetPos)
    } else {
      gen = generateBFS(grid, startPos, targetPos)
    }

    const collected: PathfindingFrame[] = []
    for (const f of gen) {
      collected.push(f)
    }
    setFrames(collected)
    setFrameIndex(0)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setFrameIndex(prev => {
          if (prev < frames.length - 1) {
            return prev + 1
          } else {
            setIsPlaying(false)
            return prev
          }
        })
      }, 25)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, frames])

  const handleCellInteraction = (r: number, c: number) => {
    if ((r === startPos[0] && c === startPos[1]) || (r === targetPos[0] && c === targetPos[1])) {
      return
    }
    setGrid(prev => {
      const next = prev.map(row => [...row])
      if (drawMode === 'wall') next[r]![c] = next[r]![c] === 'wall' ? 'empty' : 'wall'
      else if (drawMode === 'weight') next[r]![c] = next[r]![c] === 'weight' ? 'empty' : 'weight'
      else next[r]![c] = 'empty'
      return next
    })
  }

  const currentDisplayGrid = frames[frameIndex]?.grid ?? grid
  const currentFrameInfo = frames[frameIndex]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'astar', name: 'A* Search (Heuristic)' },
              { id: 'dijkstra', name: "Dijkstra's Algorithm" },
              { id: 'bfs', name: 'BFS (Breadth-First)' },
            ].map(a => (
              <Button
                key={a.id}
                variant={algo === a.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setAlgo(a.id as 'dijkstra' | 'astar' | 'bfs')
                  clearPathOnly()
                }}
                className="text-xs font-bold"
              >
                {a.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={drawMode === 'wall' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDrawMode('wall')}
              className="text-xs"
            >
              🧱 Walls
            </Button>
            <Button
              variant={drawMode === 'weight' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDrawMode('weight')}
              className="text-xs"
            >
              ⚖️ Weights (5x)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateMaze}
              className="text-xs font-semibold"
            >
              🎲 Random Maze
            </Button>
            <Button variant="outline" size="sm" onClick={clearBoard} className="text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startPathfinding}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              Visualize Path
            </Button>
          </div>
        </div>
      </Card>

      <Card
        className="p-4 bg-gray-950 border-gray-800 shadow-xl overflow-x-auto select-none"
        onMouseDown={() => setIsMouseDown(true)}
        onMouseUp={() => setIsMouseDown(false)}
        onMouseLeave={() => setIsMouseDown(false)}
      >
        <div className="flex flex-col gap-1 min-w-[720px] items-center">
          {currentDisplayGrid.map((row, r) => (
            <div key={r} className="flex gap-1">
              {row.map((cellType, c) => {
                const isStart = r === startPos[0] && c === startPos[1]
                const isTarget = r === targetPos[0] && c === targetPos[1]

                let cellBg = 'bg-gray-900 border border-gray-800/80 hover:bg-gray-800'
                if (cellType === 'wall') cellBg = 'bg-gray-400 border-gray-500'
                if (cellType === 'weight') cellBg = 'bg-amber-800/80 border-amber-600'
                if (cellType === 'visited') cellBg = 'bg-indigo-600/70 animate-in fade-in'
                if (cellType === 'path') cellBg = 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                if (isStart)
                  cellBg = 'bg-emerald-500 shadow-lg shadow-emerald-500/80 ring-2 ring-white'
                if (isTarget) cellBg = 'bg-rose-500 shadow-lg shadow-rose-500/80 ring-2 ring-white'

                return (
                  <div
                    key={c}
                    onMouseDown={() => handleCellInteraction(r, c)}
                    onMouseEnter={() => isMouseDown && handleCellInteraction(r, c)}
                    className={`w-6 h-6 rounded-sm cursor-pointer transition-colors duration-100 flex items-center justify-center text-[10px] ${cellBg}`}
                  >
                    {isStart && '🚩'}
                    {isTarget && '🎯'}
                    {cellType === 'weight' && !isStart && !isTarget && '⚖️'}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-300 font-mono">
          <span>
            {currentFrameInfo?.description ??
              'Click grid cells to draw walls/weights, then click "Visualize Path"'}
          </span>
          {currentFrameInfo && (
            <div className="flex gap-4 text-gray-400">
              <span>
                Visited: <strong className="text-white">{currentFrameInfo.visitedCount}</strong>
              </span>
              <span>
                Path:{' '}
                <strong className="text-emerald-400">{currentFrameInfo.pathLength} nodes</strong>
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 3. TREE & AVL VISUALIZER SECTION
// ════════════════════════════════════════════════════════════════════════
function TreeVisualizerSection() {
  const [treeMode, setTreeMode] = useState<'BST' | 'AVL'>('AVL')
  const [root, setRoot] = useState<TreeNodeVisual | null>(() => {
    let t: TreeNodeVisual | null = null
    const initial = [50, 30, 70, 20, 40, 60, 80]
    for (const val of initial) {
      t = TreeEngine.insertAVL(t, val)
    }
    return TreeEngine.calculateLayout(t)
  })
  const [inputValue, setInputValue] = useState<string>('')
  const [traversalResult, setTraversalResult] = useState<number[]>([])
  const [traversalName, setTraversalName] = useState<string>('')

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(inputValue.trim(), 10)
    if (isNaN(val)) return

    let updated: TreeNodeVisual
    if (treeMode === 'AVL') {
      updated = TreeEngine.insertAVL(root, val)
    } else {
      updated = TreeEngine.insertBST(root, val)
    }
    setRoot(TreeEngine.calculateLayout(updated))
    setInputValue('')
  }

  const runTraversal = (type: 'in' | 'pre' | 'post' | 'level') => {
    if (type === 'in') {
      setTraversalName('In-Order (Left, Root, Right)')
      setTraversalResult(TreeEngine.inOrder(root))
    } else if (type === 'pre') {
      setTraversalName('Pre-Order (Root, Left, Right)')
      setTraversalResult(TreeEngine.preOrder(root))
    } else if (type === 'post') {
      setTraversalName('Post-Order (Left, Right, Root)')
      setTraversalResult(TreeEngine.postOrder(root))
    } else {
      setTraversalName('Level-Order (Breadth-First BFS)')
      setTraversalResult(TreeEngine.levelOrder(root))
    }
  }

  const renderTreeElements = (node: TreeNodeVisual | null): React.ReactNode[] => {
    if (!node) return []
    const elements: React.ReactNode[] = []

    if (node.left) {
      elements.push(
        <line
          key={`link-${node.id}-${node.left.id}`}
          x1={node.x}
          y1={node.y}
          x2={node.left.x}
          y2={node.left.y}
          stroke="#4f46e5"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )
      elements.push(...renderTreeElements(node.left))
    }

    if (node.right) {
      elements.push(
        <line
          key={`link-${node.id}-${node.right.id}`}
          x1={node.x}
          y1={node.y}
          x2={node.right.x}
          y2={node.right.y}
          stroke="#4f46e5"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )
      elements.push(...renderTreeElements(node.right))
    }

    elements.push(
      <g key={`node-${node.id}`} className="transition-all duration-300">
        <circle
          cx={node.x}
          cy={node.y}
          r="22"
          className="fill-indigo-600 stroke-indigo-400 stroke-2 drop-shadow-md"
        />
        <text
          x={node.x}
          y={node.y + 5}
          textAnchor="middle"
          className="fill-white font-mono text-xs font-bold"
        >
          {node.value}
        </text>
      </g>
    )

    return elements
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={treeMode === 'AVL' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTreeMode('AVL')}
              className="text-xs font-bold"
            >
              AVL Self-Balancing Tree
            </Button>
            <Button
              variant={treeMode === 'BST' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTreeMode('BST')}
              className="text-xs font-bold"
            >
              Standard BST
            </Button>
          </div>

          <form onSubmit={handleInsert} className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Node Value (e.g. 45)"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="text-xs font-bold bg-indigo-600 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Insert
            </Button>
          </form>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runTraversal('in')}
              className="text-xs"
            >
              In-Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runTraversal('pre')}
              className="text-xs"
            >
              Pre-Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runTraversal('level')}
              className="text-xs"
            >
              Level-Order (BFS)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoot(null)}
              className="text-xs text-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gray-950 border-gray-800 shadow-xl overflow-x-auto min-h-[380px] flex flex-col items-center justify-center">
        <svg width="800" height="340" viewBox="0 0 800 340" className="w-full max-w-4xl h-auto">
          {renderTreeElements(root)}
        </svg>

        {traversalResult.length > 0 && (
          <div className="w-full mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
            <span className="text-indigo-400 font-bold">{traversalName}:</span>
            <span className="text-emerald-400 font-bold tracking-wider">
              [ {traversalResult.join(', ')} ]
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 4. DYNAMIC PROGRAMMING VISUALIZER SECTION
// ════════════════════════════════════════════════════════════════════════
function DPVisualizerSection() {
  const [dpType, setDpType] = useState<'knapsack' | 'lcs' | 'editDistance'>('knapsack')

  const [capacity] = useState(7)
  const [items] = useState<KnapsackItem[]>([
    { id: 1, name: 'Gem', weight: 2, value: 10 },
    { id: 2, name: 'Artifact', weight: 3, value: 15 },
    { id: 3, name: 'Book', weight: 4, value: 20 },
    { id: 4, name: 'Relic', weight: 5, value: 25 },
  ])

  const str1 = 'ALGORITHM'
  const str2 = 'LOGARITHM'

  const [frames, setFrames] = useState<DPTableFrame[]>([])
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const generateFrames = useCallback(() => {
    setIsPlaying(false)
    let gen: Generator<DPTableFrame>
    if (dpType === 'knapsack') {
      gen = generateKnapsackDP(items, capacity)
    } else if (dpType === 'lcs') {
      gen = generateLCS(str1, str2)
    } else {
      gen = generateEditDistance('HORSE', 'ROS')
    }
    const collected: DPTableFrame[] = []
    for (const f of gen) collected.push(f)
    setFrames(collected)
    setFrameIndex(0)
  }, [dpType, items, capacity, str1, str2])

  useEffect(() => {
    generateFrames()
  }, [generateFrames])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setFrameIndex(prev => {
          if (prev < frames.length - 1) return prev + 1
          setIsPlaying(false)
          return prev
        })
      }, 180)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, frames])

  const currentFrame = frames[frameIndex]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={dpType === 'knapsack' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDpType('knapsack')}
              className="text-xs font-bold"
            >
              0/1 Knapsack Problem
            </Button>
            <Button
              variant={dpType === 'lcs' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDpType('lcs')}
              className="text-xs font-bold"
            >
              Longest Common Subsequence (LCS)
            </Button>
            <Button
              variant={dpType === 'editDistance' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDpType('editDistance')}
              className="text-xs font-bold"
            >
              Edit Distance (Levenshtein)
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false)
                setFrameIndex(0)
              }}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-xs font-bold bg-indigo-600 text-white"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1" />
              )}
              {isPlaying ? 'Pause' : 'Solve Step-by-Step'}
            </Button>
          </div>
        </div>
      </Card>

      {currentFrame && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gray-950 border-gray-800 text-white shadow-xl overflow-x-auto">
            <div className="mb-4 text-xs font-mono text-indigo-400 font-bold">
              2D DP Table Matrix State ({currentFrame.dp.length} × {currentFrame.dp[0]?.length})
            </div>

            <table className="w-full border-collapse font-mono text-xs text-center">
              <tbody>
                {currentFrame.dp.map((row, r) => (
                  <tr key={r}>
                    {row.map((val, c) => {
                      const isCurrent =
                        currentFrame.currentRow === r && currentFrame.currentCol === c
                      const isDependent = currentFrame.dependentCells.some(
                        ([dr, dc]) => dr === r && dc === c
                      )
                      const isPath = currentFrame.highlightPath.some(
                        ([pr, pc]) => pr === r && pc === c
                      )

                      let bg = 'bg-gray-900 text-gray-400 border border-gray-800'
                      if (isDependent)
                        bg = 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      if (isCurrent)
                        bg =
                          'bg-indigo-600 text-white border-white font-black scale-105 shadow-lg shadow-indigo-600/50'
                      if (isPath) bg = 'bg-emerald-600 text-white border-emerald-400 font-black'

                      return (
                        <td key={c} className={`p-2.5 transition-all duration-150 ${bg}`}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-3 border-t border-gray-800 text-xs font-mono text-gray-300">
              <div>{currentFrame.description}</div>
              <div className="text-amber-400 mt-1 font-bold">{currentFrame.formula}</div>
            </div>
          </Card>

          <Card className="p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">
              DP State Formula & Recurrence
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl font-mono text-xs text-indigo-500 dark:text-indigo-400 mb-4 leading-relaxed">
              {dpType === 'knapsack'
                ? 'dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])'
                : 'dp[i][j] = (s1[i]==s2[j]) ? 1 + dp[i-1][j-1] : max(dp[i-1][j], dp[i][j-1])'}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Dynamic Programming breaks the original optimization problem into smaller overlapping
              subproblems and memoizes solutions in a 2D state matrix.
            </p>
          </Card>
        </div>
      )}
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 5. DATA STRUCTURES SANDBOX SECTION
// ════════════════════════════════════════════════════════════════════════
function DataStructuresSection() {
  const [dsType, setDsType] = useState<'stack' | 'queue' | 'linkedlist'>('stack')

  const [stack, setStack] = useState<StackItem[]>([
    { id: '1', value: 10 },
    { id: '2', value: 20 },
    { id: '3', value: 30 },
  ])
  const [stackInput, setStackInput] = useState('')

  const [queue, setQueue] = useState<QueueItem[]>([
    { id: '1', value: 'Alpha' },
    { id: '2', value: 'Beta' },
    { id: '3', value: 'Gamma' },
  ])
  const [queueInput, setQueueInput] = useState('')

  const [linkedList, setLinkedList] = useState<LinkedListNodeVisual[]>(() =>
    DataStructureEngines.createLinkedList(['Head (42)', 'Node (99)', 'Node (108)', 'Tail (256)'])
  )

  const handleStackPush = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stackInput.trim()) return
    const res = DataStructureEngines.stackPush(stack, stackInput.trim())
    setStack(res.stack)
    setStackInput('')
  }

  const handleStackPop = () => {
    const res = DataStructureEngines.stackPop(stack)
    setStack(res.stack)
  }

  const handleQueueEnqueue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!queueInput.trim()) return
    const res = DataStructureEngines.queueEnqueue(queue, queueInput.trim())
    setQueue(res.queue)
    setQueueInput('')
  }

  const handleQueueDequeue = () => {
    const res = DataStructureEngines.queueDequeue(queue)
    setQueue(res.queue)
  }

  const handleReverseLinkedList = () => {
    setLinkedList(prev => DataStructureEngines.reverseLinkedList(prev))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2">
          {[
            { id: 'stack', label: 'Stack (LIFO)' },
            { id: 'queue', label: 'Queue (FIFO)' },
            { id: 'linkedlist', label: 'Linked List' },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={dsType === tab.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setDsType(tab.id as 'stack' | 'queue' | 'linkedlist')}
              className="text-xs font-bold"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {dsType === 'stack' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gray-950 border-gray-800 text-white shadow-xl min-h-[380px] flex flex-col items-center justify-end">
            <div className="w-48 border-x-4 border-b-4 border-indigo-500 rounded-b-2xl p-3 flex flex-col-reverse gap-2 bg-gray-900/50 min-h-[260px] justify-start">
              <AnimatePresence>
                {stack.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`p-3 rounded-xl text-center font-mono font-bold text-sm shadow-md ${
                      idx === stack.length - 1
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    {item.value} {idx === stack.length - 1 && '← TOP'}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <span className="text-xs font-mono text-gray-500 mt-4">
              Stack Size: {stack.length}/8 (LIFO)
            </span>
          </Card>

          <Card className="p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">
              Stack Operations
            </h3>
            <form onSubmit={handleStackPush} className="space-y-3">
              <input
                type="text"
                placeholder="Enter value"
                value={stackInput}
                onChange={e => setStackInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="flex-1 text-xs font-bold bg-indigo-600 text-white"
                >
                  Push (O(1))
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStackPop}
                  disabled={stack.length === 0}
                  className="flex-1 text-xs font-bold text-rose-500"
                >
                  Pop (O(1))
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {dsType === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-gray-950 border-gray-800 text-white shadow-xl min-h-[380px] flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 overflow-x-auto w-full p-4 border-y-2 border-indigo-500/50 bg-gray-900/40 rounded-xl justify-center">
              <span className="text-xs font-mono text-emerald-400 font-bold mr-2">FRONT →</span>
              <AnimatePresence>
                {queue.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className={`px-4 py-3 rounded-xl font-mono text-xs font-bold whitespace-nowrap shadow-md ${
                      idx === 0 ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    {item.value}
                  </motion.div>
                ))}
              </AnimatePresence>
              <span className="text-xs font-mono text-indigo-400 font-bold ml-2">← REAR</span>
            </div>
            <span className="text-xs font-mono text-gray-500 mt-4">
              Queue Size: {queue.length}/8 (FIFO)
            </span>
          </Card>

          <Card className="p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-3">
              Queue Operations
            </h3>
            <form onSubmit={handleQueueEnqueue} className="space-y-3">
              <input
                type="text"
                placeholder="Enter value"
                value={queueInput}
                onChange={e => setQueueInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="flex-1 text-xs font-bold bg-indigo-600 text-white"
                >
                  Enqueue (O(1))
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQueueDequeue}
                  disabled={queue.length === 0}
                  className="flex-1 text-xs font-bold text-rose-500"
                >
                  Dequeue (O(1))
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {dsType === 'linkedlist' && (
        <Card className="p-6 bg-gray-950 border-gray-800 text-white shadow-xl min-h-[380px] flex flex-col items-center justify-between">
          <div className="flex items-center gap-3 overflow-x-auto w-full p-4 justify-center">
            {linkedList.map((node, idx) => (
              <div key={node.id} className="flex items-center gap-2">
                <motion.div
                  layout
                  className="p-3.5 bg-indigo-600 rounded-xl font-mono text-xs font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400"
                >
                  {node.value}
                </motion.div>
                {idx < linkedList.length - 1 && (
                  <span className="text-indigo-400 font-bold text-base">⇄</span>
                )}
                {idx === linkedList.length - 1 && (
                  <span className="text-gray-500 font-mono text-xs">→ NULL</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={handleReverseLinkedList}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              🔄 Reverse Linked List In-Place (O(N))
            </Button>
          </div>
        </Card>
      )}
    </motion.div>
  )
}
