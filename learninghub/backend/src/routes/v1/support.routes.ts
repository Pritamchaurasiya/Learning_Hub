import { Router } from 'express'
import {
  listTickets,
  getTicket,
  createTicket,
  replyToTicket,
} from '../../controllers/supportController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/tickets', optionalAuth, listTickets)
router.post('/tickets', optionalAuth, createTicket)
router.get('/tickets/:id', optionalAuth, getTicket)
router.post('/tickets/:id/reply', optionalAuth, replyToTicket)

export default router
