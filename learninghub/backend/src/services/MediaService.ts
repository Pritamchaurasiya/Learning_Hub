/* eslint-disable security/detect-non-literal-fs-filename */
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We can create subdirectories based on type later, for now everything goes to uploads/
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions and directory traversal
    const uniqueSuffix = crypto.randomBytes(16).toString('hex')
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images and some document types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WEBP, GIF, and PDF are allowed.'))
  }
}

export const mediaService = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})
