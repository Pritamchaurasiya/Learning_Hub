import { StorageFactory } from '../../src/services/storage/StorageFactory'
import { LocalDiskProvider } from '../../src/services/storage/LocalDiskProvider'
import { S3StorageProvider } from '../../src/services/storage/S3StorageProvider'
import fs from 'fs'

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn().mockImplementation(args => args),
    DeleteObjectCommand: jest.fn().mockImplementation(args => args),
    GetObjectCommand: jest.fn().mockImplementation(args => args),
  }
})

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.aws.com/signed-url/file.png'),
}))

describe('Storage Providers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('StorageFactory', () => {
    it('returns a storage provider instance', () => {
      const provider = StorageFactory.getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.uploadFile).toBe('function')
    })
  })

  describe('LocalDiskProvider', () => {
    it('generates file urls and handles uploads/deletes', async () => {
      const localProvider = new LocalDiskProvider()
      const key = 'test-sub/test-file.txt'

      const url = await localProvider.getFileUrl(key)
      expect(url).toContain('/uploads/test-sub/test-file.txt')

      const buffer = Buffer.from('test content')
      const uploadedUrl = await localProvider.uploadFile(key, buffer, 'text/plain')
      expect(uploadedUrl).toContain('/uploads/test-sub/test-file.txt')

      const deleted = await localProvider.deleteFile(key)
      expect(typeof deleted).toBe('boolean')
    })
  })

  describe('S3StorageProvider', () => {
    it('uploads files and generates signed/public URLs', async () => {
      process.env.AWS_REGION = 'us-east-1'
      process.env.AWS_ACCESS_KEY_ID = 'test-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'
      process.env.S3_BUCKET = 'test-bucket'

      const s3Provider = new S3StorageProvider()
      const key = 'avatars/user-1.png'
      const buffer = Buffer.from('fake-image-bytes')

      const url = await s3Provider.uploadFile(key, buffer, 'image/png')
      expect(url).toBe('https://s3.aws.com/signed-url/file.png')

      const deleted = await s3Provider.deleteFile(key)
      expect(deleted).toBe(true)
    })

    it('returns public endpoint url when S3_PUBLIC_ENDPOINT is set', async () => {
      process.env.S3_PUBLIC_ENDPOINT = 'https://cdn.learninghub.com'
      const s3Provider = new S3StorageProvider()
      const url = await s3Provider.getFileUrl('docs/guide.pdf')
      expect(url).toBe('https://cdn.learninghub.com/docs/guide.pdf')
    })
  })
})
