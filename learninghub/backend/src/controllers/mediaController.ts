import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/responseHelper'
import { prisma } from '../prismaClient'
import { uploadFileToStorage, FileType } from '../services/FileUploadService'
import { asyncHandler } from '../utils/errorHandler'

export const uploadAvatar = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR')
    return
  }

  const userId = req.user!.userId

  const fileUrl = await uploadFileToStorage(req.file, FileType.AVATAR)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: fileUrl },
    select: { id: true, email: true, username: true, avatar: true },
  })

  sendSuccess(res, {
    message: 'Avatar uploaded successfully',
    url: fileUrl,
    user,
  })
})

export const uploadGenericMedia = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR')
      return
    }

    const fileUrl = await uploadFileToStorage(req.file, FileType.DOCUMENT)

    sendSuccess(res, {
      message: 'File uploaded successfully',
      url: fileUrl,
    })
  }
)
