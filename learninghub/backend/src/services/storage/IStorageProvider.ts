export interface IStorageProvider {
  /**
   * Uploads a file buffer to the storage provider
   * @param key The destination path/key (e.g. 'avatars/123.png')
   * @param body The file content as a Buffer
   * @param mimetype The file MIME type
   * @returns The public or pre-signed URL of the uploaded file
   */
  uploadFile(key: string, body: Buffer, mimetype: string): Promise<string>

  /**
   * Deletes a file from the storage provider
   * @param key The destination path/key
   */
  deleteFile(key: string): Promise<boolean>

  /**
   * Generates a public or pre-signed URL for a file
   * @param key The destination path/key
   */
  getFileUrl(key: string): Promise<string>
}
