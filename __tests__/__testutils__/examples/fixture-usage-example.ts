/**
 * Example showing best practices for using type-safe fixtures and utilities
 * This file demonstrates how to write clean, type-safe tests with the available utilities
 */
import { expect } from '@jest/globals';

import {
  expectFetchCalledWith,
  expectLoggedWithContext,
  expectPathStructure,
  expectValidAssetUrl,
} from '../assertions.js';
import {
  BookBuilder,
  createAudioAssetFixture,
  createErrorResponse,
  createSuccessFetch,
  createTextAssetFixture,
  createTextResponse,
} from '../fixtures.js';
import { createMockLogger, createMockVercelBlobAssetService } from '../mocks/factories.js';
import { MockLogger } from '../mocks/interfaces.js';
import { MockVercelBlobAssetService } from '../mocks/interfaces.js';

// Example component that we want to test
class AssetManager {
  constructor(
    private readonly assetService: MockVercelBlobAssetService,
    private readonly logger: MockLogger,
  ) {}

  async fetchAsset(assetType: string, bookSlug: string, assetName: string): Promise<string> {
    try {
      this.logger.info({ msg: 'Fetching asset', assetType, bookSlug, assetName });
      const url = await this.assetService.getAssetUrl(assetType, bookSlug, assetName);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      this.logger.error({
        msg: 'Failed to fetch asset',
        assetType,
        bookSlug,
        assetName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Example test suite demonstrating best practices
describe('AssetManager', () => {
  // Create type-safe mocks
  const mockLogger = createMockLogger();
  const mockAssetService = createMockVercelBlobAssetService();

  // Create fixtures for test data
  const textAsset = createTextAssetFixture('hamlet', 1);
  const audioAsset = createAudioAssetFixture('hamlet', 1);

  // Create component under test
  const assetManager = new AssetManager(mockAssetService, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('fetchAsset', () => {
    it('should fetch text assets successfully', async () => {
      // Set up mocks with type-safe fixtures
      mockAssetService.getAssetUrl.mockResolvedValue(textAsset.url);
      global.fetch = createSuccessFetch('To be or not to be...');

      // Execute the function under test
      const result = await assetManager.fetchAsset('text', 'hamlet', textAsset.assetName);

      // Type-safe assertions
      expect(result).toBe('To be or not to be...');
      expect(mockAssetService.getAssetUrl).toHaveBeenCalledWith(
        'text',
        'hamlet',
        textAsset.assetName,
      );
      expectFetchCalledWith(textAsset.url);
      expectLoggedWithContext(mockLogger.info, {
        msg: 'Fetching asset',
        assetType: 'text',
        bookSlug: 'hamlet',
      });

      // Verify URL structure
      expectValidAssetUrl(textAsset.url, 'text', 'hamlet', textAsset.assetName);
    });

    it('should handle fetch errors gracefully', async () => {
      // Set up mocks with type-safe fixtures
      mockAssetService.getAssetUrl.mockResolvedValue(audioAsset.url);
      global.fetch = jest.fn().mockResolvedValue(createErrorResponse(404, 'Not Found'));

      // Verify error handling
      await expect(
        assetManager.fetchAsset('audio', 'hamlet', audioAsset.assetName),
      ).rejects.toThrow('HTTP error! Status: 404');

      // Verify error was logged
      expectLoggedWithContext(mockLogger.error, {
        msg: 'Failed to fetch asset',
        assetType: 'audio',
        bookSlug: 'hamlet',
      });
    });

    it('should handle network errors', async () => {
      // Set up mocks with type-safe fixtures
      mockAssetService.getAssetUrl.mockResolvedValue(audioAsset.url);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Verify error handling
      await expect(
        assetManager.fetchAsset('audio', 'hamlet', audioAsset.assetName),
      ).rejects.toThrow('Network error');

      // Verify error was logged
      expectLoggedWithContext(mockLogger.error, {
        msg: 'Failed to fetch asset',
        error: 'Network error',
      });
    });
  });

  // Example of using builder pattern for complex objects
  describe('with complex book structure', () => {
    it('should fetch chapters from a book with many chapters', async () => {
      // Create a complex book structure using the builder pattern
      const _complexBook = new BookBuilder()
        .withSlug('republic')
        .withTitle('The Republic')
        .withAuthor('Plato')
        .withChapters(10)
        .build();

      // Test with a specific chapter
      const chapterNumber = 3;
      const textAsset = createTextAssetFixture('republic', chapterNumber);

      // Setup mocks
      mockAssetService.getAssetUrl.mockResolvedValue(textAsset.url);
      global.fetch = jest
        .fn()
        .mockResolvedValue(createTextResponse('In the Republic, Plato says...'));

      // Execute the function under test
      const result = await assetManager.fetchAsset('text', 'republic', textAsset.assetName);

      // Assertions
      expect(result).toBe('In the Republic, Plato says...');
      expect(mockAssetService.getAssetUrl).toHaveBeenCalledWith(
        'text',
        'republic',
        textAsset.assetName,
      );

      // Verify the path follows our convention
      expectPathStructure(textAsset.path, {
        prefix: 'assets',
        assetType: 'text',
        bookSlug: 'republic',
        filename: /chapter-03\.txt$/,
      });
    });
  });
});
