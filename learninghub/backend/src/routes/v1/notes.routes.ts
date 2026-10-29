import { Router } from 'express'
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from '../../controllers/userNotesController'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/', optionalAuth, listNotes)
router.post('/', optionalAuth, createNote)
router.get('/:id', optionalAuth, getNote)
router.put('/:id', optionalAuth, updateNote)
router.patch('/:id', optionalAuth, updateNote)
router.delete('/:id', optionalAuth, deleteNote)

export default router
