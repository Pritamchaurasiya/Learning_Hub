import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DebatePersonaAvatarHUD } from './DebatePersonaAvatarHUD'
import { DialecticalTurnTimeline } from './DialecticalTurnTimeline'
import { ParetoTradeoffRadar } from './ParetoTradeoffRadar'
import { ConsensusRfcModal } from './ConsensusRfcModal'
import {
  DebatePersona,
  DebateTurn,
  ParetoMetrics,
  ArchitectureRFC,
} from '../../types/agentDebate'

const mockPersonas: DebatePersona[] = [
  {
    id: 'ARCHITECT_AVA',
    name: 'Architect Ava',
    title: 'Chief Systems Architect',
    stance: 'Domain Boundary & Cohesion Advocate',
    avatarColor: '#6366F1',
    specialty: 'DDD & Modularity',
    corePriority: 'Clean interfaces',
  },
  {
    id: 'SENTINEL_REX',
    name: 'Sentinel Rex',
    title: 'Offensive Security & Red Team Lead',
    stance: 'Zero-Trust & Threat Surface Inquisitor',
    avatarColor: '#EF4444',
    specialty: 'SSRF & Auth Hardening',
    corePriority: 'Zero implicit trust',
  },
]

const mockTurns: DebateTurn[] = [
  {
    id: 'turn-1',
    roundIndex: 1,
    personaId: 'SENTINEL_REX',
    personaName: 'Sentinel Rex',
    timestamp: 1690000000000,
    critique: 'The proposed architecture lacks egress IP filtering and mTLS between microservices.',
    claims: [
      {
        id: 'claim-1',
        claim: 'Lack of cryptographic mTLS exposes inter-service communication to MITM attacks.',
        evidence: 'RFC 8446 Section 4.4 and OWASP API Security Top 10.',
        severity: 'CRITICAL',
        counterExample: 'Attacker compromising edge ingress can spoof downstream RPC headers.',
      },
      {
        id: 'claim-2',
        claim: 'Missing rate limiting can trigger denial of service in authorization endpoints.',
        evidence: 'CWE-400 Uncontrolled Resource Consumption.',
        severity: 'WARNING',
      },
    ],
    scoreContribution: {
      security: 70,
      performance: 85,
      reliability: 80,
      maintainability: 90,
      costEfficiency: 88,
    },
  },
  {
    id: 'turn-2',
    roundIndex: 1,
    personaId: 'ARCHITECT_AVA',
    personaName: 'Architect Ava',
    timestamp: 1690000001000,
    critique: 'We endorse adding SPIFFE/SPIRE workload identities to address Sentinel Rex concerns.',
    claims: [
      {
        id: 'claim-3',
        claim: 'SPIFFE/SPIRE provides cryptographically attested workload identities without hardcoded secrets.',
        evidence: 'Cloud Native Computing Foundation (CNCF) Graduated Project.',
        severity: 'ENDORSEMENT',
      },
    ],
    rebuttalTargetPersonaId: 'SENTINEL_REX',
    scoreContribution: {
      security: 95,
      performance: 82,
      reliability: 90,
      maintainability: 92,
      costEfficiency: 85,
    },
  },
]

const mockMetrics: ParetoMetrics = {
  security: 92,
  performance: 88,
  reliability: 90,
  maintainability: 94,
  costEfficiency: 86,
  compositeConsensusScore: 90,
}

const mockRFC: ArchitectureRFC = {
  rfcId: 'RFC-2030-0042',
  title: 'Autonomous Multi-Region Distributed Event Fabric',
  date: '2030-02-15',
  status: 'APPROVED',
  authorCouncil: ['Architect Ava', 'Sentinel Rex', 'Velocity Vik', 'Chaos Chloe'],
  executiveSummary: 'This RFC formalizes the consensus architecture reached after 3 rounds of adversarial debate.',
  architecturalDecisions: [
    {
      decision: 'Adopt SPIFFE/SPIRE with automated short-lived X.509 SVID rotation',
      rationale: 'Mitigates MITM risks identified by Sentinel Rex with negligible CPU overhead.',
      champion: 'Architect Ava',
    },
  ],
  criticalMitigations: [
    {
      risk: 'Potential TLS handshake latency on cold starts',
      mitigation: 'Enable TLS session resumption and persistent connection pooling in service mesh.',
      assignedLead: 'Velocity Vik',
    },
  ],
  paretoMetrics: mockMetrics,
  cryptographicApprovalHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
}

