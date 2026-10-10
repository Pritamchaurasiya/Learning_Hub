import { Request, Response } from 'express'
import {
  zkAttestationEngineService,
  ProofGenerationParams,
  ZkAttestationProofPayload,
} from '../services/ZkAttestationEngineService'
import { sendSuccess, sendBadRequest, sendInternalError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class ZkAttestationController {
  public getCircuitPresets = async (_req: Request, res: Response) => {
    try {
      const presets = zkAttestationEngineService.getCircuitPresets()
      return sendSuccess(res, presets, 'ZKP circuit presets retrieved successfully')
    } catch (error) {
      logger.error(
        '[ZkAttestationController] Error getting circuit presets:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to fetch circuit presets')
    }
  }

  public generateCommitment = async (req: Request, res: Response) => {
    try {
      const { userDid, metricValue, circuitType, saltHex } = req.body

      if (!userDid || metricValue === undefined || !circuitType) {
        return sendBadRequest(res, 'userDid, metricValue, and circuitType are required')
      }

      const commitment = zkAttestationEngineService.generateCommitment({
        userDid,
        metricValue: Number(metricValue),
        circuitType,
        saltHex,
      })

      return sendSuccess(res, commitment, 'ZKP commitment generated successfully')
    } catch (error) {
      logger.error(
        '[ZkAttestationController] Error generating commitment:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to generate commitment')
    }
  }

  public generateProof = async (req: Request, res: Response) => {
    try {
      const { userDid, circuitType, actualScoreOrElo, thresholdValue, saltHex } = req.body as ProofGenerationParams

      if (!userDid || !circuitType || actualScoreOrElo === undefined || thresholdValue === undefined) {
        return sendBadRequest(res, 'userDid, circuitType, actualScoreOrElo, and thresholdValue are required')
      }

      const proof = zkAttestationEngineService.generateProof({
        userDid,
        circuitType,
        actualScoreOrElo: Number(actualScoreOrElo),
        thresholdValue: Number(thresholdValue),
        saltHex,
      })

      return sendSuccess(res, proof, 'Zero-Knowledge Groth16 proof synthesized successfully')
    } catch (error) {
      logger.error(
        '[ZkAttestationController] Error generating proof:',
        error instanceof Error ? error : new Error(String(error))
      )
      const msg = error instanceof Error ? error.message : 'Failed to generate ZKP proof'
      return sendBadRequest(res, msg)
    }
  }

  public verifyProof = async (req: Request, res: Response) => {
    try {
      const { proof } = req.body as { proof: ZkAttestationProofPayload }

      if (!proof) {
        return sendBadRequest(res, 'proof payload is required for verification')
      }

      const result = zkAttestationEngineService.verifyProof(proof)
      return sendSuccess(res, result, 'Zero-Knowledge proof verification complete')
    } catch (error) {
      logger.error(
        '[ZkAttestationController] Error verifying proof:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to verify proof')
    }
  }

  public generateSoulboundToken = async (req: Request, res: Response) => {
    try {
      const { userDid, zkProofId, circuitType, thresholdValue, contractAddress } = req.body

      if (!userDid || !zkProofId || !circuitType || thresholdValue === undefined) {
        return sendBadRequest(res, 'userDid, zkProofId, circuitType, and thresholdValue are required')
      }

      const sbt = zkAttestationEngineService.generateSoulboundToken({
        userDid,
        zkProofId,
        circuitType,
        thresholdValue: Number(thresholdValue),
        contractAddress,
      })

      return sendSuccess(res, sbt, 'Soulbound Token (ERC-5192) metadata synthesized successfully')
    } catch (error) {
      logger.error(
        '[ZkAttestationController] Error generating Soulbound Token:',
        error instanceof Error ? error : new Error(String(error))
      )
      return sendInternalError(res, 'Failed to generate Soulbound Token metadata')
    }
  }
}

export const zkAttestationController = new ZkAttestationController()
