import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobMatchingGridCard } from './JobMatchingGridCard'
import { RecruiterSimulationPanel } from './RecruiterSimulationPanel'
import { CompensationNegotiatorModal } from './CompensationNegotiatorModal'
import { SimulatedJobListing, RecruiterPersona, RecruiterTurn, CompensationPackage } from '../../types/career'

const mockJob: SimulatedJobListing = {
  id: 'job-dist-sys-01',
  title: 'Senior Distributed Systems Infrastructure Engineer',
  company: 'Novacloud Systems',
  tier: 'FAANG_FRONTIER',
  location: 'San Francisco, CA / Remote',
  workplaceType: 'REMOTE',
  baseSalaryMin: 195000,
  baseSalaryMax: 245000,
  equityAnnualUsd: 120000,
  signingBonusUsd: 45000,
  currency: 'USD',
  track: 'DISTRIBUTED_SYSTEMS',
  requiredSkills: ['Distributed Consensus (Raft/Paxos)', 'Go / Rust', 'Kubernetes Architecture'],
  preferredSkills: ['CRDTs'],
  minimumElo: 1800,
  matchAffinityScore: 96,
  matchedSkills: ['Distributed Consensus (Raft/Paxos)', 'Go / Rust'],
  missingSkills: ['Kubernetes Architecture'],
  telemetryAlignment: {
    eloRatingMatch: true,
    bktMasteryMatch: true,
    interviewReadinessMatch: true,
  },
  description: 'Architect planetary-scale replication engines and fault-tolerant telemetry pipelines.',
}

const mockPersonas: RecruiterPersona[] = [
  {
    role: 'EXECUTIVE_TALENT_LEAD',
    name: 'Sarah Lin',
    title: 'Executive Technical Recruiter',
    avatarColor: 'from-blue-600 to-indigo-700',
    evaluationFocus: 'Compensation & trajectory',
    currentImpressionScore: 92,
  },
  {
    role: 'ENGINEERING_DIRECTOR',
    name: 'David Vance',
    title: 'Director of Systems Architecture',
    avatarColor: 'from-emerald-600 to-teal-700',
    evaluationFocus: 'Architectural trade-offs',
    currentImpressionScore: 88,
  },
]

const mockDialogue: RecruiterTurn[] = [
  {
    id: 't-1',
    speaker: 'SYSTEM',
    content: 'Telemetry verified.',
    timestamp: new Date().toISOString(),
  },
  {
    id: 't-2',
    speaker: 'RECRUITER',
    personaName: 'Sarah Lin',
    content: 'We are thrilled by your verified Elo rating.',
    timestamp: new Date().toISOString(),
    suggestedResponses: ['Let’s discuss upper-band base salary.'],
  },
]

const mockOffer: CompensationPackage = {
  baseSalary: 235000,
  equityValueUsd: 125000,
  signingBonus: 45000,
  totalTargetCompensation: 405000,
  acceptedStatus: 'PENDING',
}

describe('CareerComponents (Milestone 26 Anti-Gravity Career Orchestrator)', () => {
  it('renders JobMatchingGridCard with match affinity score and handles click', () => {
    const onSelect = vi.fn()
    render(
      <JobMatchingGridCard
        job={mockJob}
        isSelected={false}
        onSelect={onSelect}
      />
    )

    expect(screen.getByText('Novacloud Systems')).toBeInTheDocument()
    expect(screen.getByText('96% Match')).toBeInTheDocument()
    expect(screen.getByText('Distributed Consensus (Raft/Paxos)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Novacloud Systems'))
    expect(onSelect).toHaveBeenCalledWith(mockJob)
  })

  it('renders RecruiterSimulationPanel with personas, message stream, and triggers send', () => {
    const onSendMessage = vi.fn()
    const onPersonaSelect = vi.fn()
    const onOpenNegotiator = vi.fn()

    render(
      <RecruiterSimulationPanel
        job={mockJob}
        personas={mockPersonas}
        activePersona="EXECUTIVE_TALENT_LEAD"
        dialogueHistory={mockDialogue}
        currentOffer={mockOffer}
        leverageScore={88}
        onPersonaSelect={onPersonaSelect}
        onSendMessage={onSendMessage}
        onOpenNegotiator={onOpenNegotiator}
      />
    )

    expect(screen.getAllByText('Sarah Lin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('We are thrilled by your verified Elo rating.')).toBeInTheDocument()
    expect(screen.getByText('88 / 100')).toBeInTheDocument()

    // Click suggested response
    fireEvent.click(screen.getByText('Let’s discuss upper-band base salary.'))
    expect(onSendMessage).toHaveBeenCalledWith('Let’s discuss upper-band base salary.')

    // Click Open Negotiator
    fireEvent.click(screen.getByRole('button', { name: /Counter Offer/i }))
    expect(onOpenNegotiator).toHaveBeenCalled()
  })

  it('renders CompensationNegotiatorModal with sliders and updates counter offer', () => {
    const onClose = vi.fn()
    const onOfferUpdated = vi.fn()

    render(
      <CompensationNegotiatorModal
        isOpen={true}
        job={mockJob}
        currentOffer={mockOffer}
        leverageScore={88}
        onClose={onClose}
        onOfferUpdated={onOfferUpdated}
      />
    )

    expect(screen.getByText('Compensation & Equity Negotiator')).toBeInTheDocument()
    expect(screen.getByText('Base Salary (USD / Year)')).toBeInTheDocument()

    // Click Submit Counter-Offer
    fireEvent.click(screen.getByRole('button', { name: /Submit Counter-Offer/i }))
  })
})
