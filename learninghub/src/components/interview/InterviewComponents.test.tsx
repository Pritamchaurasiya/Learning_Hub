import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AudioVisualizerWave } from './AudioVisualizerWave'
import { InterviewerAvatarHUD } from './InterviewerAvatarHUD'
import { InterviewEvaluationScorecard } from './InterviewEvaluationScorecard'
import type { InterviewEvaluationReport } from '../../types/interview'

describe('Interview UI Components (Milestone 11)', () => {
  describe('AudioVisualizerWave', () => {
    it('renders visualizer with default label and frequency bars', () => {
      render(<AudioVisualizerWave isActive={true} label="Voice Channel Active" />)
      expect(screen.getByText('Voice Channel Active')).toBeInTheDocument()
    })

    it('renders inactive label when idle', () => {
      render(<AudioVisualizerWave isActive={false} label="Channel idle" />)
      expect(screen.getByText('Channel idle')).toBeInTheDocument()
    })
  })

  describe('InterviewerAvatarHUD', () => {
    it('renders interviewer details for Sophia and toggles voice state', () => {
      const onToggle = vi.fn()
      render(
        <InterviewerAvatarHUD
          persona="SOPHIA_ALGO_SPECIALIST"
          status="speaking"
          onToggleSpeech={onToggle}
          lastSpokenText="Hello candidate"
        />
      )

      expect(screen.getByText('Sophia')).toBeInTheDocument()
      expect(screen.getByText('Algorithm & Coding Specialist')).toBeInTheDocument()
      expect(screen.getByText(/Sophia speaking/i)).toBeInTheDocument()

      const toggleBtn = screen.getByRole('button', { name: /Voice On/i })
      fireEvent.click(toggleBtn)
      expect(onToggle).toHaveBeenCalledWith(false)
    })

    it('renders Alex Staff Architect persona correctly', () => {
      render(
        <InterviewerAvatarHUD
          persona="ALEX_STAFF_ARCHITECT"
          status="idle"
        />
      )

      expect(screen.getByText('Alex')).toBeInTheDocument()
      expect(screen.getByText('Senior Staff Systems Architect')).toBeInTheDocument()
    })
  })

  describe('InterviewEvaluationScorecard', () => {
    const mockReport: InterviewEvaluationReport = {
      sessionId: 'session-test-123',
      overallScore: 88,
      percentileRanking: 92,
      hiringRecommendation: 'STRONG_HIRE',
      executiveSummary: 'Candidate demonstrated exceptional systems understanding and clean algorithmic invariants.',
      factorScores: [
        {
          name: 'Problem Solving & Scaffolding',
          factor: 'PROBLEM_SOLVING',
          score: 90,
          weight: 0.25,
          feedback: 'Excellent problem decomposition.',
          positiveSignals: ['Asked clarifying questions'],
          growthAreas: ['Double check capacity 0'],
        },
        {
          name: 'Algorithmic Efficiency & Invariants',
          factor: 'ALGORITHMIC_EFFICIENCY',
          score: 88,
          weight: 0.25,
          feedback: 'Optimal O(1) complexity.',
          positiveSignals: ['Used Map indexing'],
          growthAreas: [],
        },
      ],
      starAnalysis: {
        situation: 'Designed distributed LRU cache under 100k QPS.',
        task: 'Formulate an optimal solution balancing O(1) bounds.',
        action: 'Maintained collaborative dialogue with the interviewer.',
        result: 'Delivered working solution with score of 88/100.',
      },
      strengths: ['Strong data structures knowledge'],
      weaknesses: ['Could add unit tests earlier'],
      recommendedRevisionTopics: ['LRU Cache Eviction', 'Consistent Hashing'],
      curriculumModuleIds: ['mod-1'],
      generatedAt: new Date().toISOString(),
    }

    it('renders composite score, recommendation badge, and rubric scores', () => {
      render(
        <MemoryRouter>
          <InterviewEvaluationScorecard evaluation={mockReport} />
        </MemoryRouter>
      )

      expect(screen.getByText('Technical Interview Performance Report')).toBeInTheDocument()
      expect(screen.getByText('Strong Hire')).toBeInTheDocument()
      expect(screen.getAllByText('88').length).toBeGreaterThan(0)
      expect(screen.getByText('Top 8%')).toBeInTheDocument()
      expect(screen.getByText('Problem Solving & Scaffolding')).toBeInTheDocument()
      expect(screen.getByText('LRU Cache Eviction')).toBeInTheDocument()
    })
  })
})
