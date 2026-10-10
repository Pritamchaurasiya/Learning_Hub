import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ZkAttestationPage } from './ZkAttestationPage'
import { zkpService } from '../services/zkpService'

describe('ZkAttestationPage (Milestone 18 ZK-SNARK Attestation Hub)', () => {
  beforeEach(() => {
    vi.spyOn(zkpService, 'getCircuitPresets').mockResolvedValue([
      {
        id: 'SCORE_THRESHOLD',
        name: 'Assessment Score Threshold Circuit',
        description: 'Proves exam score >= Threshold without revealing raw marks.',
        constraints: 1248,
        defaultThreshold: 90,
        metricLabel: 'Score %',
      },
      {
        id: 'ELO_RANK_THRESHOLD',
        name: 'Arena Duel Elo Rating Circuit',
        description: 'Proves 1v1 Arena Elo >= Tier threshold.',
        constraints: 1536,
        defaultThreshold: 2100,
        metricLabel: 'Elo Rating',
      },
    ])

    vi.spyOn(zkpService, 'generateProof').mockResolvedValue({
      proofId: 'zkp-mock-123',
      circuitType: 'SCORE_THRESHOLD',
      circuitName: 'ScoreThresholdValidatorV1',
      statement: 'Proves exam score >= 90% without revealing raw marks.',
      proof: {
        piA: ['0x1', '0x2', '0x1'],
        piB: [
          ['0x3', '0x4'],
          ['0x5', '0x6'],
          ['0x1', '0x0'],
        ],
        piC: ['0x7', '0x8', '0x1'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicInputs: {
        thresholdValue: 90,
        commitmentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        issuerDid: 'did:polygon:0x5F3c8d1A2E07B4f36c84136C7019dD3A9922D9e8',
      },
      verificationStatus: 'VALID',
      metadata: {
        provingTimeMs: 15,
        verificationTimeMs: 2,
        constraintCount: 1248,
        circuitHash: '0xcircuit123',
      },
      generatedAt: '2026-10-10T00:00:00Z',
    })
  })

  it('renders page header, title, and initial prover studio', async () => {
    render(
      <MemoryRouter>
        <ZkAttestationPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText('Zero-Knowledge Skill Attestation & Soulbound Tokens')
      ).toBeInTheDocument()
    })

    expect(screen.getByText('Milestone 18')).toBeInTheDocument()
    expect(screen.getByText('ZK Prover Studio')).toBeInTheDocument()
    expect(screen.getByText('Public Verifier')).toBeInTheDocument()
    expect(screen.getByText('Soulbound Token (ERC-5192)')).toBeInTheDocument()
  })

  it('switches between tab panels (Prover, Verifier, SBT, Circuits)', async () => {
    render(
      <MemoryRouter>
        <ZkAttestationPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('ZK Prover Studio')).toBeInTheDocument()
    })

    // Click Circuits tab
    const circuitsTab = screen.getByText('Circuit Architecture & Math')
    fireEvent.click(circuitsTab)
    expect(screen.getByText('Arithmetic Circuit Constraint Formulation')).toBeInTheDocument()

    // Click Soulbound tab
    const sbtTab = screen.getByText('Soulbound Token (ERC-5192)')
    fireEvent.click(sbtTab)
    expect(screen.getByText('No Soulbound Token Minted')).toBeInTheDocument()
  })

  it('generates a proof from the UI and presents verification option', async () => {
    render(
      <MemoryRouter>
        <ZkAttestationPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Generate ZK Proof')).toBeInTheDocument()
    })

    const proveBtn = screen.getByText('Generate ZK Proof')
    fireEvent.click(proveBtn)

    await waitFor(() => {
      expect(screen.getByText('Proof Active')).toBeInTheDocument()
    })
  })
})
