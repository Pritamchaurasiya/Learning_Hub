import { Request, Response } from 'express'
import { userNotesService } from '../services/UserNotesService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHelper'

export const listNotes = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  const query = req.query.query as string | undefined
  const tag = req.query.tag as string | undefined
  const notes = await userNotesService.getNotes(userId, query, tag)
  sendSuccess(res, notes, undefined, 200, { count: notes.length })
})

export const getNote = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const note = await userNotesService.getNoteById(id)
  if (!note) {
    sendNotFound(res, 'Note not found')
    return
  }
  sendSuccess(res, note)
})

export const createNote = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  const { title, content, sourceType, sourceTitle, courseId, lessonId, timestampSeconds, tags } = req.body
  if (!title || !content) {
    sendValidationError(res, 'title and content are required')
    return
  }
  const note = await userNotesService.createNote(
    {
      title,
      content,
      sourceType: sourceType || 'general',
      sourceTitle: sourceTitle || 'General Notes',
      courseId,
      lessonId,
      timestampSeconds,
      tags: Array.isArray(tags) ? tags : [],
    },
    userId
  )
  sendSuccess(res, note, 'Note created successfully', 201)
})

export const updateNote = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const updates = req.body
  try {
    const updated = await userNotesService.updateNote(id, updates)
    sendSuccess(res, updated, 'Note updated successfully')
  } catch (err: any) {
    sendNotFound(res, err.message || 'Note not found')
  }
})

export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const deleted = await userNotesService.deleteNote(id)
  if (!deleted) {
    sendNotFound(res, 'Note not found')
    return
  }
  sendSuccess(res, { deleted: true }, 'Note deleted successfully')
})
