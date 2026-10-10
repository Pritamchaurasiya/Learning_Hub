import { describe, it, expect } from 'vitest'
import { zkpService } from './zkpService'

describe('zkpService (Milestone 18 Client Service)', () => {
  it('retrieves circuit presets with constraints and thresholds', async () => {
    const presets = await zkpService.getCircuitPresets()
    expect(presets).toBeDefined()
    expect(presets.length).toBeGreaterThanOrEqual(4)
    expect(presets[0].id).toBe('SCORE_THRESHOLD')
    expect(presets[0].constraints).toBeGreaterThan(1000)
  })

  it('generates a valid client-side ZK commitment with hash and expiry', async () => {
    const commitment = await zkpService.generateCommitment({
      userDid: 'did:polygon:0x123',
      metricValue: 92,
      circuitType: 'SCORE_THRESHOLD',
    })

    expect(commitment).toBeDefined()
    expect(commitment.commitmentHash).toMatch(/^0x/)
    expect(commitment.circuitType).toBe('SCORE_THRESHOLD')
  })

  it('synthesizes a Groth16 zero-knowledge proof when condition is met', async () => {
    const proof = await zkpService.generateProof({
      userDid: 'did:polygon:0x123',
      circuitType: 'ELO_RANK_THRESHOLD',
      actualScoreOrElo: 2150,
      thresholdValue: 2100,
    })

    expect(proof).toBeDefined()
    expect(proof.proof.protocol).toBe('groth16')
    expect(proof.proof.curve).toBe('bn128')
    expect(proof.publicInputs.thresholdValue).toBe(2100)
    expect(proof.verificationStatus).toBe('VALID')
  })

  it('throws an error if metric does not satisfy required threshold', async () => {
    await expect(
      zkpService.generateProof({
        userDid: 'did:polygon:0x123',
        circuitType: 'SCORE_THRESHOLD',
        actualScoreOrElo: 80,
        thresholdValue: 90,
      })
    ).rejects.toThrow(/Threshold unsatisfied/)
  })

  it('verifies a Groth16 proof successfully', async () => {
    const proof = await zkpService.generateProof({
      userDid: 'did:polygon:0x123',
      circuitType: 'MASTERY_PERCENTILE',
      actualScoreOrElo: 95,
      thresholdValue: 85,
    })

    const verification = await zkpService.verifyProof(proof)
    expect(verification.isValid).toBe(true)
    expect(verification.verificationTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('synthesizes ERC-5192 Soulbound Token metadata', async () => {
    const sbt = await zkpService.mintSoulboundToken({
      userDid: 'did:polygon:0x123',
      zkProofId: 'zkp-123',
      circuitType: 'SCORE_THRESHOLD',
      thresholdValue: 90,
    })

    expect(sbt).toBeDefined()
    expect(sbt.standard).toBe('ERC-5192')
    expect(sbt.isLocked).toBe(true)
    expect(sbt.tokenId).toMatch(/^0x/)
  })
})
