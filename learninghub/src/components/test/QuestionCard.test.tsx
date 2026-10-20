import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuestionCard } from './QuestionCard'
import { wasmSandboxService } from '../../services/wasm/WasmSandboxService'
import type { TestQuestion } from '../../services/testsAService'

vi.mock('../MathRenderer', () => ({
  MathRenderer: ({ text }: { text: string }) => <div data-testid="math-renderer">{text}</div>,
}))

describe('QuestionCard Component with WASM Sandbox Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders standard MCQ question and handles answer selection', () => {
    const onAnswer = vi.fn()
    const question: TestQuestion = {
      id: 'q-mcq',
      text: 'What is the speed of light?',
      question_type: 'mcq',
      difficulty: 0.2,
      bloom_level: 'remember',
      options: [
        { id: 'opt-1', text: '3x10^8 m/s', order: 1, is_correct: true },
        { id: 'opt-2', text: '3x10^6 m/s', order: 2, is_correct: false },
      ],
      order: 1,
      marks: 4,
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={0}
        totalQuestions={5}
        selectedAnswer={null}
        confidence="MEDIUM"
        isFlagged={false}
        onAnswer={onAnswer}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    expect(screen.getByText('What is the speed of light?')).toBeInTheDocument()
    expect(screen.getByText('3x10^8 m/s')).toBeInTheDocument()

    fireEvent.click(screen.getByText('3x10^8 m/s'))
    expect(onAnswer).toHaveBeenCalledWith('opt-1')
  })

  it('renders numerical question with number input', () => {
    const onAnswer = vi.fn()
    const question: TestQuestion = {
      id: 'q-num',
      text: 'Calculate the focal length in cm',
      question_type: 'numerical',
      difficulty: 0.4,
      bloom_level: 'apply',
      options: [],
      order: 2,
      marks: 4,
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={1}
        totalQuestions={5}
        selectedAnswer="25"
        confidence="HIGH"
        isFlagged={false}
        onAnswer={onAnswer}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Type your answer here...') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('number')
    expect(input.value).toBe('25')

    fireEvent.change(input, { target: { value: '30' } })
    expect(onAnswer).toHaveBeenCalledWith('30')
  })

  it('renders coding workbench when question_type is coding', () => {
    const onAnswer = vi.fn()
    const question: TestQuestion = {
      id: 'q-code-1',
      text: 'Write a function twoSum(nums, target) that returns indices of two numbers adding to target.',
      question_type: 'coding',
      difficulty: 0.5,
      bloom_level: 'apply',
      options: [],
      order: 3,
      marks: 10,
      language: 'python',
      starter_code: 'def twoSum(nums, target):\n    pass\n',
      test_cases: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]' }],
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={2}
        totalQuestions={5}
        selectedAnswer={null}
        confidence="HIGH"
        isFlagged={false}
        onAnswer={onAnswer}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    expect(screen.getByTestId('coding-workbench')).toBeInTheDocument()
    expect(screen.getByText('Code Solution')).toBeInTheDocument()
    expect(screen.getByText('Run Tests (WASM)')).toBeInTheDocument()
    expect(screen.getByText(/Preconfigured Sample Test Cases/)).toBeInTheDocument()
    expect(screen.getByText(/Case 1:/)).toBeInTheDocument()
  })

  it('allows switching languages and triggers onAnswer with code modifications', () => {
    const onAnswer = vi.fn()
    const question: TestQuestion = {
      id: 'q-code-2',
      text: 'Implement binary search',
      question_type: 'coding',
      difficulty: 0.6,
      bloom_level: 'apply',
      options: [],
      order: 4,
      marks: 10,
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={3}
        totalQuestions={5}
        selectedAnswer="def search(): pass"
        confidence="MEDIUM"
        isFlagged={false}
        onAnswer={onAnswer}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    const textarea = screen.getByLabelText('Code Editor') as HTMLTextAreaElement
    expect(textarea.value).toBe('def search(): pass')

    // Modify code
    fireEvent.change(textarea, { target: { value: 'def search(arr, x):\n    return 0' } })
    expect(onAnswer).toHaveBeenCalledWith('def search(arr, x):\n    return 0')

    // Switch to JS
    const jsButton = screen.getByRole('button', { name: 'JS' })
    fireEvent.click(jsButton)
    expect(jsButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('executes in-browser WebAssembly sandbox when Run Tests is clicked and displays results', async () => {
    const executeSpy = vi.spyOn(wasmSandboxService, 'execute').mockResolvedValueOnce({
      status: 'AC',
      engine: '⚡ Pyodide WASM Runtime',
      executionMode: 'wasm',
      overallPassed: true,
      passedTests: 1,
      totalTests: 1,
      totalExecutionTimeMs: 4.2,
      peakMemoryKb: 256,
      testResults: [
        {
          testCaseIndex: 1,
          passed: true,
          input: 'nums = [2,7,11,15], target = 9',
          expectedOutput: '[0, 1]',
          actualOutput: '[0, 1]',
          logs: [],
          executionTimeMs: 4.2,
          memoryKb: 256,
          status: 'AC',
        },
      ],
      rawLogs: ['Execution completed successfully in Pyodide'],
      feedback: 'All sample test cases passed!',
    })

    const question: TestQuestion = {
      id: 'q-code-run',
      text: 'Two Sum Problem',
      question_type: 'coding',
      difficulty: 0.5,
      bloom_level: 'apply',
      options: [],
      order: 0,
      marks: 10,
      starter_code: 'def twoSum(nums, target): return [0, 1]',
      test_cases: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]' }],
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={0}
        totalQuestions={1}
        selectedAnswer="def twoSum(nums, target): return [0, 1]"
        confidence="HIGH"
        isFlagged={false}
        onAnswer={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    const runButton = screen.getByText('Run Tests (WASM)')
    fireEvent.click(runButton)

    await waitFor(() => {
      expect(executeSpy).toHaveBeenCalledWith(
        'python',
        'def twoSum(nums, target): return [0, 1]',
        expect.objectContaining({
          testCases: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]' }],
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('In-Browser WebAssembly Test Results')).toBeInTheDocument()
      expect(screen.getByText('All Sample Tests Passed')).toBeInTheDocument()
    })

    // Test clearing output
    const clearButton = screen.getByText('Clear Output')
    fireEvent.click(clearButton)
    expect(screen.queryByText('In-Browser WebAssembly Test Results')).not.toBeInTheDocument()
  })

  it('supports custom test case input toggle', async () => {
    const question: TestQuestion = {
      id: 'q-custom',
      text: 'Calculate factorial',
      question_type: 'coding',
      difficulty: 0.3,
      bloom_level: 'apply',
      options: [],
      order: 0,
      marks: 5,
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={0}
        totalQuestions={1}
        selectedAnswer="def factorial(n): return 1"
        confidence="HIGH"
        isFlagged={false}
        onAnswer={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
      />
    )

    const customInputButton = screen.getByText('Custom Input')
    fireEvent.click(customInputButton)

    const customTextarea = screen.getByPlaceholderText(/nums = \[2, 7, 11, 15\]/)
    expect(customTextarea).toBeInTheDocument()
    fireEvent.change(customTextarea, { target: { value: 'n = 5' } })
    expect((customTextarea as HTMLTextAreaElement).value).toBe('n = 5')
  })

  it('disables controls when section is locked', () => {
    const question: TestQuestion = {
      id: 'q-locked',
      text: 'Locked section question',
      question_type: 'coding',
      difficulty: 0.5,
      bloom_level: 'apply',
      options: [],
      order: 0,
      marks: 10,
    }

    render(
      <QuestionCard
        question={question}
        currentIndex={0}
        totalQuestions={1}
        selectedAnswer="def locked(): pass"
        confidence="HIGH"
        isFlagged={false}
        onAnswer={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlag={vi.fn()}
        onUnflag={vi.fn()}
        isSectionLocked={true}
      />
    )

    expect(screen.getByText('Section Finalized & Locked')).toBeInTheDocument()
    const textarea = screen.getByLabelText('Code Editor')
    expect(textarea).toBeDisabled()
  })
})
