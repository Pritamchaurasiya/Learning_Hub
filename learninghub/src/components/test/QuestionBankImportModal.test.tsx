import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuestionBankImportModal } from './QuestionBankImportModal'
import { questionBankService } from '../../services/questionBankService'

// Mock questionBankService
vi.mock('../../services/questionBankService', () => ({
  questionBankService: {
    importQuestions: vi.fn(),
  },
}))

// Mock MathRenderer to simple span
vi.mock('../MathRenderer', () => ({
  MathRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}))

describe('QuestionBankImportModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <QuestionBankImportModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders header, tabs, and upload area when open', () => {
    render(<QuestionBankImportModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText(/Bulk Ingest Questions/i)).toBeInTheDocument()
    expect(screen.getByText(/File Upload \(CSV\/JSON\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Direct Paste/i)).toBeInTheDocument()
    expect(screen.getByText(/Templates & Spec/i)).toBeInTheDocument()
    expect(screen.getByText(/Drop your CSV or JSON file here/i)).toBeInTheDocument()
  })

  it('switches to Direct Paste tab, parses valid CSV text, and displays preview', async () => {
    render(<QuestionBankImportModal isOpen={true} onClose={vi.fn()} />)

    // Switch to Direct Paste tab
    fireEvent.click(screen.getByText(/Direct Paste/i))

    const textarea = screen.getByPlaceholderText(/Question,Type,OptionA/i)
    const validCSV = [
      'Question,Type,Difficulty,BloomLevel,Points,OptionA,OptionB,OptionC,OptionD,CorrectOption,Explanation,Tags',
      '"What is $2+2$?",MCQ,1.0,REMEMBER,10,3,4,5,6,B,"Basic arithmetic","math"',
    ].join('\n')

    fireEvent.change(textarea, { target: { value: validCSV } })

    const parseBtn = screen.getByRole('button', { name: /Parse & Validate/i })
    fireEvent.click(parseBtn)

    await waitFor(() => {
      expect(screen.getByText(/Valid Questions/i)).toBeInTheDocument()
      expect(screen.getAllByText(/What is/i)).toHaveLength(1)
      expect(screen.getByText(/Avg Difficulty/i)).toBeInTheDocument()
    })
  })

  it('displays parsing errors if invalid CSV is provided in Direct Paste', async () => {
    render(<QuestionBankImportModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText(/Direct Paste/i))
    const textarea = screen.getByPlaceholderText(/Question,Type,OptionA/i)

    // CSV with missing correct answer
    const invalidCSV = 'Question,Type,OptionA,OptionB,CorrectOption\n"Broken?",MCQ,A,B,Z'
    fireEvent.change(textarea, { target: { value: invalidCSV } })

    const parseBtn = screen.getByRole('button', { name: /Parse & Validate/i })
    fireEvent.click(parseBtn)

    await waitFor(() => {
      expect(screen.getByText(/Found 1 Issue\(s\) during parsing/i)).toBeInTheDocument()
    })
  })

  it('executes import and displays confirmation when valid questions are submitted', async () => {
    const mockImportResult = {
      totalProcessed: 1,
      importedCount: 1,
      skippedDuplicates: 0,
      errorCount: 0,
      errors: [],
      importedQuestionIds: ['q-101'],
    }
    vi.mocked(questionBankService.importQuestions).mockResolvedValueOnce(mockImportResult)

    const onImportCompleteMock = vi.fn()
    render(
      <QuestionBankImportModal
        isOpen={true}
        onClose={vi.fn()}
        onImportComplete={onImportCompleteMock}
      />
    )

    fireEvent.click(screen.getByText(/Direct Paste/i))
    const textarea = screen.getByPlaceholderText(/Question,Type,OptionA/i)
    const validCSV = [
      'Question,Type,OptionA,OptionB,CorrectOption',
      '"Capital of France?",MCQ,Paris,London,A',
    ].join('\n')

    fireEvent.change(textarea, { target: { value: validCSV } })
    fireEvent.click(screen.getByRole('button', { name: /Parse & Validate/i }))

    await waitFor(() => {
      expect(screen.getByText(/Import 1 Questions/i)).toBeInTheDocument()
    })

    const importBtn = screen.getByText(/Import 1 Questions/i)
    fireEvent.click(importBtn)

    await waitFor(() => {
      expect(questionBankService.importQuestions).toHaveBeenCalledTimes(1)
      expect(onImportCompleteMock).toHaveBeenCalledWith(mockImportResult)
      expect(screen.getByText(/Ingestion Completed Successfully/i)).toBeInTheDocument()
    })
  })
})
