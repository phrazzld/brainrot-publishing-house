/**
 * Factory functions for creating type-safe mocks
 * These factories ensure consistent mocking patterns across tests
 */
import { jest } from '@jest/globals';
import { HeadBlobResult, ListBlobResultBlob, PutBlobResult } from '@vercel/blob';

import { Logger } from '../../../utils/logger.js';
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

// Type for log data - matches the one in logger.ts
type LogData = Record<string, unknown>;

/**
 * Creates a type-safe mock Logger instance
 * @param customImplementations Optional custom implementations to override defaults
 */
export function createMockLogger(customImplementations: Partial<MockLogger> = {}): MockLogger {
  const mockLogger: MockLogger = {
    info: jest.fn<(obj: LogData) => void>(),
    debug: jest.fn<(obj: LogData) => void>(),
    warn: jest.fn<(obj: LogData) => void>(),
    error: jest.fn<(obj: LogData) => void>(),
    child: jest.fn<(bindings: LogData) => Logger>(),
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
  const mockUploadFile = jest.fn<MockBlobService['uploadFile']>().mockResolvedValue({
    url: 'https://example.com/mock-file.txt',
    downloadUrl: 'https://example.com/mock-file.txt?download=1',
    pathname: 'mock-file.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
  });

  const mockUploadText = jest.fn<MockBlobService['uploadText']>().mockResolvedValue({
    url: 'https://example.com/mock-text.txt',
    downloadUrl: 'https://example.com/mock-text.txt?download=1',
    pathname: 'mock-text.txt',
    contentDisposition: 'inline',
    contentType: 'text/plain',
  });

  const mockListFiles = jest.fn<MockBlobService['listFiles']>().mockResolvedValue({
    blobs: [],
    cursor: undefined,
  });

  const mockGetFileInfo = jest.fn<MockBlobService['getFileInfo']>().mockResolvedValue({
    url: 'https://example.com/mock-file.txt',
    downloadUrl: 'https://example.com/mock-file.txt?download=1',
    pathname: 'mock-file.txt',
    contentType: 'text/plain',
    contentDisposition: 'inline',
    cacheControl: 'public, max-age=31536000',
    size: 100,
    uploadedAt: new Date(),
  });

  const mockDeleteFile = jest.fn<MockBlobService['deleteFile']>().mockResolvedValue(undefined);
  const mockGetUrlForPath = jest
    .fn()
    .mockImplementation(
      (path: string, _options?: { baseUrl?: string; noCache?: boolean }) =>
        `https://example.com/${path}`,
    ) as MockBlobService['getUrlForPath'];
  const mockFetchText = jest
    .fn<MockBlobService['fetchText']>()
    .mockResolvedValue('Mock text content');

  return {
    uploadFile: mockUploadFile,
    uploadText: mockUploadText,
    listFiles: mockListFiles,
    getFileInfo: mockGetFileInfo,
    deleteFile: mockDeleteFile,
    getUrlForPath: mockGetUrlForPath,
    fetchText: mockFetchText,
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
    .mockImplementation(
      (assetType: string, bookSlug: string, assetName: string, _options?: unknown) =>
        Promise.resolve(`https://example.com/assets/${assetType}/${bookSlug}/${assetName}`),
    ) as MockVercelBlobAssetService['getAssetUrl'];

  const mockAssetExists = jest
    .fn<MockVercelBlobAssetService['assetExists']>()
    .mockResolvedValue(true);
  const mockFetchAsset = jest
    .fn<MockVercelBlobAssetService['fetchAsset']>()
    .mockResolvedValue(new ArrayBuffer(100));
  const mockFetchTextAsset = jest
    .fn<MockVercelBlobAssetService['fetchTextAsset']>()
    .mockResolvedValue('Mock text content');

  const mockUploadAsset = jest.fn<MockVercelBlobAssetService['uploadAsset']>().mockResolvedValue({
    url: 'https://example.com/assets/mock-asset.txt',
    path: 'assets/mock-asset.txt',
    size: 100,
    contentType: 'text/plain',
    uploadedAt: new Date(),
  });

  const mockDeleteAsset = jest
    .fn<MockVercelBlobAssetService['deleteAsset']>()
    .mockResolvedValue(true);

  const mockListAssets = jest.fn<MockVercelBlobAssetService['listAssets']>().mockResolvedValue({
    assets: [],
    hasMore: false,
  });

  return {
    getAssetUrl: mockGetAssetUrl,
    assetExists: mockAssetExists,
    fetchAsset: mockFetchAsset,
    fetchTextAsset: mockFetchTextAsset,
    uploadAsset: mockUploadAsset,
    deleteAsset: mockDeleteAsset,
    listAssets: mockListAssets,
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

  const putMock = jest.fn<() => Promise<unknown>>();
  putMock.mockResolvedValue(mockPutResult);

  const listMock = jest.fn<() => Promise<unknown>>();
  listMock.mockResolvedValue({
    blobs: [mockListResult],
    cursor: undefined,
    hasMore: false,
  });

  const headMock = jest.fn<() => Promise<unknown>>();
  headMock.mockResolvedValue(mockHeadResult);

  const delMock = jest.fn<() => Promise<unknown>>();
  delMock.mockResolvedValue(undefined);

  return {
    put: putMock as MockVercelBlob['put'],
    list: listMock as MockVercelBlob['list'],
    head: headMock as MockVercelBlob['head'],
    del: delMock as MockVercelBlob['del'],
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
  const textImpl = jest.fn<() => Promise<string>>().mockImplementation(async () => {
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
  const jsonImpl = jest.fn<() => Promise<unknown>>().mockImplementation(async () => {
    const text = await textImpl();
    return JSON.parse(text as string);
  });

  // Create arrayBuffer implementation
  const arrayBufferImpl = jest.fn<() => Promise<ArrayBuffer>>().mockImplementation(async () => {
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
  const blobImpl = jest.fn<() => Promise<Blob>>().mockImplementation(async () => {
    if (body instanceof Blob) {
      return body;
    }
    return new Blob([body instanceof ArrayBuffer ? body : String(body)]);
  });

  // Create bytes implementation
  const bytesImpl = jest.fn<() => Promise<Uint8Array>>().mockImplementation(async () => {
    if (body instanceof ArrayBuffer) {
      return new Uint8Array(body);
    } else if (typeof body === 'string') {
      return new TextEncoder().encode(body);
    } else if (body instanceof Blob) {
      const buffer = await body.arrayBuffer();
      return new Uint8Array(buffer);
    }
    return new Uint8Array(0);
  });

  const response: MockResponse = {
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
    bytes: bytesImpl,
    formData: jest.fn<() => Promise<FormData>>().mockResolvedValue(new FormData()),
    clone: jest.fn<() => Response>(),
  };

  return response;
}

/**
 * Creates a type-safe mock fetch implementation
 * @param responseFactory Function that returns the response for each fetch call
 */
export function createMockFetch(responseFactory: () => Response | Promise<Response>): MockFetch {
  return jest.fn<typeof fetch>().mockImplementation(() => Promise.resolve(responseFactory()));
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
      .fn<(assetType: string, bookSlug: string | null, assetName: string) => string>()
      .mockImplementation(
        (assetType, bookSlug, assetName) => `assets/${assetType}/${bookSlug}/${assetName}`,
      ),
    normalizeLegacyPath: jest
      .fn<(legacyPath: string) => string>()
      .mockImplementation((legacyPath: string) => {
        if (legacyPath.startsWith('/assets/')) {
          return legacyPath.replace(/^\/assets\/([^/]+)\/images\//, 'assets/image/$1/');
        }
        return legacyPath;
      }),
    getTextPath: jest
      .fn<(bookSlug: string, textType: string, chapter?: string | number) => string>()
      .mockImplementation(
        (bookSlug: string, textType: string) => `assets/text/${bookSlug}/${textType}.txt`,
      ),
    getBookSlugFromPath: jest
      .fn<(path: string) => string | null>()
      .mockImplementation((path: string) => {
        const match = path.match(/assets\/[^/]+\/([^/]+)/);
        return match ? match[1] : null;
      }),
    getAudioPath: jest
      .fn<(bookSlug: string, chapter: string | number) => string>()
      .mockImplementation(
        (bookSlug: string, chapter: string | number) =>
          `assets/audio/${bookSlug}/chapter-${String(chapter).padStart(2, '0')}.mp3`,
      ),
    getImagePath: jest
      .fn<
        (
          bookSlug: string,
          imageType: string,
          chapter?: string | number,
          extension?: string,
        ) => string
      >()
      .mockImplementation(
        (bookSlug: string, imageType: string, chapter?: string | number, extension = 'jpg') => {
          const chapterPart = chapter ? `-${String(chapter).padStart(2, '0')}` : '';
          return `assets/image/${bookSlug}/${imageType}${chapterPart}.${extension}`;
        },
      ),
    ...customImplementations,
  };
}
