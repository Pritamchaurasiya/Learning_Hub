import { fetchApi } from '../utils/api'
import type {
  CurriculumPlan,
  GenerateCurriculumInput,
} from '../types/curriculum'

export const FALLBACK_DEMO_PLAN: CurriculumPlan = {
  id: 'curr-demo-default',
  userId: 'demo-student',
  title: 'GATE Computer Science Master Curriculum (Balanced Track)',
  targetExam: 'GATE_CS',
  targetDate: new Date(Date.now() + 84 * 86400000).toISOString().split('T')[0],
  weeksRemaining: 12,
  weeklyStudyHours: 15,
  pacingMode: 'BALANCED',
  overallProgress: 28,
  estimatedReadinessScore: 74,
  bufferWeeks: 2,
  notes: 'Syllabus synthesized dynamically based on 12 weeks runway and 15 hrs/week commitment.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  modules: [
    {
      id: 'mod-w1',
      weekNumber: 1,
      title: 'Week 1: Asymptotic Complexity & Divide and Conquer',
      description: 'Master Master Theorem, recursive tree expansions, and optimal sorting partitions.',
      domain: 'Data Structures & Algorithms',
      targetHours: 15,
      actualHoursSpent: 12,
      status: 'COMPLETED',
      recommendedPracticeSlugs: ['two-sum', 'merge-intervals'],
      resourceLinks: [
        { type: 'visualizer', title: 'Interactive Sorting Visualizer', url: '/visualizer' },
        { type: 'test', title: 'Algorithms Diagnostic Sectional', url: '/tests-a' },
      ],
      concepts: [
        {
          id: 'c-1-1',
          name: 'Master Theorem for Divide-and-Conquer Recurrences',
          domain: 'Algorithms',
          targetMastery: 85,
          estimatedMinutes: 60,
          formulaLatex: 'T(n) = a T(n/b) + f(n), \\quad c_{\\text{crit}} = \\log_b a',
          isCompleted: true,
        },
        {
          id: 'c-1-2',
          name: 'QuickSort In-Place Partitioning & Pivot Invariant',
          domain: 'Algorithms',
          targetMastery: 90,
          estimatedMinutes: 75,
          codeSnippet: {
            language: 'python',
            code: 'def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    return quicksort([x for x in arr if x < pivot]) + [x for x in arr if x == pivot] + quicksort([x for x in arr if x > pivot])',
          },
          isCompleted: true,
        },
      ],
    },
    {
      id: 'mod-w2',
      weekNumber: 2,
      title: 'Week 2: Graph Theory: Shortest Paths & Minimum Spanning Trees',
      description: 'Dijkstra, Bellman-Ford, Kruskal, Prim, and cycle detection in directed graphs.',
      domain: 'Data Structures & Algorithms',
      targetHours: 15,
      actualHoursSpent: 6,
      status: 'IN_PROGRESS',
      recommendedPracticeSlugs: ['course-schedule', 'network-delay-time'],
      resourceLinks: [
        { type: 'visualizer', title: 'Graph Traversal Visualizer', url: '/visualizer' },
        { type: 'flashcard', title: 'Graph Algorithms Flashcards', url: '/revision' },
      ],
      concepts: [
        {
          id: 'c-2-1',
          name: "Dijkstra's Algorithm with Priority Queue",
          domain: 'Algorithms',
          targetMastery: 85,
          estimatedMinutes: 90,
          formulaLatex: 'd[v] = \\min(d[v], d[u] + w(u, v))',
          codeSnippet: {
            language: 'python',
            code: 'import heapq\ndef dijkstra(adj, src):\n    dist = {src: 0}\n    pq = [(0, src)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist.get(u, float("inf")): continue\n        for v, w in adj[u]:\n            if dist.get(u, 0) + w < dist.get(v, float("inf")):\n                dist[v] = dist[u] + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist',
          },
          isCompleted: false,
        },
        {
          id: 'c-2-2',
          name: 'Disjoint Set Union (DSU) with Path Compression & Union-by-Rank',
          domain: 'Data Structures',
          targetMastery: 85,
          estimatedMinutes: 70,
          formulaLatex: '\\alpha(n) \\le 4 \\implies O(\\alpha(n)) \\approx O(1)',
          isCompleted: false,
        },
      ],
    },
    {
      id: 'mod-w3',
      weekNumber: 3,
      title: 'Week 3: Operating Systems: Concurrency & Virtual Memory',
      description: 'CPU scheduling algorithms, semaphores, deadlock avoidance, and TLB page translation.',
      domain: 'Computer Systems',
      targetHours: 15,
      actualHoursSpent: 0,
      status: 'NOT_STARTED',
      recommendedPracticeSlugs: ['process-sync-quiz'],
      resourceLinks: [
        { type: 'ebook', title: 'OS Foundations Chapter 4', url: '/library?tab=ebooks' },
        { type: 'test', title: 'Operating Systems Sectional', url: '/tests-a' },
      ],
      concepts: [
        {
          id: 'c-3-1',
          name: 'Turnaround Time & Waiting Time in Round-Robin CPU Scheduling',
          domain: 'Operating Systems',
          targetMastery: 85,
          estimatedMinutes: 80,
          formulaLatex: '\\text{TAT} = \\text{Completion} - \\text{Arrival}, \\quad \\text{WT} = \\text{TAT} - \\text{Burst}',
          isCompleted: false,
        },
        {
          id: 'c-3-2',
          name: "Banker's Deadlock Avoidance Safety Invariant",
          domain: 'Operating Systems',
          targetMastery: 90,
          estimatedMinutes: 85,
          formulaLatex: '\\text{Need}[i][j] = \\text{Max}[i][j] - \\text{Allocation}[i][j] \\le \\text{Available}[j]',
          isCompleted: false,
        },
      ],
    },
  ],
}

