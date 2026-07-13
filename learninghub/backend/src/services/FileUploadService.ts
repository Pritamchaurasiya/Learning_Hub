import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
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

export function generateFileKey(fileType: FileType, originalName: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const config = FILE_CONFIGS[fileType]
  const ext = path.extname(originalName)
  const uniqueId = crypto.randomBytes(16).toString('hex')
  const timestamp = Date.now()
  return `${config.destination}/${timestamp}-${uniqueId}${ext}`
}

function createStorage(_fileType: FileType): multer.StorageEngine {
  return multer.memoryStorage()
}

function createFileFilter(fileType: FileType): multer.Options['fileFilter'] {
  // eslint-disable-next-line security/detect-object-injection
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
  // eslint-disable-next-line security/detect-object-injection
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

import { storageProvider } from './storage/StorageFactory'

export async function uploadFileToStorage(
  file: Express.Multer.File,
  fileType: FileType
): Promise<string> {
  const key = generateFileKey(fileType, file.originalname)
  return storageProvider.uploadFile(key, file.buffer, file.mimetype)
}

export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Note: S3 deleteFile expects the key, not the full URL.
    // If it's a relative URL like /uploads/avatars/123.jpg, we can extract the key.
    // For now, let's pass the raw fileUrl. S3StorageProvider and LocalDiskProvider should parse it.
    let key = fileUrl
    if (key.startsWith('/')) {
      key = key.substring(1)
    }

    return await storageProvider.deleteFile(key)
  } catch (error) {
    logger.error(
      '[FileUpload] Failed to delete file',
      error instanceof Error ? error : new Error(String(error)),
      { fileUrl }
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
  uploadFileToStorage,
  deleteFile,
  FileType,
}
