import { Request, Response } from 'express'
import { downloadService } from '../services/DownloadService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound } from '../utils/responseHelper'

export const getDownloads = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const downloads = await downloadService.getUserDownloads(userId)
  sendSuccess(res, downloads, undefined, 200, { count: downloads.length })
})

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const stats = await downloadService.getStats(userId)
  sendSuccess(res, stats)
})

export const createDownload = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const download = await downloadService.createDownload(userId, req.body)
  sendSuccess(res, download, 'Download started', 201)
})

export const pauseDownload = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const id = req.params.id as string
  const item = await downloadService.updateStatus(userId, id, 'paused')
  if (!item) {
    sendNotFound(res, 'Download not found')
    return
  }
  sendSuccess(res, item)
})

export const resumeDownload = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const id = req.params.id as string
  const item = await downloadService.updateStatus(userId, id, 'downloading')
  if (!item) {
    sendNotFound(res, 'Download not found')
    return
  }
  sendSuccess(res, item)
})

export const deleteDownload = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const id = req.params.id as string
  await downloadService.deleteDownload(userId, id)
  sendSuccess(res, { deleted: true }, 'Download removed')
})
