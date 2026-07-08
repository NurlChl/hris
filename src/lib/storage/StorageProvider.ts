export interface StorageProvider {
  /**
   * Uploads a file to the configured storage destination.
   * @param file The file Buffer or Blob to upload
   * @param path The target relative path/filename (e.g. 'avatars/john-doe.png')
   * @param mimeType Optional mime-type of the file
   * @returns The relative or absolute URL/path to access the uploaded file
   */
  upload(file: Buffer | Blob, path: string, mimeType?: string): Promise<string>;

  /**
   * Retrieves a public URL for the file.
   * @param path The relative path of the file
   */
  getUrl(path: string): string;

  /**
   * Generates a signed, short-lived secure URL for accessing sensitive files (e.g. NPWP, slip gaji).
   * @param path The relative path of the file
   * @param expiresInSeconds Duration of validity in seconds (default 900 seconds / 15 minutes)
   */
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Deletes a file from storage.
   * @param path The relative path of the file to delete
   */
  delete(path: string): Promise<void>;
}
