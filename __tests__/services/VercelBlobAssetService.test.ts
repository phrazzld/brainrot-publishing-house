import { AssetType, AssetUrlOptions } from '../../types/assets';
import { Logger } from '../../utils/logger';
import { AssetPathService } from '../../utils/services/AssetPathService';
import { VercelBlobAssetService } from '../../utils/services/VercelBlobAssetService';

// Mock @vercel/blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://example.com/assets/test.txt',
    pathname: 'assets/test.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
    contentLength: 100,
    uploadedAt: new Date(),
  }),
  list: jest.fn().mockResolvedValue({
    blobs: [
      {
        url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
        pathname: 'assets/audio/the-iliad/chapter-01.mp3',
        downloadUrl: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
        contentType: 'audio/mpeg',
        contentLength: 1000000,
        uploadedAt: new Date(),
      },
      {
        url: 'https://example.com/assets/audio/the-iliad/chapter-02.mp3',
        pathname: 'assets/audio/the-iliad/chapter-02.mp3',
        downloadUrl: 'https://example.com/assets/audio/the-iliad/chapter-02.mp3',
        contentType: 'audio/mpeg',
        contentLength: 2000000,
        uploadedAt: new Date(),
      },
    ],
    cursor: undefined,
  }),
  head: jest.fn().mockResolvedValue({
    url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    pathname: 'assets/audio/the-iliad/chapter-01.mp3',
    contentType: 'audio/mpeg',
    contentLength: 1000000,
    uploadedAt: new Date(),
  }),
  del: jest.fn().mockResolvedValue(undefined),
}));

// Mock File constructor for uploads
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name;
    this.type = options?.type || '';
    this.size = 0;
    this.lastModified = options?.lastModified || Date.now();
  }

  text(): Promise<string> {
    return Promise.resolve('');
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  slice(_start?: number, _end?: number, _contentType?: string): Blob {
    return new Blob();
  }

  stream(): ReadableStream<Uint8Array> {
    throw new Error('Not implemented in mock');
  }
} as unknown as typeof File;

// Mock response objects
const mockArrayBuffer = new ArrayBuffer(8);
const mockTextResponse = 'This is the text content';

// Create mock logger
const createMockLogger = (): jest.Mocked<Logger> => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

// Mock global.fetch for testing fetchAsset and fetchTextAsset
global.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(mockTextResponse),
    arrayBuffer: () => Promise.resolve(mockArrayBuffer),
  } as unknown as Response);
});

// Import the actual implementations and mocks
const { put, list, head, del } = require('@vercel/blob');

