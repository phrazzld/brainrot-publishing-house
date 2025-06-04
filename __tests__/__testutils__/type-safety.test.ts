/**
 * Type safety test for mock utilities
 * This test ensures our mock factories create properly typed objects
 */
import { createMockAssetPathService, createMockLogger } from './mocks/factories.js';
import { createBinaryResponse, createJsonResponse } from './network/index.js';

describe('Mock Type Safety', () => {
  describe('createMockLogger', () => {
    it('should create a properly typed logger mock', () => {
      const logger = createMockLogger();

      // These should not require type assertions
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.child).toBeInstanceOf(Function);

      // Child method should return a logger
      const childLogger = logger.child({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeInstanceOf(Function);
    });
  });

  describe('createMockAssetPathService', () => {
    it('should create a properly typed asset path service mock', () => {
      const service = createMockAssetPathService();

      // These should work without type assertions
      expect(service.getAssetPath).toBeInstanceOf(Function);
      expect(service.normalizeLegacyPath).toBeInstanceOf(Function);
      expect(service.getTextPath).toBeInstanceOf(Function);
      expect(service.getBookSlugFromPath).toBeInstanceOf(Function);

      // Methods should return expected types
      const assetPath = service.getAssetPath('audio', 'test-book', 'chapter-01.mp3');
      expect(typeof assetPath).toBe('string');

      const bookSlug = service.getBookSlugFromPath('assets/audio/test-book/chapter-01.mp3');
      expect(typeof bookSlug).toBe('string');
    });
  });

  describe('Response utilities', () => {
    it('should create properly typed JSON responses', () => {
      const data = { message: 'test' };
      const response = createJsonResponse(data);

      // Should be a proper Response object
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.headers).toBeInstanceOf(Headers);

      // Methods should be properly typed
      expect(response.json).toBeInstanceOf(Function);
      expect(response.text).toBeInstanceOf(Function);
    });

    it('should create properly typed binary responses', () => {
      const buffer = new ArrayBuffer(100);
      const response = createBinaryResponse(buffer, 'application/octet-stream');

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    });
  });
});
