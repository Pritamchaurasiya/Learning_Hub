/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs'
import path from 'path'
import { IStorageProvider } from './IStorageProvider'
import logger from '../../utils/logger'

export class LocalDiskProvider implements IStorageProvider {
  private readonly basePath: string
  private readonly baseUrl: string

  constructor() {
    this.basePath = path.join(process.cwd(), 'uploads')
    this.baseUrl = (() => {
      const url =
        process.env.BASE_URL ?? (process.env.NODE_ENV === 'test' ? 'http://localhost:5000' : '')
      if (!url) {
        throw new Error('BASE_URL environment variable is required for file storage URL generation')
      }
      return `${url}/uploads`
    })()

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }
  }

  async uploadFile(key: string, body: Buffer, _mimetype: string): Promise<string> {
    const fullPath = path.join(this.basePath, key)
    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    await fs.promises.writeFile(fullPath, body)
    logger.info(`[LocalDiskProvider] File uploaded successfully to ${fullPath}`)

    return `${this.baseUrl}/${key.replace(/\\/g, '/')}`
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, key)
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath)
        logger.info(`[LocalDiskProvider] File deleted successfully: ${fullPath}`)
        return true
      }
      return false
    } catch (error) {
      logger.error(
        '[LocalDiskProvider] Error deleting file',
        error instanceof Error ? error : new Error(String(error))
      )
      return false
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${key.replace(/\\/g, '/')}`
  }
}
