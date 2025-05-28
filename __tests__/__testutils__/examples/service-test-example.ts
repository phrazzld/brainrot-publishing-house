/**
 * Example test file demonstrating the use of type-safe test utilities
 * This is a reference implementation that shows best practices
 */
import { jest } from '@jest/globals';

import { AssetType } from '../../../types/assets';
import { AssetPathService } from '../../../utils/services/AssetPathService';
import { VercelBlobAssetService } from '../../../utils/services/VercelBlobAssetService';
// Import assertion utilities
import { expectFetchCalledWith, expectLoggedWithContext, expectPathStructure } from '../assertions';
// Import mock factories
import { createMockAssetPathService, createMockLogger } from '../mocks/factories';
// Import network utilities
import { createBinaryResponse, createJsonResponse } from '../network';

describe('VercelBlobAssetService Example Test', () => {
  // Set up mocks using the factory functions
  const mockLogger = createMockLogger();
  const mockAssetPathService = createMockAssetPathService();
  let service: VercelBlobAssetService;

  // Mock fetch function
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Clear mock state before each test
    jest.clearAllMocks();

    // Set up environment variables
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://public.blob.vercel-storage.com';
    process.env.BLOB_READ_WRITE_TOKEN = 'mock-token';

    // Create service instance with mocked dependencies
    service = new VercelBlobAssetService(
      mockAssetPathService as unknown as AssetPathService,
      {
        baseUrl: 'https://public.blob.vercel-storage.com',
        rootPrefix: 'assets',
        defaultCacheControl: 'public, max-age=31536000',
        defaultCacheBusting: false,
      },
      mockLogger,
    );

    // Set up mock fetch implementation
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // Restore original fetch and clean up env vars
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  describe('getAssetUrl', () => {
    it('should generate a valid asset URL', async () => {
      // Set up path service mock
      mockAssetPathService.getAssetPath.mockReturnValue('assets/audio/the-iliad/chapter-01.mp3');

      // Call the method under test
      const url = await service.getAssetUrl(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      // Check result using our custom assertion
      expectPathStructure(url, {
        prefix: 'https://public.blob.vercel-storage.com',
        assetType: 'audio',
        bookSlug: 'the-iliad',
        filename: 'chapter-01.mp3',
      });

      // Verify logger was called with correct context
      expectLoggedWithContext(mockLogger.info, {
        msg: expect.stringContaining('Generated asset URL'),
        assetType: AssetType.AUDIO,
        bookSlug: 'the-iliad',
      });
    });
  });

  describe('fetchAsset', () => {
    it('should fetch an asset as ArrayBuffer', async () => {
      // Set up mock implementation for path service
      mockAssetPathService.getAssetPath.mockReturnValue('assets/audio/the-iliad/chapter-01.mp3');

      // Create mock binary response
      const mockArrayBuffer = new ArrayBuffer(100);
      const mockBinaryResponse = createBinaryResponse(mockArrayBuffer, 'audio/mpeg');

      // Set up fetch mock to return binary response
      (global.fetch as jest.Mock).mockResolvedValue(mockBinaryResponse);

      // Call the method under test
      const content = await service.fetchAsset(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      // Assert fetch was called with correct URL
      expectFetchCalledWith(expect.stringContaining('the-iliad/chapter-01.mp3'));

      // Assert result is as expected
      expect(content).toBe(mockArrayBuffer);

      // Verify logging
      expectLoggedWithContext(mockLogger.info, {
        msg: expect.stringContaining('Fetched asset'),
        assetType: AssetType.AUDIO,
        bookSlug: 'the-iliad',
      });
    });

    it('should retry on transient errors', async () => {
      // Set up mock implementation for path service
      mockAssetPathService.getAssetPath.mockReturnValue('assets/audio/the-iliad/chapter-01.mp3');

      // Create mock binary response for successful attempt
      const mockArrayBuffer = new ArrayBuffer(100);
      const mockBinaryResponse = createBinaryResponse(mockArrayBuffer, 'audio/mpeg');

      // Set up fetch mock to fail twice then succeed
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce(mockBinaryResponse);

      // Call the method under test
      const content = await service.fetchAsset(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');

      // Verify fetch was called multiple times
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Assert result is as expected
      expect(content).toBe(mockArrayBuffer);

      // Verify warning logs for retries
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);

      // Verify success log
      expectLoggedWithContext(mockLogger.info, {
        msg: expect.stringContaining('Fetched asset'),
      });
    });
  });

  describe('fetchTextAsset', () => {
    it('should fetch a text asset as string', async () => {
      // Set up mock implementation for path service
      mockAssetPathService.getAssetPath.mockReturnValue('assets/text/the-iliad/fulltext.txt');

      // Create mock text response
      const mockTextContent = 'This is the text content';
      const mockTextResponse = createJsonResponse(mockTextContent);

      // Set up fetch mock to return text response
      (global.fetch as jest.Mock).mockResolvedValue(mockTextResponse);

      // Call the method under test
      const content = await service.fetchTextAsset('the-iliad', 'fulltext.txt');

      // Assert fetch was called with correct URL
      expectFetchCalledWith(expect.stringContaining('the-iliad/fulltext.txt'));

      // Assert result is as expected
      expect(content).toBe(mockTextContent);

      // Verify logging
      expectLoggedWithContext(mockLogger.info, {
        msg: expect.stringContaining('Fetched text asset'),
        bookSlug: 'the-iliad',
      });
    });
  });
});
