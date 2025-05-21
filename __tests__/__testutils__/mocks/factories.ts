/**
 * Factory functions for creating type-safe mocks
 * These factories ensure consistent mocking patterns across tests
 */
import { jest } from '@jest/globals';
import { HeadBlobResult, ListBlobResultBlob, PutBlobResult } from '@vercel/blob';

import {
  MockAssetPathService,
  MockBlobPathService,
  MockBlobService,
  MockFetch,
  MockLogger,
  MockResponse,
  MockVercelBlob,
  MockVercelBlobAssetService,
} from './interfaces';

/**
 * Creates a type-safe mock Logger instance
 * @param customImplementations Optional custom implementations to override defaults
 */
export function createMockLogger(customImplementations: Partial<MockLogger> = {}): MockLogger {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
    ...customImplementations,
  };
}

/**
 * Creates a type-safe mock BlobService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobService(
  customImplementations: Partial<MockBlobService> = {}
): MockBlobService {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-file.txt',
      pathname: 'mock-file.txt',
      contentDisposition: 'inline',
      contentType: 'text/plain',
      contentLength: 100,
      uploadedAt: new Date(),
    }),
    uploadText: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-text.txt',
      pathname: 'mock-text.txt',
      contentDisposition: 'inline',
      contentType: 'text/plain',
      contentLength: 100,
      uploadedAt: new Date(),
    }),
    listFiles: jest.fn().mockResolvedValue({
      blobs: [],
      cursor: undefined,
    }),
    getFileInfo: jest.fn().mockResolvedValue({
      url: 'https://example.com/mock-file.txt',
      pathname: 'mock-file.txt',
      contentType: 'text/plain',
      contentLength: 100,
      uploadedAt: new Date(),
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getUrlForPath: jest.fn().mockImplementation((path) => `https://example.com/${path}`),
    fetchText: jest.fn().mockResolvedValue('Mock text content'),
    ...customImplementations,
  } as MockBlobService;
}

/**
 * Creates a type-safe mock BlobPathService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobPathService(
  customImplementations: Partial<MockBlobPathService> = {}
): MockBlobPathService {
  return {
    getAssetPath: jest
      .fn()
      .mockImplementation(
        (assetType, bookSlug, assetName) => `books/${bookSlug}/${assetType}/${assetName}`
      ),
    getBookImagePath: jest
      .fn()
      .mockImplementation((bookSlug, filename) => `books/${bookSlug}/images/${filename}`),
    getBrainrotTextPath: jest
      .fn()
      .mockImplementation((bookSlug, chapter) => `books/${bookSlug}/text/brainrot/${chapter}.txt`),
    getFulltextPath: jest
      .fn()
      .mockImplementation((bookSlug) => `books/${bookSlug}/text/brainrot/fulltext.txt`),
    getSourceTextPath: jest
      .fn()
      .mockImplementation((bookSlug, filename) => `books/${bookSlug}/text/source/${filename}`),
    getSharedImagePath: jest.fn().mockImplementation((filename) => `images/${filename}`),
    getSiteAssetPath: jest.fn().mockImplementation((filename) => `site-assets/${filename}`),
    getAudioPath: jest
      .fn()
      .mockImplementation((bookSlug, chapter) => `books/${bookSlug}/audio/${chapter}.mp3`),
    convertLegacyPath: jest.fn().mockImplementation((legacyPath) => legacyPath),
    getBookSlugFromPath: jest.fn().mockImplementation((path) => {
      const match = path.match(/books\/([^/]+)/);
      return match ? match[1] : null;
    }),
    ...customImplementations,
  } as MockBlobPathService;
}

/**
 * Creates a type-safe mock VercelBlobAssetService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockVercelBlobAssetService(
  customImplementations: Partial<MockVercelBlobAssetService> = {}
): MockVercelBlobAssetService {
  return {
    getAssetUrl: jest
      .fn()
      .mockImplementation((assetType, bookSlug, assetName) =>
        Promise.resolve(`https://example.com/assets/${assetType}/${bookSlug}/${assetName}`)
      ),
    assetExists: jest.fn().mockResolvedValue(true),
    fetchAsset: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
    fetchTextAsset: jest.fn().mockResolvedValue('Mock text content'),
    uploadAsset: jest.fn().mockResolvedValue({
      url: 'https://example.com/assets/mock-asset.txt',
      size: 100,
      contentType: 'text/plain',
      uploadedAt: new Date(),
    }),
    deleteAsset: jest.fn().mockResolvedValue(true),
    listAssets: jest.fn().mockResolvedValue({
      assets: [],
      hasMore: false,
    }),
    ...customImplementations,
  } as MockVercelBlobAssetService;
}

/**
 * Creates a standard mock implementation for @vercel/blob
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockVercelBlob(
  customImplementations: Partial<MockVercelBlob> = {}
): MockVercelBlob {
  const mockPutResult: PutBlobResult = {
    url: 'https://example.com/assets/test.txt',
    pathname: 'assets/test.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
    contentLength: 100,
    uploadedAt: new Date(),
  };

  const mockListResult: ListBlobResultBlob = {
    url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    pathname: 'assets/audio/the-iliad/chapter-01.mp3',
    downloadUrl: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    contentType: 'audio/mpeg',
    contentLength: 1000000,
    uploadedAt: new Date(),
  };

  const mockHeadResult: HeadBlobResult = {
    url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    pathname: 'assets/audio/the-iliad/chapter-01.mp3',
    contentType: 'audio/mpeg',
    contentLength: 1000000,
    uploadedAt: new Date(),
  };

  return {
    put: jest.fn().mockResolvedValue(mockPutResult),
    list: jest.fn().mockResolvedValue({
      blobs: [mockListResult],
      cursor: undefined,
    }),
    head: jest.fn().mockResolvedValue(mockHeadResult),
    del: jest.fn().mockResolvedValue(undefined),
    ...customImplementations,
  };
}

/**
 * Creates a type-safe mock Response
 * @param body The response body content
 * @param options Optional response configuration
 */
