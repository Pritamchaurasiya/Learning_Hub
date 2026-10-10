import {
  zkAttestationEngineService,
  ZkCircuitType,
} from '../../services/ZkAttestationEngineService'

describe('ZkAttestationEngineService (Milestone 18 ZK-SNARK Attestation & SBT Engine)', () => {
  const mockUserDid = 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7'

  it('generates a cryptographic salted commitment correctly', () => {
    const commitment = zkAttestationEngineService.generateCommitment({
      userDid: mockUserDid,
      metricValue: 95,
      circuitType: 'SCORE_THRESHOLD',
      saltHex: 'deadbeef12345678',
    })

    expect(commitment).toBeDefined()
    expect(commitment.commitmentHash).toMatch(/^0x[a-f0-9]{64}$/)
    expect(commitment.userDid).toBe(mockUserDid)
    expect(commitment.circuitType).toBe('SCORE_THRESHOLD')
    expect(new Date(commitment.expiryDate).getTime()).toBeGreaterThan(Date.now())
  })

  it('generates a valid Groth16 Zero-Knowledge Proof when actual value satisfies threshold', () => {
    const proof = zkAttestationEngineService.generateProof({
      userDid: mockUserDid,
      circuitType: 'SCORE_THRESHOLD',
      actualScoreOrElo: 94,
      thresholdValue: 90,
    })

    expect(proof).toBeDefined()
    expect(proof.proofId).toMatch(/^zkp-[a-f0-9]+$/)
    expect(proof.verificationStatus).toBe('VALID')
    expect(proof.publicInputs.thresholdValue).toBe(90)
    expect(proof.publicInputs.commitmentHash).toMatch(/^0x/)
    expect(proof.proof.protocol).toBe('groth16')
    expect(proof.proof.curve).toBe('bn128')
    expect(proof.proof.piA).toHaveLength(3)
    expect(proof.proof.piB).toHaveLength(3)
    expect(proof.proof.piC).toHaveLength(3)
    expect(proof.metadata.constraintCount).toBe(1248)
  })

  it('throws an error if actual value does not satisfy threshold condition', () => {
    expect(() => {
      zkAttestationEngineService.generateProof({
        userDid: mockUserDid,
        circuitType: 'SCORE_THRESHOLD',
        actualScoreOrElo: 75,
        thresholdValue: 90,
      })
    }).toThrow(/Threshold condition unsatisfied/)
  })

  it('verifies a valid Groth16 proof in constant time O(1)', () => {
    const proof = zkAttestationEngineService.generateProof({
      userDid: mockUserDid,
      circuitType: 'ELO_RANK_THRESHOLD',
      actualScoreOrElo: 2150,
      thresholdValue: 2100,
    })

    const result = zkAttestationEngineService.verifyProof(proof)
    expect(result.isValid).toBe(true)
    expect(result.verificationTimeMs).toBeGreaterThanOrEqual(0)
    expect(result.failureReason).toBeUndefined()
  })

  it('rejects an invalid or tampered proof payload', () => {
    const proof = zkAttestationEngineService.generateProof({
      userDid: mockUserDid,
      circuitType: 'MASTERY_PERCENTILE',
      actualScoreOrElo: 92,
      thresholdValue: 85,
    })

    // Tamper with public inputs
    const tampered = {
      ...proof,
      publicInputs: {
        ...proof.publicInputs,
        thresholdValue: -5,
      },
    }

    const result = zkAttestationEngineService.verifyProof(tampered)
    expect(result.isValid).toBe(false)
    expect(result.failureReason).toBeDefined()
  })

  it('generates ERC-5192 Soulbound Token metadata with locked invariant', () => {
    const sbt = zkAttestationEngineService.generateSoulboundToken({
      userDid: mockUserDid,
      zkProofId: 'zkp-abc12345',
      circuitType: 'ELO_RANK_THRESHOLD',
      thresholdValue: 2100,
    })

    expect(sbt).toBeDefined()
    expect(sbt.standard).toBe('ERC-5192')
    expect(sbt.isLocked).toBe(true)
    expect(sbt.chainId).toBe(137)
    expect(sbt.networkName).toBe('Polygon PoS')
    expect(sbt.ownerAddressOrDid).toBe(mockUserDid)
    expect(sbt.tokenId).toMatch(/^0x/)
    expect(sbt.openseaUrl).toContain(sbt.tokenId)
  })

  it('returns all pre-compiled circuit presets', () => {
    const presets = zkAttestationEngineService.getCircuitPresets()
    expect(presets.length).toBe(4)
    expect(presets.map(p => p.id)).toContain('SCORE_THRESHOLD')
    expect(presets.map(p => p.id)).toContain('ELO_RANK_THRESHOLD')
    expect(presets.map(p => p.id)).toContain('MASTERY_PERCENTILE')
    expect(presets.map(p => p.id)).toContain('ANONYMOUS_MEMBERSHIP')
  })
})
