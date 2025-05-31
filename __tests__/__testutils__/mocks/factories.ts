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
} from './interfaces.js';

/**
 * Creates a type-safe mock Logger instance
 * @param customImplementations Optional custom implementations to override defaults
 */
export function createMockLogger(customImplementations: Partial<MockLogger> = {}): MockLogger {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
    ...customImplementations,
  };

  // Set up the child method to return the mock logger itself
  mockLogger.child.mockReturnValue(mockLogger);

  return mockLogger;
}

/**
 * Creates a type-safe mock BlobService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobService(
  customImplementations: Partial<MockBlobService> = {},
): MockBlobService {
  const mockUploadFile = jest.fn().mockResolvedValue({
    url: 'https://example.com/mock-file.txt',
    downloadUrl: 'https://example.com/mock-file.txt?download=1',
    pathname: 'mock-file.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
  });

  const mockUploadText = jest.fn().mockResolvedValue({
    url: 'https://example.com/mock-text.txt',
    downloadUrl: 'https://example.com/mock-text.txt?download=1',
    pathname: 'mock-text.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
  });

  const mockListFiles = jest.fn().mockResolvedValue({
    blobs: [],
    cursor: undefined,
  });

  const mockGetFileInfo = jest.fn().mockResolvedValue({
    url: 'https://example.com/mock-file.txt',
    pathname: 'mock-file.txt',
    contentType: 'text/plain',
    contentLength: 100,
    uploadedAt: new Date(),
  });

  const mockDeleteFile = jest.fn().mockResolvedValue(undefined);
  const mockGetUrlForPath = jest
    .fn()
    .mockImplementation((path: string) => `https://example.com/${path}`);
  const mockFetchText = jest.fn().mockResolvedValue('Mock text content');

  return {
    uploadFile: mockUploadFile as MockBlobService['uploadFile'],
    uploadText: mockUploadText as MockBlobService['uploadText'],
    listFiles: mockListFiles as MockBlobService['listFiles'],
    getFileInfo: mockGetFileInfo as MockBlobService['getFileInfo'],
    deleteFile: mockDeleteFile as MockBlobService['deleteFile'],
    getUrlForPath: mockGetUrlForPath as MockBlobService['getUrlForPath'],
    fetchText: mockFetchText as MockBlobService['fetchText'],
    ...customImplementations,
  };
}

/**
 * Creates a type-safe mock BlobPathService instance
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockBlobPathService(
  customImplementations: Partial<MockBlobPathService> = {},
): MockBlobPathService {
  return {
    getAssetPath: jest
      .fn()
      .mockImplementation(
        (assetType, bookSlug, assetName) => `books/${bookSlug}/${assetType}/${assetName}`,
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
    getBookSlugFromPath: jest.fn().mockImplementation((path: string) => {
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
  customImplementations: Partial<MockVercelBlobAssetService> = {},
): MockVercelBlobAssetService {
  const mockGetAssetUrl = jest
    .fn()
    .mockImplementation((assetType: string, bookSlug: string, assetName: string) =>
      Promise.resolve(`https://example.com/assets/${assetType}/${bookSlug}/${assetName}`),
    );

  const mockAssetExists = jest.fn().mockResolvedValue(true);
  const mockFetchAsset = jest.fn().mockResolvedValue(new ArrayBuffer(100));
  const mockFetchTextAsset = jest.fn().mockResolvedValue('Mock text content');

  const mockUploadAsset = jest.fn().mockResolvedValue({
    url: 'https://example.com/assets/mock-asset.txt',
    size: 100,
    contentType: 'text/plain',
    uploadedAt: new Date(),
  });

  const mockDeleteAsset = jest.fn().mockResolvedValue(true);

  const mockListAssets = jest.fn().mockResolvedValue({
    assets: [],
    hasMore: false,
  });

  return {
    getAssetUrl: mockGetAssetUrl as MockVercelBlobAssetService['getAssetUrl'],
    assetExists: mockAssetExists as MockVercelBlobAssetService['assetExists'],
    fetchAsset: mockFetchAsset as MockVercelBlobAssetService['fetchAsset'],
    fetchTextAsset: mockFetchTextAsset as MockVercelBlobAssetService['fetchTextAsset'],
    uploadAsset: mockUploadAsset as MockVercelBlobAssetService['uploadAsset'],
    deleteAsset: mockDeleteAsset as MockVercelBlobAssetService['deleteAsset'],
    listAssets: mockListAssets as MockVercelBlobAssetService['listAssets'],
    ...customImplementations,
  };
}

/**
 * Creates a standard mock implementation for @vercel/blob
 * @param customImplementations Optional custom implementations for methods
 */
export function createMockVercelBlob(
  customImplementations: Partial<MockVercelBlob> = {},
): MockVercelBlob {
  const mockPutResult: PutBlobResult = {
    url: 'https://example.com/assets/test.txt',
    downloadUrl: 'https://example.com/assets/test.txt?download=1',
    pathname: 'assets/test.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
  };

  const mockListResult: ListBlobResultBlob = {
    url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    pathname: 'assets/audio/the-iliad/chapter-01.mp3',
    downloadUrl: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3?download=1',
    size: 1000000,
    uploadedAt: new Date(),
  };

  const mockHeadResult: HeadBlobResult = {
    url: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3',
    downloadUrl: 'https://example.com/assets/audio/the-iliad/chapter-01.mp3?download=1',
    pathname: 'assets/audio/the-iliad/chapter-01.mp3',
    contentType: 'audio/mpeg',
    contentDisposition: 'inline',
    cacheControl: 'public, max-age=31536000',
    size: 1000000,
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
  options: Partial<Response> = {},
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
  customImplementations: Partial<MockAssetPathService> = {},
): MockAssetPathService {
  return {
    getAssetPath: jest
      .fn()
      .mockImplementation(
        (assetType, bookSlug, assetName) => `assets/${assetType}/${bookSlug}/${assetName}`,
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
