import { BlobService } from '../../../utils/services/BlobService';
import { put, list, head, del } from '@vercel/blob';

// Mock @vercel/blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  list: jest.fn(),
  head: jest.fn(),
  del: jest.fn(),
}));

describe('BlobService', () => {
  let blobService: BlobService;
  
  beforeEach(() => {
    blobService = new BlobService();
    jest.clearAllMocks();
  });
  
  describe('uploadFile', () => {
    it('should upload a file with default options', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockResult = {
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      };
      (put as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.uploadFile(mockFile);
      
      // Assert
      expect(put).toHaveBeenCalledWith('test.txt', mockFile, { access: 'public' });
      expect(result).toEqual(mockResult);
    });
    
    it('should upload a file with custom options', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        pathname: 'books/hamlet',
        filename: 'custom.txt',
        access: 'private' as const,
        addRandomSuffix: true,
        cacheControl: 'max-age=3600',
        contentType: 'text/html',
      };
      const mockResult = {
        url: 'https://example.com/books/hamlet/custom.txt',
        pathname: 'books/hamlet/custom.txt',
      };
      (put as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.uploadFile(mockFile, options);
      
      // Assert
      expect(put).toHaveBeenCalledWith('books/hamlet/custom.txt', mockFile, {
        access: 'private',
        addRandomSuffix: true,
        cacheControl: 'max-age=3600',
        contentType: 'text/html',
      });
      expect(result).toEqual(mockResult);
    });
    
    it('should handle trailing slashes in pathname', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        pathname: 'books/hamlet/',
        filename: 'scene.txt',
      };
      const mockResult = {
        url: 'https://example.com/books/hamlet/scene.txt',
        pathname: 'books/hamlet/scene.txt',
      };
      (put as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.uploadFile(mockFile, options);
      
      // Assert
      expect(put).toHaveBeenCalledWith('books/hamlet/scene.txt', mockFile, { access: 'public' });
      expect(result).toEqual(mockResult);
    });
    
    it('should throw error when upload fails', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      (put as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      
      // Act & Assert
      await expect(blobService.uploadFile(mockFile)).rejects.toThrow('Failed to upload file: Upload failed');
    });
  });
  
  describe('uploadText', () => {
    it('should upload text content', async () => {
      // Arrange
      const content = 'Hello, world!';
      const path = 'books/hamlet/scene1.txt';
      const mockResult = {
        url: 'https://example.com/books/hamlet/scene1.txt',
        pathname: 'books/hamlet/scene1.txt',
      };
      
      // Mock the uploadFile method
      jest.spyOn(blobService, 'uploadFile').mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.uploadText(content, path);
      
      // Assert
      expect(blobService.uploadFile).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          pathname: 'books/hamlet',
          filename: 'scene1.txt',
        })
      );
      expect(result).toEqual(mockResult);
    });
    
    it('should handle root path', async () => {
      // Arrange
      const content = 'Hello, world!';
      const path = 'file.txt';
      const mockResult = {
        url: 'https://example.com/file.txt',
        pathname: 'file.txt',
      };
      
      // Mock the uploadFile method
      jest.spyOn(blobService, 'uploadFile').mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.uploadText(content, path);
      
      // Assert
      expect(blobService.uploadFile).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          pathname: '',
          filename: 'file.txt',
        })
      );
      expect(result).toEqual(mockResult);
    });
  });
  
  describe('listFiles', () => {
    it('should list files with default options', async () => {
      // Arrange
      const mockResult = {
        blobs: [
          { url: 'https://example.com/file1.txt', pathname: 'file1.txt' },
          { url: 'https://example.com/file2.txt', pathname: 'file2.txt' },
        ],
        cursor: undefined,
      };
      (list as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.listFiles();
      
      // Assert
      expect(list).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });
    
    it('should list files with custom options', async () => {
      // Arrange
      const options = {
        prefix: 'books/hamlet/',
        limit: 10,
        cursor: 'abc123',
      };
      const mockResult = {
        blobs: [
          { url: 'https://example.com/books/hamlet/scene1.txt', pathname: 'books/hamlet/scene1.txt' },
          { url: 'https://example.com/books/hamlet/scene2.txt', pathname: 'books/hamlet/scene2.txt' },
        ],
        cursor: 'def456',
      };
      (list as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.listFiles(options);
      
      // Assert
      expect(list).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResult);
    });
  });
  
  describe('getFileInfo', () => {
    it('should get file info', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      const mockResult = {
        url,
        pathname: 'file.txt',
        contentType: 'text/plain',
        contentLength: 13,
      };
      (head as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await blobService.getFileInfo(url);
      
      // Assert
      expect(head).toHaveBeenCalledWith(url);
      expect(result).toEqual(mockResult);
    });
  });
  
  describe('deleteFile', () => {
    it('should delete a file', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      
      // Act
      await blobService.deleteFile(url);
      
      // Assert
      expect(del).toHaveBeenCalledWith(url);
    });
  });
  
  describe('getUrlForPath', () => {
    it('should generate URL for path', () => {
      // Arrange
      const path = 'books/hamlet/scene1.txt';
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://my-blob-store.com';
      
      // Act
      const result = blobService.getUrlForPath(path);
      
      // Assert
      expect(result).toBe('https://my-blob-store.com/books/hamlet/scene1.txt');
    });
    
    it('should handle leading slashes', () => {
      // Arrange
      const path = '/books/hamlet/scene1.txt';
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://my-blob-store.com';
      
      // Act
      const result = blobService.getUrlForPath(path);
      
      // Assert
      expect(result).toBe('https://my-blob-store.com/books/hamlet/scene1.txt');
    });
    
    it('should use default hostname if env var not set', () => {
      // Arrange
      const path = 'books/hamlet/scene1.txt';
      delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      
      // Act
      const result = blobService.getUrlForPath(path);
      
      // Assert
      expect(result).toBe('https://public.blob.vercel-storage.com/books/hamlet/scene1.txt');
    });
    
    it('should use provided baseUrl option', () => {
      // Arrange
      const path = 'books/hamlet/scene1.txt';
      const options = { baseUrl: 'https://custom-cdn.example.com' };
      
      // Even with env var set, should use provided baseUrl
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://my-blob-store.com';
      
      // Act
      const result = blobService.getUrlForPath(path, options);
      
      // Assert
      expect(result).toBe('https://custom-cdn.example.com/books/hamlet/scene1.txt');
    });
    
    it('should add cache busting parameter when noCache is true', () => {
      // Arrange
      const path = 'books/hamlet/scene1.txt';
      const options = { noCache: true };
      
      // Mock Date.now() to get consistent test output
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);
      
      try {
        // Act
        const result = blobService.getUrlForPath(path, options);
        
        // Assert
        expect(result).toBe('https://public.blob.vercel-storage.com/books/hamlet/scene1.txt?_t=1234567890');
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
    
    it('should correctly append cache busting parameter to URLs with existing query parameters', () => {
      // Arrange
      const path = 'books/hamlet/scene1.txt?existing=param';
      const options = { noCache: true };
      
      // Mock Date.now() to get consistent test output
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);
      
      try {
        // Act
        const result = blobService.getUrlForPath(path, options);
        
        // Assert
        expect(result).toBe('https://public.blob.vercel-storage.com/books/hamlet/scene1.txt?existing=param&_t=1234567890');
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
  });
  
  describe('fetchText', () => {
    it('should fetch text from URL', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      const mockText = 'Hello, world!';
      
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockText),
      });
      
      // Act
      const result = await blobService.fetchText(url);
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(result).toBe(mockText);
    });
    
    it('should throw error when fetch fails', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      
      // Act & Assert
      await expect(blobService.fetchText(url)).rejects.toThrow('Failed to fetch text: HTTP error! Status: 404');
    });
    
    it('should throw error when network fails', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      
      // Mock fetch
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Act & Assert
      await expect(blobService.fetchText(url)).rejects.toThrow('Failed to fetch text: Network error');
    });
  });
});