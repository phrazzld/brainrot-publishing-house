import {
  HeadBlobResult,
  ListBlobResultBlob,
  PutBlobResult,
  del,
  head,
  list,
  put,
} from '@vercel/blob';

export type BlobAccess = 'public';

export interface UploadOptions {
  pathname?: string;
  filename?: string;
  access?: BlobAccess;
  addRandomSuffix?: boolean;
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
      const fullPath = pathname ? `${pathname.replace(/\/+$/, '')}/${filename}` : filename;

      // Upload to Vercel Blob
      return await put(fullPath, file, {
        access: options.access || 'public',
        addRandomSuffix: options.addRandomSuffix,
        contentType: options.contentType,
      });
    } catch (error: unknown) {
      console.error('Error uploading file to Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file: ${errorMessage}`);
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
    options: Omit<UploadOptions, 'pathname' | 'filename'> = {},
  ): Promise<PutBlobResult> {
    try {
      // Create a Blob from the text content
      const blob = new Blob([content], {
        type: options.contentType || 'text/plain',
      });

      // Convert to File object
      const file = new File([blob], path.split('/').pop() || 'file.txt', {
        type: options.contentType || 'text/plain',
      });

      // Get the directory path
      const pathname = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

      // Upload the file
      return await this.uploadFile(file, {
        ...options,
        pathname,
        filename: path.split('/').pop(),
      });
    } catch (error: unknown) {
      console.error('Error uploading text to Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload text: ${errorMessage}`);
    }
  }

  /**
   * List files in Blob storage
   * @param options List options
   * @returns Promise resolving to a list of blobs
   */
  public async listFiles(options: ListOptions = {}): Promise<{
    blobs: ListBlobResultBlob[];
    cursor?: string;
  }> {
    try {
      return await list({
        prefix: options.prefix,
        limit: options.limit,
        cursor: options.cursor,
      });
    } catch (error: unknown) {
      console.error('Error listing files from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list files: ${errorMessage}`);
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
    } catch (error: unknown) {
      console.error('Error getting file info from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get file info: ${errorMessage}`);
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
    } catch (error: unknown) {
      console.error('Error deleting file from Blob storage:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete file: ${errorMessage}`);
    }
  }

  /**
   * Generate a full URL for a blob path within Blob storage
   * This is useful when you need to reference a file that will be uploaded in the future
   * @param path The path of the file
   * @param options Optional configuration for URL generation
   * @returns The full URL to the file (this assumes public access)
   */
  public getUrlForPath(path: string, options?: { baseUrl?: string; noCache?: boolean }): string {
    // Use provided base URL, environment variable, or default
    let hostname =
      options?.baseUrl ||
      process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
      'https://public.blob.vercel-storage.com';

    // Fix for the hostname discrepancy during verification
    // When we have a generic https://public.blob.vercel-storage.com URL, use the correct one from env
    if (
      hostname === 'https://public.blob.vercel-storage.com' &&
      process.env.NEXT_PUBLIC_BLOB_BASE_URL
    ) {
      hostname = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    }

    // Clean up the path and ensure it doesn't start with a slash
    const cleanPath = path.replace(/^\/+/, '');

    // Generate the URL
    const url = `${hostname}/${cleanPath}`;

    // Add cache busting if requested
    if (options?.noCache) {
      const cacheBuster = `_t=${Date.now()}`;
      return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    }

    return url;
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
    } catch (error: unknown) {
      console.error('Error fetching text from Blob URL:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch text: ${errorMessage}`);
    }
  }
}

// Export a singleton instance
export const blobService = new BlobService();