export const curriculumService = {
  getPlan: async (): Promise<{ status: string; data: { plan: CurriculumPlan } }> => {
    try {
      return await fetchApi('/curriculum/plan')
    } catch {
      return { status: 'success', data: { plan: FALLBACK_DEMO_PLAN } }
    }
  },

  generatePlan: async (
    input: GenerateCurriculumInput
  ): Promise<{ status: string; data: { plan: CurriculumPlan } }> => {
    try {
      return await fetchApi('/curriculum/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    } catch {
      const generated: CurriculumPlan = {
        ...FALLBACK_DEMO_PLAN,
        id: `curr-${Date.now()}`,
        targetExam: input.targetExam,
        targetDate: input.targetDate,
        weeklyStudyHours: input.weeklyStudyHours,
        pacingMode: input.weeklyStudyHours >= 22 ? 'INTENSIVE' : input.weeklyStudyHours >= 12 ? 'BALANCED' : 'STEADY',
        overallProgress: 0,
      }
      return { status: 'success', data: { plan: generated } }
    }
  },

  recalibratePlan: async (
    recentAccuracyPercent: number,
    weeklyStudyHoursActual?: number
  ): Promise<{ status: string; data: { plan: CurriculumPlan } }> => {
    try {
      return await fetchApi('/curriculum/recalibrate', {
        method: 'POST',
        body: JSON.stringify({ recentAccuracyPercent, weeklyStudyHoursActual }),
      })
    } catch {
      const delta = (recentAccuracyPercent - 65) * 0.25
      const updated: CurriculumPlan = {
        ...FALLBACK_DEMO_PLAN,
        estimatedReadinessScore: Math.min(
          99,
          Math.max(10, Math.round(FALLBACK_DEMO_PLAN.estimatedReadinessScore + delta))
        ),
        recalibratedAt: new Date().toISOString(),
        notes:
          recentAccuracyPercent >= 85
            ? `Recalibrated: Outstanding progress! Accuracy at ${recentAccuracyPercent}%. Pacing accelerated.`
            : `Recalibrated: Pacing alert! Recent accuracy at ${recentAccuracyPercent}%. Buffer reviews adjusted.`,
      }
      return { status: 'success', data: { plan: updated } }
    }
  },

  toggleConcept: async (
    moduleId: string,
    conceptId: string
  ): Promise<{ status: string; data: { plan: CurriculumPlan } }> => {
    try {
      return await fetchApi(`/curriculum/modules/${moduleId}/concepts/${conceptId}/toggle`, {
        method: 'POST',
      })
    } catch {
      const updatedPlan = JSON.parse(JSON.stringify(FALLBACK_DEMO_PLAN)) as CurriculumPlan
      const mod = updatedPlan.modules.find(m => m.id === moduleId)
      if (mod) {
        const c = mod.concepts.find(con => con.id === conceptId)
        if (c) c.isCompleted = !c.isCompleted
      }
      return { status: 'success', data: { plan: updatedPlan } }
    }
  },
}
