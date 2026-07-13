import { IStorageProvider } from './IStorageProvider'
import { LocalDiskProvider } from './LocalDiskProvider'
import { S3StorageProvider } from './S3StorageProvider'
import logger from '../../utils/logger'

export class StorageFactory {
  private static instance: IStorageProvider

  static getProvider(): IStorageProvider {
    if (!this.instance) {
      // Check if S3 credentials exist
      if (
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.S3_BUCKET
      ) {
        logger.info('[StorageFactory] Initializing S3 Storage Provider')
        this.instance = new S3StorageProvider()
      } else {
        logger.warn(
          '[StorageFactory] AWS credentials missing. Falling back to Local Disk Provider. NOT RECOMMENDED FOR PRODUCTION.'
        )
        this.instance = new LocalDiskProvider()
      }
    }
    return this.instance
  }
}

export const storageProvider = StorageFactory.getProvider()