describe('Debate Components Suite', () => {
  describe('DebatePersonaAvatarHUD', () => {
    it('renders persona names, titles, and round details', () => {
      render(
        <DebatePersonaAvatarHUD
          personas={mockPersonas}
          activeSpeakerId="SENTINEL_REX"
          roundNumber={2}
          totalRounds={3}
        />
      )

      expect(screen.getByText('Architect Ava')).toBeInTheDocument()
      expect(screen.getByText('Sentinel Rex')).toBeInTheDocument()
      expect(screen.getByText('Offensive Security & Red Team Lead')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('highlights the active speaking persona', () => {
      render(
        <DebatePersonaAvatarHUD
          personas={mockPersonas}
          activeSpeakerId="SENTINEL_REX"
          roundNumber={1}
          totalRounds={3}
        />
      )

      expect(screen.getByText(/Speaking/i)).toBeInTheDocument()
    })
  })

  describe('DialecticalTurnTimeline', () => {
    it('renders debate turns, critiques, and claim severity badges', () => {
      const handleSelectTurn = vi.fn()
      render(
        <DialecticalTurnTimeline
          turns={mockTurns}
          activeTurnIndex={0}
          onSelectTurn={handleSelectTurn}
        />
      )

      expect(screen.getByText(/The proposed architecture lacks egress IP filtering/i)).toBeInTheDocument()
      expect(screen.getByText('Critical Risk')).toBeInTheDocument()
      expect(screen.getByText('Trade-off Warning')).toBeInTheDocument()

      const turnHeader = screen.getByText('Sentinel Rex')
      fireEvent.click(turnHeader)
      expect(handleSelectTurn).toHaveBeenCalled()
    })
  })

  describe('ParetoTradeoffRadar', () => {
    it('renders 5 Pareto metrics and triggers RFC modal on click', () => {
      const handleOpenRfc = vi.fn()
      render(
        <ParetoTradeoffRadar
          metrics={mockMetrics}
          status="CONSENSUS_REACHED"
          onOpenRfcModal={handleOpenRfc}
        />
      )

      expect(screen.getByText('Zero-Trust Security')).toBeInTheDocument()
      expect(screen.getByText('Throughput & P99 SLA')).toBeInTheDocument()
      expect(screen.getByText('SRE & Fault Tolerance')).toBeInTheDocument()
      expect(screen.getByText('DDD & Modularity')).toBeInTheDocument()
      expect(screen.getByText('Infra Cost Efficiency')).toBeInTheDocument()
      expect(screen.getByText('90%')).toBeInTheDocument()

      const rfcButton = screen.getByText(/View & Export Signed Architecture RFC/i)
      fireEvent.click(rfcButton)
      expect(handleOpenRfc).toHaveBeenCalled()
    })
  })

  describe('ConsensusRfcModal', () => {
    it('renders RFC content, decisions, and triggers close', () => {
      const handleClose = vi.fn()
      render(
        <ConsensusRfcModal
          isOpen={true}
          rfc={mockRFC}
          onClose={handleClose}
        />
      )

      expect(screen.getByText(/Autonomous Multi-Region Distributed Event Fabric/i)).toBeInTheDocument()
      expect(screen.getByText('RFC-2030-0042')).toBeInTheDocument()
      expect(screen.getByText(/Adopt SPIFFE\/SPIRE with automated short-lived X.509 SVID rotation/i)).toBeInTheDocument()

      const closeBtn = screen.getByRole('button', { name: /close modal/i })
      fireEvent.click(closeBtn)
      expect(handleClose).toHaveBeenCalled()
    })
  })
})
