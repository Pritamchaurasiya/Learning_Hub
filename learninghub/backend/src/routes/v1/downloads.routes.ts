import { Router } from 'express'
import {
  getDownloads,
  getStats,
  createDownload,
  pauseDownload,
  resumeDownload,
  deleteDownload,
} from '../../controllers/downloadsController'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', authenticate, getDownloads)
router.get('/items', authenticate, getDownloads)
router.get('/items/stats', authenticate, getStats)
router.post('/items', authenticate, createDownload)
router.post('/items/create', authenticate, createDownload)
router.post('/items/:id/pause', authenticate, pauseDownload)
router.post('/items/:id/resume', authenticate, resumeDownload)
router.post('/items/:id/retry', authenticate, resumeDownload)
router.delete('/items/:id', authenticate, deleteDownload)
router.delete('/items/:id/delete', authenticate, deleteDownload)

export default router
