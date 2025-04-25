import { 
  list, 
  put, 
  del, 
  head,
  PutBlobResult,
  ListBlobResultBlob,
  HeadBlobResult
} from '@vercel/blob';

export type BlobAccess = 'public' | 'private';

export interface UploadOptions {
  pathname?: string;
  filename?: string;
  access?: BlobAccess;
  addRandomSuffix?: boolean;
  cacheControl?: string;
  contentType?: string;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

/**
 * BlobService provides a unified API for interacting with Vercel Blob storage.
 * It handles uploading, listing, retrieving, and deleting files.
 */
export class BlobService {
  /**
   * Upload a file to Blob storage
   * @param file The file to upload
   * @param options Upload options
   * @returns Promise resolving to the uploaded blob information
   */
  public async uploadFile(file: File, options: UploadOptions = {}): Promise<PutBlobResult> {
    try {
      const filename = options.filename || file.name;
      const pathname = options.pathname || '';
      
      // Create full path
      const fullPath = pathname 
        ? `${pathname.replace(/\/+$/, '')}/${filename}` 
        : filename;
      
      // Upload to Vercel Blob
      return await put(fullPath, file, {
        access: options.access || 'public',
        addRandomSuffix: options.addRandomSuffix,
        cacheControl: options.cacheControl,
        contentType: options.contentType,
      });
    } catch (error: Error) {
      console.error('Error uploading file to Blob storage:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  
  /**
   * Upload text content to Blob storage
   * @param content The text content to upload
   * @param path The path where to store the content
   * @param options Upload options
   * @returns Promise resolving to the uploaded blob information
   */
  public async uploadText(
    content: string, 
    path: string, 
    options: Omit<UploadOptions, 'pathname' | 'filename'> = {}
  ): Promise<PutBlobResult> {
    try {
      // Create a Blob from the text content
      const blob = new Blob([content], { 
        type: options.contentType || 'text/plain' 
      });
      
      // Convert to File object
      const file = new File([blob], path.split('/').pop() || 'file.txt', { 
        type: options.contentType || 'text/plain'
      });
      
      // Get the directory path
      const pathname = path.includes('/')
        ? path.substring(0, path.lastIndexOf('/'))
        : '';
      
      // Upload the file
      return await this.uploadFile(file, {
        ...options,
        pathname,
        filename: path.split('/').pop(),
      });
    } catch (error: Error) {
      console.error('Error uploading text to Blob storage:', error);
      throw new Error(`Failed to upload text: ${error.message}`);
    }
  }
  
  /**
   * List files in Blob storage
   * @param options List options
   * @returns Promise resolving to a list of blobs
   */
  public async listFiles(options: ListOptions = {}): Promise<{
    blobs: ListBlobResultBlob[];
    cursor: string | undefined;
  }> {
    try {
      return await list({
        prefix: options.prefix,
        limit: options.limit,
        cursor: options.cursor,
      });
    } catch (error: Error) {
      console.error('Error listing files from Blob storage:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
  
  /**
   * Get file information from Blob storage
   * @param url The URL of the file
   * @returns Promise resolving to file information
   */
  public async getFileInfo(url: string): Promise<HeadBlobResult> {
    try {
      return await head(url);
    } catch (error: Error) {
      console.error('Error getting file info from Blob storage:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
  
  /**
   * Delete a file from Blob storage
   * @param url The URL of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  public async deleteFile(url: string): Promise<void> {
    try {
      await del(url);
    } catch (error: Error) {
      console.error('Error deleting file from Blob storage:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  /**
   * Generate a full URL for a blob path within Blob storage
   * This is useful when you need to reference a file that will be uploaded in the future
   * @param path The path of the file
   * @returns The full URL to the file (this assumes public access)
   */
  public getUrlForPath(path: string): string {
    // This is a simplification - it would be better to use the store's hostname from config
    const hostname = process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'https://public.blob.vercel-storage.com';
    
    // Clean up the path and ensure it doesn't start with a slash
    const cleanPath = path.replace(/^\/+/, '');
    
    return `${hostname}/${cleanPath}`;
  }
  
  /**
   * Fetch text content from a Blob URL
   * @param url The URL of the text file to fetch
   * @returns Promise resolving to the text content
   */
  public async fetchText(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.text();
    } catch (error: Error) {
      console.error('Error fetching text from Blob URL:', error);
      throw new Error(`Failed to fetch text: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const blobService = new BlobService();