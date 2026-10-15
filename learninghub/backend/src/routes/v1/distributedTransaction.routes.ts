import { Router } from 'express'
import { distributedTransactionController } from '../../controllers/distributedTransactionController'

const router = Router()

/**
 * @route   POST /api/v1/transactions/2pc/execute
 * @desc    Execute Two-Phase Commit transaction simulation
 * @access  Public
 */
router.post('/2pc/execute', distributedTransactionController.execute2PC)

/**
 * @route   POST /api/v1/transactions/saga/execute
 * @desc    Execute Saga Orchestration transaction simulation
 * @access  Public
 */
router.post('/saga/execute', distributedTransactionController.executeSaga)

/**
 * @route   GET /api/v1/transactions/comparison
 * @desc    Retrieve 2PC vs Saga architectural comparison
 * @access  Public
 */
router.get('/comparison', distributedTransactionController.getComparison)

export default router
