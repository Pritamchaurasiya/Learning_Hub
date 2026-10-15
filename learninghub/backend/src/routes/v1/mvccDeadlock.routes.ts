import { Router } from 'express'
import { mvccDeadlockController } from '../../controllers/mvccDeadlockController'

const router = Router()

/**
 * @route   GET /api/v1/concurrency/mvcc/state
 * @desc    Get MVCC row versions table & active transaction snapshot bounds
 * @access  Public
 */
router.get('/mvcc/state', mvccDeadlockController.getMvccState)

/**
 * @route   POST /api/v1/concurrency/mvcc/write-skew
 * @desc    Simulate Write Skew anomaly (Snapshot Isolation vs Serializable SSI)
 * @access  Public
 */
router.post('/mvcc/write-skew', mvccDeadlockController.simulateWriteSkew)

/**
 * @route   POST /api/v1/concurrency/deadlock/detect
 * @desc    Run Tarjan's cycle detection on Wait-For Graph and resolve deadlock
 * @access  Public
 */
router.post('/deadlock/detect', mvccDeadlockController.detectDeadlock)

/**
 * @route   GET /api/v1/concurrency/comparison
 * @desc    Retrieve ANSI SQL vs Modern MVCC isolation matrix
 * @access  Public
 */
router.get('/comparison', mvccDeadlockController.getIsolationComparison)

export default router
