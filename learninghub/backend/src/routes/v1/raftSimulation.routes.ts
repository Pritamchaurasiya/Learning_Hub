import { Router } from 'express'
import { raftSimulationController } from '../../controllers/raftSimulationController'

const router = Router()

/**
 * @route   GET /api/v1/raft/state
 * @desc    Get current Raft cluster state and nodes
 * @access  Public
 */
router.get('/state', raftSimulationController.getState)

/**
 * @route   POST /api/v1/raft/reset
 * @desc    Reset cluster with specified node count
 * @access  Public
 */
router.post('/reset', raftSimulationController.resetCluster)

/**
 * @route   POST /api/v1/raft/tick
 * @desc    Advance simulation tick
 * @access  Public
 */
router.post('/tick', raftSimulationController.tick)

/**
 * @route   POST /api/v1/raft/election
 * @desc    Force trigger election from candidate node
 * @access  Public
 */
router.post('/election', raftSimulationController.startElection)

/**
 * @route   POST /api/v1/raft/command
 * @desc    Submit client write command to leader
 * @access  Public
 */
router.post('/command', raftSimulationController.submitCommand)

/**
 * @route   POST /api/v1/raft/partition
 * @desc    Inject network partition splitting cluster into two groups
 * @access  Public
 */
router.post('/partition', raftSimulationController.partition)

/**
 * @route   POST /api/v1/raft/heal
 * @desc    Heal network partition
 * @access  Public
 */
router.post('/heal', raftSimulationController.heal)

/**
 * @route   POST /api/v1/raft/nodes/:nodeId/crash
 * @desc    Crash specific server node
 * @access  Public
 */
router.post('/nodes/:nodeId/crash', raftSimulationController.crashNode)

/**
 * @route   POST /api/v1/raft/nodes/:nodeId/recover
 * @desc    Recover crashed node
 * @access  Public
 */
router.post('/nodes/:nodeId/recover', raftSimulationController.recoverNode)

/**
 * @route   GET /api/v1/raft/invariants
 * @desc    Audit 5 Raft safety invariants
 * @access  Public
 */
router.get('/invariants', raftSimulationController.auditInvariants)

export default router
