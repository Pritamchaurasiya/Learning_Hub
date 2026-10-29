/**
 * remediationController.ts
 * 
 * Controller endpoints for Milestone 32 Adaptive Remediation (CAR).
 */

import { Request, Response } from 'express'
import { adaptiveRemediationService, QuestionTelemetry } from '../services/AdaptiveRemediationService'
import type { MistakeEtiology } from '../services/AdaptiveRemediationService'
import type { ParsedQs } from 'qs'

export class RemediationController {
  /**
   * POST /api/v1/remediation/diagnose
   * Evaluates question response telemetry and returns etiology classification + prescribed scaffold.
   */
  public diagnose(req: Request, res: Response): void {
    try {
      const telemetry: QuestionTelemetry = req.body

      if (!telemetry || !telemetry.questionId || !telemetry.conceptId) {
        res.status(400).json({
          success: false,
          error: 'Missing required telemetry parameters (questionId, conceptId).'
        })
        return
      }

      const diagnosis = adaptiveRemediationService.diagnoseMistake(telemetry)
      res.status(200).json({
        success: true,
        data: diagnosis
      })
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error diagnosing mistake etiology.'
      })
    }
  }

  /**
   * GET /api/v1/remediation/drill/:conceptId
   * Fetches a tailored 3-step scaffolding drill.
   */
  public getDrill(req: Request, res: Response): void {
    try {
      const conceptIdRaw = req.params.conceptId
      /**
 * Extracts a single string value from a query parameter that may be string, string[], ParsedQs, or ParsedQs[]
 */
function extractString(value: string | string[] | ParsedQs | ParsedQs[] | undefined): string {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : ''
  }
  if (typeof value === 'string') return value
  return ''
}

const conceptId: string = extractString(conceptIdRaw as string | string[] | ParsedQs | ParsedQs[])
const conceptNameRaw = req.query.conceptName
const conceptName: string = ((): string => {
  if (Array.isArray(conceptNameRaw)) {
    const first = conceptNameRaw[0]
    return typeof first === 'string' ? first : ''
  }
  if (typeof conceptNameRaw === 'string') return conceptNameRaw
  return conceptId
})()
      const etiologyRaw = req.query.etiology
      const etiology: MistakeEtiology = (() => {
        if (Array.isArray(etiologyRaw)) return etiologyRaw[0] as MistakeEtiology
        if (typeof etiologyRaw === 'string') return etiologyRaw as MistakeEtiology
        return 'KNOWLEDGE_DEFICIT' as MistakeEtiology
      })()

      const drill = adaptiveRemediationService.generateScaffoldDrill(conceptId, conceptName, etiology)
      res.status(200).json({
        success: true,
        data: drill
      })
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error generating scaffold drill.'
      })
    }
  }

  /**
   * POST /api/v1/remediation/submit-drill
   * Submits drill responses and returns BKT mastery update.
   */
  public submitDrill(req: Request, res: Response): void {
    try {
      const { conceptId, submittedAnswers, correctAnswers, priorMastery } = req.body

      if (!conceptId || !Array.isArray(submittedAnswers) || !Array.isArray(correctAnswers)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payload: conceptId, submittedAnswers array, and correctAnswers array are required.'
        })
        return
      }

      const prior = typeof priorMastery === 'number' ? priorMastery : 0.5
      const result = adaptiveRemediationService.evaluateDrillSubmission(
        conceptId,
        submittedAnswers,
        correctAnswers,
        prior
      )

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error processing drill submission.'
      })
    }
  }
}

export const remediationController = new RemediationController()
