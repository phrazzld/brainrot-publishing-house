/**
 * Mock fixtures for asset verification tests
 * These fixtures provide standardized test data for verifying asset paths and access
 */
import { AssetType } from '../types/assets';
import {
  createErrorResponse as createMockErrorResponse,
  createSuccessResponse,
} from './MockResponse';

/**
 * Sample book slugs for testing
 */
export const TEST_BOOKS = {
  HAMLET: 'hamlet',
  ILIAD: 'the-iliad',
  ODYSSEY: 'the-odyssey',
  REPUBLIC: 'the-republic',
};

/**
 * Sample text assets for testing
 */
export const TEXT_ASSETS = {
  BRAINROT_CHAPTER: {
    type: AssetType.TEXT,
    bookSlug: TEST_BOOKS.HAMLET,
    name: 'brainrot-chapter-01.txt',
    legacy: 'books/hamlet/text/brainrot/01.txt',
    unified: 'assets/text/hamlet/brainrot-chapter-01.txt',
    content: 'This is the brainrot text for chapter 1',
  },
  BRAINROT_FULLTEXT: {
    type: AssetType.TEXT,
    bookSlug: TEST_BOOKS.HAMLET,
    name: 'brainrot-fulltext.txt',
    legacy: 'books/hamlet/text/brainrot/fulltext.txt',
    unified: 'assets/text/hamlet/brainrot-fulltext.txt',
    content: 'This is the complete brainrot text',
  },
  SOURCE_CHAPTER: {
    type: AssetType.TEXT,
    bookSlug: TEST_BOOKS.ILIAD,
    name: 'source-chapter-02.txt',
    legacy: 'books/the-iliad/text/source/02.txt',
    unified: 'assets/text/the-iliad/source-02.txt', // The actual conversion result for now
    content: 'This is the source text for chapter 2',
  },
  SOURCE_FULLTEXT: {
    type: AssetType.TEXT,
    bookSlug: TEST_BOOKS.ILIAD,
    name: 'source-fulltext.txt',
    legacy: 'books/the-iliad/text/source/fulltext.txt',
    unified: 'assets/text/the-iliad/source-fulltext.txt',
    content: 'This is the complete source text',
  },
};

/**
 * Sample audio assets for testing
 */
export const AUDIO_ASSETS = {
  CHAPTER: {
    type: AssetType.AUDIO,
    bookSlug: TEST_BOOKS.HAMLET,
    name: 'chapter-03.mp3',
    legacy: 'books/hamlet/audio/03.mp3',
    unified: 'assets/audio/hamlet/chapter-03.mp3',
    contentType: 'audio/mpeg',
  },
  FULL_AUDIOBOOK: {
    type: AssetType.AUDIO,
    bookSlug: TEST_BOOKS.ILIAD,
    name: 'full-audiobook.mp3',
    legacy: 'books/the-iliad/audio/full.mp3',
    unified: 'assets/audio/the-iliad/full.mp3', // The actual conversion result for now
    contentType: 'audio/mpeg',
  },
};

/**
 * Sample image assets for testing
 */
export const IMAGE_ASSETS = {
  BOOK_COVER: {
    type: AssetType.IMAGE,
    bookSlug: TEST_BOOKS.ODYSSEY,
    name: 'cover.jpg',
    legacy: 'books/the-odyssey/images/cover.jpg',
    unified: 'assets/image/the-odyssey/cover.jpg',
    contentType: 'image/jpeg',
  },
  CHAPTER_IMAGE: {
    type: AssetType.IMAGE,
    bookSlug: TEST_BOOKS.REPUBLIC,
    name: 'chapter-01-illustration.png',
    legacy: 'books/the-republic/images/01-illustration.png',
    unified: 'assets/image/the-republic/01-illustration.png', // The actual conversion result for now
    contentType: 'image/png',
  },
  SHARED_IMAGE: {
    type: 'shared',
    name: 'publisher-logo.png',
    legacy: 'images/publisher-logo.png',
    unified: 'assets/shared/publisher-logo.png',
    contentType: 'image/png',
  },
  SITE_ASSET: {
    type: 'site',
    name: 'site-icon.svg',
    legacy: 'site-assets/site-icon.svg',
    unified: 'assets/site/site-icon.svg',
    contentType: 'image/svg+xml',
  },
};

/**
 * Mock Blob URL base for testing
 */
export const MOCK_BLOB_BASE_URL = 'https://test-blob-storage.com';

// Note: These functions are kept for backward compatibility
// Use createSuccessResponse and createErrorResponse from MockResponse.ts for new tests

/**
 * Generates a mock HTTP response for a successful asset fetch
 * @param contentType The MIME type of the content
 * @param content The response content
 * @returns A mock Response object
 * @deprecated Use createSuccessResponse from MockResponse.ts instead
 */
export function createMockResponse(contentType: string, content: string | Blob): Response {
  return createSuccessResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Length':
        content instanceof Blob ? content.size.toString() : content.length.toString(),
      'Cache-Control': 'max-age=3600',
    },
  });
}

/**
 * Generates a mock HTTP response for a failed asset fetch
 * @param status The HTTP status code
 * @param statusText The status text message
 * @returns A mock Response object
 * @deprecated Use createErrorResponse from MockResponse.ts instead
 */
export function createErrorResponse(status: number, statusText: string): Response {
  return createMockErrorResponse(status, statusText, `Error ${status}: ${statusText}`);
}
