import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { Routes, Route } from 'react-router-dom'
import ProblemWorkspacePage from './ProblemWorkspacePage'

vi.mock('../services/problemService', () => ({
  problemService: {
    getProblem: vi.fn().mockResolvedValue({
      data: {
        id: 'prob-1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        description: '<p>Given an array of integers, return indices of the two numbers such that they add up to a target.</p>',
        category: 'Arrays & Hashing',
        starter_code: {
          javascript: 'function twoSum(nums, target) {\n  // your code\n}',
        },
        sample_cases: [
          { input: '[2,7,11,15], 9', output: '[0,1]' },
        ],
      },
    }),
    runCode: vi.fn().mockResolvedValue({
      data: {
        status: 'ACCEPTED',
        passed_tests: 1,
        total_tests: 1,
        execution_time_ms: 15,
        memory_kb: 4500,
        feedback: 'Sample test case passed!',
      },
    }),
    submitSolution: vi.fn().mockResolvedValue({
      data: {
        status: 'ACCEPTED',
        passed_tests: 10,
        total_tests: 10,
        execution_time_ms: 45,
        memory_kb: 12000,
        feedback: 'All test cases passed cleanly!',
      },
    }),
  },
}))

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="codemirror-mock"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  ),
}))

vi.mock('../services/wasm/WasmSandboxService', () => ({
  wasmSandboxService: {
    supportsWasm: vi.fn().mockReturnValue(true),
    execute: vi.fn().mockResolvedValue({
      status: 'ACCEPTED',
      passedTests: 1,
      totalTests: 1,
      totalExecutionTimeMs: 1,
      peakMemoryKb: 120,
      engine: 'QuickJS WASM',
      overallPassed: true,
      feedback: 'Sample test case passed!',
    }),
  },
}))

function renderWorkspace() {
  return render(
    <Routes>
      <Route path="/problem/:slug" element={<ProblemWorkspacePage />} />
    </Routes>,
    { route: '/problem/two-sum' }
  )
}

describe('ProblemWorkspacePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders problem header, description, and workspace panels', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Easy/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('allows language switching', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'python' } })
    expect(select).toHaveValue('python')
  })

  it('allows switching to C and loads C starter template', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'c' } })
    expect(select).toHaveValue('c')

    const editor = screen.getByTestId('codemirror-mock') as HTMLTextAreaElement
    expect(editor.value).toContain('#include <stdio.h>')
  })

  it('allows switching to Java, Go, and Rust with correct templates', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    const editor = screen.getByTestId('codemirror-mock') as HTMLTextAreaElement

    fireEvent.change(select, { target: { value: 'java' } })
    expect(editor.value).toContain('public class Main')

    fireEvent.change(select, { target: { value: 'go' } })
    expect(editor.value).toContain('package main')

    fireEvent.change(select, { target: { value: 'rust' } })
    expect(editor.value).toContain('fn main()')
  })

  it('triggers code execution on Run button click', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const runBtn = screen.getByRole('button', { name: /run/i })
    fireEvent.click(runBtn)

    await waitFor(() => {
      expect(
        screen.getByText(
          /Compiling and running sample tests|Run \(Sample Tests\): ACCEPTED|WebAssembly Native Sandbox|WASM Sandbox Execution Complete/i
        )
      ).toBeInTheDocument()
    })
  })

  it('opens AI Council modal when AI Council button is clicked', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const councilBtn = screen.getByRole('button', { name: /AI Council/i })
    fireEvent.click(councilBtn)

    await waitFor(() => {
      expect(screen.getByText('Multi-Agent Collaborative Tutor')).toBeInTheDocument()
      expect(screen.getByText('Council Mode (3 Agents)')).toBeInTheDocument()
    })
  })

  it('opens Pair Programming modal when Pair Program button is clicked', async () => {
    renderWorkspace()

    await waitFor(() => {
      expect(screen.getByText(/Two Sum/i)).toBeInTheDocument()
    })

    const pairBtn = screen.getByRole('button', { name: /Pair Program/i })
    fireEvent.click(pairBtn)

    await waitFor(() => {
      expect(screen.getByText('Live Collaborative DSA Session')).toBeInTheDocument()
      expect(screen.getByText('Create Collaborative Room')).toBeInTheDocument()
    })
  })
})