describe('VercelBlobAssetService', () => {
  let service: VercelBlobAssetService;
  let pathService: AssetPathService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create dependencies
    pathService = new AssetPathService();
    mockLogger = createMockLogger();

    // Create service with environment variables
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://public.blob.vercel-storage.com';
    process.env.BLOB_READ_WRITE_TOKEN = 'mock-token';

    // Create service instance
    service = new VercelBlobAssetService(
      pathService,
      {
        baseUrl: 'https://public.blob.vercel-storage.com',
        rootPrefix: 'assets',
        defaultCacheControl: 'public, max-age=31536000',
        defaultCacheBusting: false,
      },
      mockLogger
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  describe('getAssetUrl', () => {
    it('should generate a valid asset URL', async () => {
      const url = await service.getAssetUrl(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      expect(url).toBe(
        'https://public.blob.vercel-storage.com/assets/audio/the-iliad/chapter-01.mp3'
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should add cache busting when requested', async () => {
      // Mock Date.now() for consistent testing
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      try {
        const options: AssetUrlOptions = { cacheBusting: true };
        const url = await service.getAssetUrl(AssetType.TEXT, 'hamlet', 'fulltext.txt', options);

        expect(url).toContain(
          'https://public.blob.vercel-storage.com/assets/text/hamlet/fulltext.txt?'
        );
        expect(url).toContain('_t=1234567890');
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should handle errors gracefully', async () => {
      // Simulate an error by making head() throw
      head.mockRejectedValueOnce(new Error('Internal server error'));

      // Should still return a URL even when verification fails
      const url = await service.getAssetUrl(AssetType.IMAGE, 'macbeth', 'cover.jpg');

      expect(url).toBe('https://public.blob.vercel-storage.com/assets/image/macbeth/cover.jpg');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('assetExists', () => {
    it('should return true when asset exists', async () => {
      head.mockResolvedValueOnce({
        url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
        pathname: 'assets/audio/the-iliad/chapter-01.mp3',
      });

      const exists = await service.assetExists(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      expect(exists).toBe(true);
      expect(head).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should return false when asset does not exist', async () => {
      head.mockRejectedValueOnce(new Error('Asset not found'));

      const exists = await service.assetExists(AssetType.AUDIO, 'the-iliad', 'missing.mp3');

      expect(exists).toBe(false);
      expect(head).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('fetchAsset', () => {
    it('should fetch an asset as ArrayBuffer', async () => {
      const content = await service.fetchAsset(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('the-iliad/chapter-01.mp3')
      );
      expect(content).toBe(mockArrayBuffer);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('fetchTextAsset', () => {
    it('should fetch a text asset as string', async () => {
      const content = await service.fetchTextAsset('the-iliad', 'fulltext.txt');

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('the-iliad/fulltext.txt'));
      expect(content).toBe(mockTextResponse);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('uploadAsset', () => {
    it('should upload text content successfully', async () => {
      const content = 'This is text content';
      const result = await service.uploadAsset({
        assetType: AssetType.TEXT,
        bookSlug: 'the-odyssey',
        assetName: 'chapter-01.txt',
        content,
      });

      expect(put).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          url: expect.any(String),
          size: expect.any(Number),
          contentType: expect.any(String),
          uploadedAt: expect.any(Date),
        })
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should upload blob content successfully', async () => {
      const content = new Blob(['binary content'], { type: 'application/octet-stream' });
      const result = await service.uploadAsset({
        assetType: AssetType.AUDIO,
        bookSlug: 'hamlet',
        assetName: 'chapter-02.mp3',
        content,
        options: { contentType: 'audio/mpeg' },
      });

      expect(put).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          url: expect.any(String),
          size: expect.any(Number),
          contentType: expect.any(String),
          uploadedAt: expect.any(Date),
        })
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle upload errors properly', async () => {
      put.mockRejectedValueOnce(new Error('Upload failed'));

      try {
        await service.uploadAsset({
          assetType: AssetType.TEXT,
          bookSlug: 'the-odyssey',
          assetName: 'chapter-01.txt',
          content: 'content',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('deleteAsset', () => {
    it('should delete an asset successfully', async () => {
      const result = await service.deleteAsset(AssetType.TEXT, 'the-iliad', 'chapter-01.txt');

      expect(del).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle delete errors properly', async () => {
      del.mockRejectedValueOnce(new Error('Delete failed'));

      try {
        await service.deleteAsset(AssetType.TEXT, 'the-iliad', 'chapter-01.txt');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('listAssets', () => {
    it('should list assets successfully', async () => {
      const result = await service.listAssets(AssetType.AUDIO, 'the-iliad');

      expect(list).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              path: expect.any(String),
              url: expect.any(String),
            }),
          ]),
          hasMore: expect.any(Boolean),
        })
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle list options', async () => {
      await service.listAssets(AssetType.AUDIO, 'the-iliad', {
        limit: 10,
        cursor: 'next-page',
      });

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          cursor: 'next-page',
        })
      );
    });

    it('should handle list errors properly', async () => {
      list.mockRejectedValueOnce(new Error('List failed'));

      try {
        await service.listAssets(AssetType.AUDIO, 'the-iliad');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle retry logic on transient errors', async () => {
      // Clean call counting
      jest.clearAllMocks();

      // Setup a special counter for the number of fetch calls
      let fetchCallCount = 0;

      // Setup custom fetch mock for this test that fails twice then succeeds
      global.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount <= 2) {
          throw new Error(`Network error ${fetchCallCount}`);
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
          } as unknown as Response);
        }
      });

      const content = await service.fetchAsset(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      // Verify fetch behavior
      expect(fetchCallCount).toBe(3);
      expect(content).toBe(mockArrayBuffer);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Two warnings for the retries
      expect(mockLogger.info).toHaveBeenCalled(); // Success log
    });
  });
});
