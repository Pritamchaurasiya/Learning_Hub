import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ZkProofGeneratorCard } from './ZkProofGeneratorCard'
import { ZkProofVerificationHUD } from './ZkProofVerificationHUD'
import { SoulboundTokenBadge } from './SoulboundTokenBadge'
import { ZkCircuitPreset, ZkAttestationProofPayload, SoulboundTokenMetadata } from '../../types/zkp'

const mockPresets: ZkCircuitPreset[] = [
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
]

const mockProof: ZkAttestationProofPayload = {
  proofId: 'zkp-test-001',
  circuitType: 'SCORE_THRESHOLD',
  circuitName: 'ScoreThresholdValidatorV1',
  statement: 'Proves exam score >= 90% without revealing raw score.',
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
}

const mockSbt: SoulboundTokenMetadata = {
  tokenId: '0x99998888777766665555444433332222',
  contractAddress: '0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
  chainId: 137,
  networkName: 'Polygon PoS',
  standard: 'ERC-5192',
  isLocked: true,
  ownerAddressOrDid: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
  attestationClaim: 'Score >= 90% in Advanced Distributed Systems',
  zkProofRef: 'zkp-test-001',
  mintTimestamp: '2026-10-10T00:00:00Z',
  tokenUri: 'https://learninghub.io/metadata/1',
  openseaUrl: 'https://opensea.io/assets/matic/0x71C/1',
  polygonscanUrl: 'https://polygonscan.com/token/0x71C?a=1',
}

describe('ZkComponents (Milestone 18 ZK-SNARK UI Suite)', () => {
  it('renders ZkProofGeneratorCard and allows changing thresholds and presets', () => {
    const onSelectPreset = vi.fn()
    const onProofGenerated = vi.fn()
    const onGenerateProof = vi.fn().mockResolvedValue(undefined)

    render(
      <ZkProofGeneratorCard
        presets={mockPresets}
        selectedPreset={mockPresets[0]}
        onSelectPreset={onSelectPreset}
        onProofGenerated={onProofGenerated}
        isGenerating={false}
        onGenerateProof={onGenerateProof}
      />
    )

    expect(screen.getByText('Zero-Knowledge Prover Studio')).toBeInTheDocument()
    expect(screen.getByText('Constraints: 1,248')).toBeInTheDocument()

    // Switch preset
    const eloBtn = screen.getByText('Arena Duel Elo Rating Circuit')
    fireEvent.click(eloBtn)
    expect(onSelectPreset).toHaveBeenCalledWith(mockPresets[1])

    // Click Generate ZK Proof
    const submitBtn = screen.getByText('Generate ZK Proof')
    fireEvent.click(submitBtn)
    expect(onGenerateProof).toHaveBeenCalled()
  })

  it('renders ZkProofVerificationHUD with public inputs, curve points, and verification trigger', () => {
    const onVerify = vi.fn()
    const onMintSbt = vi.fn()

    render(
      <ZkProofVerificationHUD
        proof={mockProof}
        verificationResult={{
          isValid: true,
          verificationTimeMs: 2,
          verifiedAt: '2026-10-10T00:00:00Z',
        }}
        isVerifying={false}
        onVerify={onVerify}
        onMintSbt={onMintSbt}
      />
    )

    expect(screen.getByText('Proof Active')).toBeInTheDocument()
    expect(screen.getByText('ScoreThresholdValidatorV1')).toBeInTheDocument()
    expect(screen.getByText('Cryptographic Verification Passed (O(1) Pairing Check Valid)')).toBeInTheDocument()

    const verifyBtn = screen.getByText('Verify Proof')
    fireEvent.click(verifyBtn)
    expect(onVerify).toHaveBeenCalled()

    const mintBtn = screen.getByText('Mint Soulbound SBT')
    fireEvent.click(mintBtn)
    expect(onMintSbt).toHaveBeenCalled()
  })

  it('renders SoulboundTokenBadge with non-transferable ERC-5192 attributes and explorer links', () => {
    render(<SoulboundTokenBadge sbt={mockSbt} />)

    expect(screen.getByText(/Soulbound \(Non-Transferable\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Zero-Knowledge Verified Attestation Token/i)).toBeInTheDocument()
    expect(screen.getByText('Score >= 90% in Advanced Distributed Systems')).toBeInTheDocument()
    expect(screen.getByText('0x71C665C1e78451bEE7065CA80f5338749b75F9B7')).toBeInTheDocument()
    expect(screen.getByText('Polygonscan')).toBeInTheDocument()
    expect(screen.getByText('OpenSea')).toBeInTheDocument()
  })
})
