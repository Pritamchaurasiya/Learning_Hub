import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { IStorageProvider } from './IStorageProvider'
import logger from '../../utils/logger'

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client
  private bucket: string
  private publicEndpoint: string

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
      endpoint: process.env.S3_ENDPOINT, // Used for MinIO or R2
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    })

    this.bucket = process.env.S3_BUCKET ?? 'learninghub-bucket'
    this.publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? ''
  }

  async uploadFile(key: string, body: Buffer, mimetype: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimetype,
    })

    try {
      await this.client.send(command)
      logger.info(`[S3StorageProvider] File uploaded successfully to s3://${this.bucket}/${key}`)
      return await this.getFileUrl(key)
    } catch (error) {
      logger.error(
        '[S3StorageProvider] Failed to upload file',
        error instanceof Error ? error : new Error(String(error))
      )
      throw new Error('Cloud storage upload failed')
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    try {
      await this.client.send(command)
      logger.info(`[S3StorageProvider] File deleted successfully from s3://${this.bucket}/${key}`)
      return true
    } catch (error) {
      logger.error(
        '[S3StorageProvider] Failed to delete file',
        error instanceof Error ? error : new Error(String(error))
      )
      return false
    }
  }

  async getFileUrl(key: string): Promise<string> {
    // If a CDN or public S3 bucket is used
    if (this.publicEndpoint) {
      return `${this.publicEndpoint}/${key}`
    }

    // Otherwise, generate a 1-hour pre-signed URL for private buckets
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn: 3600 })
  }
}
