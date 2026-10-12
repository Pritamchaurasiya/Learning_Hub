import { Request, Response } from 'express'
import { careerOrchestratorService, CareerTrack, RecruiterPersonaRole } from '../services/CareerOrchestratorService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class CareerOrchestratorController {
  /**
   * GET /api/v1/career/jobs
   * Matches candidate skills against market jobs.
   */
  public getMatchedJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidateSkills = req.query.skills
        ? String(req.query.skills).split(',').map(s => s.trim())
        : [
            'Distributed Consensus (Raft/Paxos)',
            'Go / Rust',
            'TypeScript / React 18',
            'CRDTs',
            'Zero-Trust Security',
            'LLM Kernel Optimization',
            'PyTorch / CUDA',
          ]

      const candidateElo = req.query.elo ? Number(req.query.elo) : 1950
      const interviewPercentile = req.query.interviewPercentile ? Number(req.query.interviewPercentile) : 92
      const track = req.query.track as CareerTrack | undefined
      const minSalary = req.query.minSalary ? Number(req.query.minSalary) : undefined
      const remoteOnly = req.query.remoteOnly === 'true'

      const matchedJobs = careerOrchestratorService.matchJobs({
        candidateSkills,
        candidateElo,
        interviewPercentile,
        track,
        minSalary,
        remoteOnly,
      })

      sendSuccess(res, {
        totalJobs: matchedJobs.length,
        jobs: matchedJobs,
      })
    } catch (err: any) {
      logger.error('Error fetching matched jobs:', err)
      sendError(res, err.message || 'Failed to match career opportunities', 500)
    }
  }

  /**
   * POST /api/v1/career/dialogue
   * Processes a turn in the recruiter simulation.
   */
  public processDialogue = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        jobId,
        candidateName = 'Candidate',
        candidateElo = 1950,
        interviewPercentile = 92,
        activePersona = 'EXECUTIVE_TALENT_LEAD' as RecruiterPersonaRole,
        candidateMessage,
        dialogueHistory,
      } = req.body

      const result = careerOrchestratorService.generateRecruiterDialogue({
        jobId: jobId || 'job-dist-sys-01',
        candidateName,
        candidateElo: Number(candidateElo),
        interviewPercentile: Number(interviewPercentile),
        activePersona,
        candidateMessage,
        dialogueHistory,
      })

      sendSuccess(res, result)
    } catch (err: any) {
      logger.error('Error processing recruiter dialogue:', err)
      sendError(res, err.message || 'Failed to process recruiter dialogue', 500)
    }
  }

  /**
   * POST /api/v1/career/negotiate
   * Evaluates candidate counter-offer in salary negotiation.
   */
  public evaluateNegotiation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId, leverageScore = 80, counterOffer } = req.body

      if (!counterOffer || typeof counterOffer.baseSalary !== 'number') {
        sendError(res, 'Invalid counter-offer parameters provided', 400)
        return
      }

      const result = careerOrchestratorService.evaluateCounterOffer({
        jobId: jobId || 'job-dist-sys-01',
        leverageScore: Number(leverageScore),
        counterOffer: {
          baseSalary: Number(counterOffer.baseSalary),
          equityValueUsd: Number(counterOffer.equityValueUsd || 0),
          signingBonus: Number(counterOffer.signingBonus || 0),
        },
      })

      sendSuccess(res, result)
    } catch (err: any) {
      logger.error('Error evaluating negotiation counter-offer:', err)
      sendError(res, err.message || 'Failed to evaluate compensation counter-offer', 500)
    }
  }
}

export const careerOrchestratorController = new CareerOrchestratorController()
