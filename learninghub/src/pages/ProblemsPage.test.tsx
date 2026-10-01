import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import ProblemsPage from './ProblemsPage'
import { problemService } from '../services/problemService'

vi.mock('../services/problemService', () => ({
  problemService: {
    getDsaStats: vi.fn(),
    getProblems: vi.fn(),
  },
}))

describe('ProblemsPage Component', () => {
  const mockStats = {
    solved_problems: 42,
    total_problems: 150,
    easy_solved: 20,
    total_easy: 50,
    medium_solved: 18,
    total_medium: 70,
    hard_solved: 4,
    total_hard: 30,
    acceptance_rate: 68.5,
    current_streak: 12,
    longest_streak: 20,
    rank: 145,
    attempted_problems: 60,
    submissions_count: 120,
  }

  const mockProblems = [
    {
      id: 'prob-1',
      title: 'Two Sum',
      slug: 'two-sum',
      description:
        'Given an array of integers, return indices of the two numbers such that they add up to target.',
      difficulty: 'EASY',
      points: 10,
      tags: [
        { id: 't-1', name: 'Array' },
        { id: 't-2', name: 'Hash Table' },
      ],
      acceptance_rate: 49.5,
      total_submissions: 1000,
      user_status: 'SOLVED',
    },
    {
      id: 'prob-2',
      title: 'LRU Cache',
      slug: 'lru-cache',
      description:
        'Design a data structure that follows the constraints of a Least Recently Used cache.',
      difficulty: 'HARD',
      points: 30,
      tags: [
        { id: 't-3', name: 'Design' },
        { id: 't-4', name: 'Linked List' },
      ],
      acceptance_rate: 42.1,
      total_submissions: 800,
      user_status: 'UNATTEMPTED',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(problemService.getDsaStats).mockResolvedValue({
      data: mockStats as any,
      status: 'success',
    } as any)
    vi.mocked(problemService.getProblems).mockResolvedValue({
      data: mockProblems as any,
      status: 'success',
    } as any)
  })

  it('renders stats, header, problem list, and filters', async () => {
    render(<ProblemsPage />)

    expect(await screen.findByText('DSA Practice', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(await screen.findByText('Two Sum', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(await screen.findByText('LRU Cache', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(await screen.findByText('42', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText(/Problems Solved/i)).toBeInTheDocument()
  })

  it('filters problems by search query input', async () => {
    render(<ProblemsPage />)

    expect(await screen.findByText('Two Sum')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Filter by title or tags...')
    fireEvent.change(searchInput, { target: { value: 'LRU' } })

    await waitFor(() => {
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
      expect(screen.getByText('LRU Cache')).toBeInTheDocument()
    })
  })

  it('filters problems by difficulty select', async () => {
    render(<ProblemsPage />)

    expect(await screen.findByText('Two Sum')).toBeInTheDocument()

    const selectBoxes = screen.getAllByRole('combobox')
    fireEvent.change(selectBoxes[0], { target: { value: 'HARD' } })

    await waitFor(() => {
      expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
      expect(screen.getByText('LRU Cache')).toBeInTheDocument()
    })
  })
})
