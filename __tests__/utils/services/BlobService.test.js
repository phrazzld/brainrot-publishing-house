/**
 * BlobService tests - converted to JavaScript to avoid ESM/TypeScript issues
 */

// Mock the @vercel/blob module
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://example.com/test.txt',
    pathname: 'test.txt',
  }),
  list: jest.fn().mockResolvedValue({
    blobs: [
      { url: 'https://example.com/file1.txt', pathname: 'file1.txt' },
      { url: 'https://example.com/file2.txt', pathname: 'file2.txt' },
    ],
    cursor: undefined,
  }),
  head: jest.fn().mockResolvedValue({
    url: 'https://example.com/test.txt',
    pathname: 'test.txt',
    contentType: 'text/plain',
    contentLength: 100,
  }),
  del: jest.fn().mockResolvedValue(undefined),
}));

// Mock global.fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: jest.fn().mockResolvedValue('Test content'),
});

// Mock the File constructor
global.File = class File {
  constructor(content, name, options = {}) {
    this.content = content;
    this.name = name;
    this.options = options;
    this.type = options.type || '';
  }
};

// Mock the Blob constructor
global.Blob = class Blob {
  constructor(content, options = {}) {
    this.content = content;
    this.options = options;
    this.type = options.type || '';
  }
};

// Import the BlobService and the mocked modules
const { BlobService } = require('../../../utils/services/BlobService');
const { put, list, head, del } = require('@vercel/blob');

describe('BlobService', () => {
  let blobService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    blobService = new BlobService();

    // Set environment variables for testing
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://blob.example.com';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });

  describe('uploadFile', () => {
    it('should upload a file with default options', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      // Act
      const result = await blobService.uploadFile(mockFile);

      // Assert
      expect(put).toHaveBeenCalledWith('test.txt', mockFile, { access: 'public' });
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      });
    });

    it('should upload a file with custom options', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        pathname: 'books/hamlet',
        filename: 'custom.txt',
        access: 'private',
        addRandomSuffix: true,
        cacheControl: 'max-age=3600',
        contentType: 'text/html',
      };

      // Act
      const result = await blobService.uploadFile(mockFile, options);

      // Assert
      expect(put).toHaveBeenCalledWith('books/hamlet/custom.txt', mockFile, {
        access: 'private',
        addRandomSuffix: true,
        cacheControl: 'max-age=3600',
        contentType: 'text/html',
      });
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      });
    });

    it('should handle trailing slashes in pathname', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        pathname: 'books/hamlet/',
        filename: 'scene.txt',
      };

      // Act
      const result = await blobService.uploadFile(mockFile, options);

      // Assert
      expect(put).toHaveBeenCalledWith('books/hamlet/scene.txt', mockFile, { access: 'public' });
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      });
    });

    it('should throw error when upload fails', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      put.mockRejectedValueOnce(new Error('Upload failed'));

      // Act & Assert
      await expect(blobService.uploadFile(mockFile)).rejects.toThrow(
        'Failed to upload file: Upload failed'
      );
    });
  });

  describe('uploadText', () => {
    it('should upload text content', async () => {
      // Arrange
      const content = 'Hello, world!';
      const path = 'books/hamlet/scene1.txt';

      // Spy on uploadFile method
      jest.spyOn(blobService, 'uploadFile');

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
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      });
    });

    it('should handle root path', async () => {
      // Arrange
      const content = 'Hello, world!';
      const path = 'file.txt';

      // Spy on uploadFile method
      jest.spyOn(blobService, 'uploadFile');

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
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
      });
    });
  });

  describe('listFiles', () => {
    it('should list files with default options', async () => {
      // Act
      const result = await blobService.listFiles();

      // Assert
      expect(list).toHaveBeenCalledWith({});
      expect(result).toEqual({
        blobs: [
          { url: 'https://example.com/file1.txt', pathname: 'file1.txt' },
          { url: 'https://example.com/file2.txt', pathname: 'file2.txt' },
        ],
        cursor: undefined,
      });
    });

    it('should list files with custom options', async () => {
      // Arrange
      const options = {
        prefix: 'books/hamlet/',
        limit: 10,
        cursor: 'abc123',
      };

      // Act
      const result = await blobService.listFiles(options);

      // Assert
      expect(list).toHaveBeenCalledWith(options);
      expect(result).toEqual({
        blobs: [
          { url: 'https://example.com/file1.txt', pathname: 'file1.txt' },
          { url: 'https://example.com/file2.txt', pathname: 'file2.txt' },
        ],
        cursor: undefined,
      });
    });
  });

  describe('getFileInfo', () => {
    it('should get file info', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';

      // Act
      const result = await blobService.getFileInfo(url);

      // Assert
      expect(head).toHaveBeenCalledWith(url);
      expect(result).toEqual({
        url: 'https://example.com/test.txt',
        pathname: 'test.txt',
        contentType: 'text/plain',
        contentLength: 100,
      });
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
      // Act
      const result = blobService.getUrlForPath('books/hamlet/scene1.txt');

      // Assert
      expect(result).toBe('https://blob.example.com/books/hamlet/scene1.txt');
    });

    it('should handle leading slashes', () => {
      // Act
      const result = blobService.getUrlForPath('/books/hamlet/scene1.txt');

      // Assert
      expect(result).toBe('https://blob.example.com/books/hamlet/scene1.txt');
    });

    it('should use default hostname if env var not set', () => {
      // Arrange - remove the environment variable
      delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;

      // Act
      const result = blobService.getUrlForPath('books/hamlet/scene1.txt');

      // Assert
      expect(result).toBe('https://public.blob.vercel-storage.com/books/hamlet/scene1.txt');
    });

    it('should use provided baseUrl option', () => {
      // Act
      const result = blobService.getUrlForPath('books/hamlet/scene1.txt', {
        baseUrl: 'https://custom-cdn.example.com',
      });

      // Assert
      expect(result).toBe('https://custom-cdn.example.com/books/hamlet/scene1.txt');
    });

    it('should add cache busting parameter when noCache is true', () => {
      // Arrange - mock Date.now
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      try {
        // Act
        const result = blobService.getUrlForPath('books/hamlet/scene1.txt', { noCache: true });

        // Assert
        expect(result).toBe('https://blob.example.com/books/hamlet/scene1.txt?_t=1234567890');
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });

    it('should correctly append cache busting parameter to URLs with existing query parameters', () => {
      // Arrange - mock Date.now
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      try {
        // Act
        const result = blobService.getUrlForPath('books/hamlet/scene1.txt?existing=param', {
          noCache: true,
        });

        // Assert
        expect(result).toBe(
          'https://blob.example.com/books/hamlet/scene1.txt?existing=param&_t=1234567890'
        );
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

      // Act
      const result = await blobService.fetchText(url);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(result).toBe('Test content');
    });

    it('should throw error when fetch fails', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Act & Assert
      await expect(blobService.fetchText(url)).rejects.toThrow(
        'Failed to fetch text: HTTP error! Status: 404'
      );
    });

    it('should throw error when network fails', async () => {
      // Arrange
      const url = 'https://example.com/file.txt';
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(blobService.fetchText(url)).rejects.toThrow(
        'Failed to fetch text: Network error'
      );
    });
  });
});
