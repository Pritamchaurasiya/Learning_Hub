import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { Request } from 'express'
import logger from '../utils/logger'

export enum FileType {
  AVATAR = 'avatar',
  DOCUMENT = 'document',
  TEST_ATTACHMENT = 'test_attachment',
  COURSE_THUMBNAIL = 'course_thumbnail',
}

export interface FileUploadConfig {
  allowedTypes: string[]
  maxSize: number
  destination: string
}

const FILE_CONFIGS: Record<FileType, FileUploadConfig> = {
  [FileType.AVATAR]: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    destination: 'uploads/avatars',
  },
  [FileType.DOCUMENT]: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    destination: 'uploads/documents',
  },
  [FileType.TEST_ATTACHMENT]: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB
    destination: 'uploads/tests',
  },
  [FileType.COURSE_THUMBNAIL]: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 3 * 1024 * 1024, // 3MB
    destination: 'uploads/courses',
  },
}

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function generateFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const uniqueId = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${timestamp}-${uniqueId}${ext}`
}

function createStorage(fileType: FileType): multer.StorageEngine {
  const config = FILE_CONFIGS[fileType]
  ensureDirectoryExists(config.destination)

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, config.destination)
    },
    filename: (_req, file, cb) => {
      cb(null, generateFileName(file.originalname))
    },
  })
}

function createFileFilter(fileType: FileType): multer.Options['fileFilter'] {
  const config = FILE_CONFIGS[fileType]

  return (_req, file, cb) => {
    if (config.allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`))
    }
  }
}

export function createUpload(fileType: FileType): multer.Multer {
  const config = FILE_CONFIGS[fileType]
  const storage = createStorage(fileType)
  const fileFilter = createFileFilter(fileType)

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: config.maxSize,
    },
  })
}

export interface UploadedFile {
  filename: string
  originalname: string
  path: string
  size: number
  mimetype: string
  url: string
}

export function processUploadedFile(file: Express.Multer.File, fileType: FileType): UploadedFile {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
  const relativePath = path.relative(process.cwd(), file.path)

  return {
    filename: file.filename,
    originalname: file.originalname,
    path: relativePath,
    size: file.size,
    mimetype: file.mimetype,
    url: `${baseUrl}/${relativePath.replace(/\\/g, '/')}`,
  }
}

export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath)
      logger.info(`[FileUpload] Deleted file: ${absolutePath}`)
      return true
    }

    return false
  } catch (error) {
    logger.error(
      '[FileUpload] Failed to delete file',
      error instanceof Error ? error : new Error(String(error)),
      { filePath }
    )
    return false
  }
}

export const uploadAvatar = createUpload(FileType.AVATAR).single('avatar')
export const uploadDocument = createUpload(FileType.DOCUMENT).single('document')
export const uploadTestAttachment = createUpload(FileType.TEST_ATTACHMENT).single('attachment')
export const uploadCourseThumbnail = createUpload(FileType.COURSE_THUMBNAIL).single('thumbnail')

export default {
  createUpload,
  processUploadedFile,
  deleteFile,
  FileType,
}
