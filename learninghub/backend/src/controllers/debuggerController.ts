import { Request, Response } from 'express'
import { traceRecordingEngineService } from '../services/TraceRecordingEngineService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class DebuggerController {
  /**
   * Records step-by-step execution trace and heap objects
   * POST /api/v1/debugger/trace
   */
  public recordTrace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, language, inputData, invariants, maxSteps } = req.body

      if (!code || typeof code !== 'string') {
        sendError(res, 'Code string is required for trace recording', 400)
        return
      }

      const trace = traceRecordingEngineService.recordExecutionTrace({
        code,
        language,
        inputData,
        invariants,
        maxSteps: maxSteps ? Number(maxSteps) : undefined,
      })

      sendSuccess(res, trace, 'Execution trace recorded successfully')
    } catch (error) {
      logger.error('[DebuggerController] Failed to record trace:', error as Error)
      sendError(res, 'Failed to record execution trace', 500)
    }
  }

  /**
   * Diagnoses root-cause failure and recommends remedial scaffolding
   * POST /api/v1/debugger/diagnose
   */
  public diagnoseTrace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { trace } = req.body

      if (!trace || !trace.traceId) {
        sendError(res, 'Valid ExecutionTrace payload is required', 400)
        return
      }

      const diagnosis = traceRecordingEngineService.diagnoseRootCause(trace)
      sendSuccess(res, diagnosis, 'Root cause diagnosed successfully')
    } catch (error) {
      logger.error('[DebuggerController] Failed to diagnose trace:', error as Error)
      sendError(res, 'Failed to diagnose execution trace', 500)
    }
  }

  /**
   * Debugger engine status probe
   * GET /api/v1/debugger/status
   */
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      {
        status: 'ONLINE',
        engine: 'Omniscient Time-Travel AST Trace Recorder v1.0',
        supportedArchetypes: ['Binary Search', 'Two-Pointer', 'Linked List Reversal', 'Recursion Trees', 'General AST'],
        maxStepsLimit: 500,
      },
      'Debugger engine is operational'
    )
  }
}

export const debuggerController = new DebuggerController()
