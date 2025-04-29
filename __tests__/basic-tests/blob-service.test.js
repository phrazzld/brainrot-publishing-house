/**
 * Basic tests for BlobService - using JS instead of TS to avoid ESM issues
 */

// Mock the @vercel/blob module
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://example.com/test.txt',
    pathname: 'test.txt',
  }),
  list: jest.fn().mockResolvedValue({
    blobs: [],
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

// Import the BlobService
const { BlobService } = require('../../utils/services/BlobService');

describe('BlobService', () => {
  let blobService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    blobService = new BlobService();
    
    // Set environment variables
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://blob.example.com';
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });
  
  describe('getUrlForPath', () => {
    it('should generate a URL for a given path', () => {
      // Act
      const url = blobService.getUrlForPath('test/path.txt');
      
      // Assert
      expect(url).toBe('https://blob.example.com/test/path.txt');
    });
    
    it('should remove leading slashes from the path', () => {
      // Act
      const url = blobService.getUrlForPath('/test/path.txt');
      
      // Assert
      expect(url).toBe('https://blob.example.com/test/path.txt');
    });
    
    it('should use a custom base URL if provided', () => {
      // Act
      const url = blobService.getUrlForPath('test/path.txt', { baseUrl: 'https://custom.example.com' });
      
      // Assert
      expect(url).toBe('https://custom.example.com/test/path.txt');
    });
    
    it('should add a cache busting parameter when noCache is true', () => {
      // Mock Date.now to get a consistent result
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(123456789);
      
      // Act
      const url = blobService.getUrlForPath('test/path.txt', { noCache: true });
      
      // Assert
      expect(url).toBe('https://blob.example.com/test/path.txt?_t=123456789');
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});