export function createMockResponse(
  body: string | ArrayBuffer | Blob = '',
  options: Partial<Response> = {}
): MockResponse {
  const status = options.status || 200;
  const statusText = options.statusText || 'OK';
  const headers = options.headers || new Headers();
  const ok = status >= 200 && status < 300;

  // Create text implementation based on body type
  const textImpl = jest.fn().mockImplementation(async () => {
    if (typeof body === 'string') {
      return body;
    } else if (body instanceof Blob) {
      return await body.text();
    } else if (body instanceof ArrayBuffer) {
      return new TextDecoder().decode(body);
    }
    return '';
  });

  // Create json implementation that parses text
  const jsonImpl = jest.fn().mockImplementation(async () => {
    const text = await textImpl();
    return JSON.parse(text);
  });

  // Create arrayBuffer implementation
  const arrayBufferImpl = jest.fn().mockImplementation(async () => {
    if (body instanceof ArrayBuffer) {
      return body;
    } else if (typeof body === 'string') {
      return new TextEncoder().encode(body).buffer;
    } else if (body instanceof Blob) {
      return await body.arrayBuffer();
    }
    return new ArrayBuffer(0);
  });

  // Create blob implementation
  const blobImpl = jest.fn().mockImplementation(async () => {
    if (body instanceof Blob) {
      return body;
    }
    return new Blob([body instanceof ArrayBuffer ? body : String(body)]);
  });

  return {
    status,
    statusText,
    headers: headers instanceof Headers ? headers : new Headers(headers as HeadersInit),
    ok,
    redirected: false,
    type: 'basic' as ResponseType,
    url: options.url || '',
    bodyUsed: false,
    body: null,
    text: textImpl,
    json: jsonImpl,
    arrayBuffer: arrayBufferImpl,
    blob: blobImpl,
    formData: jest.fn().mockResolvedValue(new FormData()),
    clone: jest.fn(),
  } as MockResponse;
}

/**
 * Creates a type-safe mock fetch implementation
 * @param responseFactory Function that returns the response for each fetch call
 */
export function createMockFetch(responseFactory: () => Response | Promise<Response>): MockFetch {
  return jest.fn().mockImplementation(() => Promise.resolve(responseFactory()));
}

/**
 * Creates a type-safe mock AssetPathService
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockAssetPathService(
  customImplementations: Partial<MockAssetPathService> = {}
): MockAssetPathService {
  return {
    getAssetPath: jest
      .fn()
      .mockImplementation(
        (assetType, bookSlug, assetName) => `assets/${assetType}/${bookSlug}/${assetName}`
      ),
    normalizeLegacyPath: jest.fn().mockImplementation((legacyPath) => {
      if (legacyPath.startsWith('/assets/')) {
        return legacyPath.replace(/^\/assets\/([^/]+)\/images\//, 'assets/image/$1/');
      }
      return legacyPath;
    }),
    getTextPath: jest
      .fn()
      .mockImplementation((bookSlug, textType) => `assets/text/${bookSlug}/${textType}.txt`),
    getBookSlugFromPath: jest.fn().mockImplementation((path) => {
      const match = path.match(/assets\/[^/]+\/([^/]+)/);
      return match ? match[1] : null;
    }),
    ...customImplementations,
  } as MockAssetPathService;
}
