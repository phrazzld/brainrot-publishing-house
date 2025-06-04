/**
 * Type-safe interfaces for mocked services
 * These interfaces ensure that mocks match their real counterparts
 * while adding the correct jest.Mock types for test functionality
 */
import { jest } from '@jest/globals';

import { Logger } from '../../../utils/logger.js';
import { BlobPathService } from '../../../utils/services/BlobPathService.js';
import { BlobService } from '../../../utils/services/BlobService.js';
import { VercelBlobAssetService } from '../../../utils/services/VercelBlobAssetService.js';

/**
 * Type-safe mock for the Logger service
 */
export interface MockLogger extends Logger {
  info: jest.MockedFunction<Logger['info']>;
  debug: jest.MockedFunction<Logger['debug']>;
  warn: jest.MockedFunction<Logger['warn']>;
  error: jest.MockedFunction<Logger['error']>;
  child: jest.MockedFunction<Logger['child']>;
}

/**
 * Type-safe mock for the BlobService
 */
export interface MockBlobService extends Omit<BlobService, 'uploadFile'> {
  uploadFile: jest.MockedFunction<BlobService['uploadFile']>;
  uploadText: jest.MockedFunction<BlobService['uploadText']>;
  listFiles: jest.MockedFunction<BlobService['listFiles']>;
  getFileInfo: jest.MockedFunction<BlobService['getFileInfo']>;
  deleteFile: jest.MockedFunction<BlobService['deleteFile']>;
  getUrlForPath: jest.MockedFunction<BlobService['getUrlForPath']>;
  fetchText: jest.MockedFunction<BlobService['fetchText']>;
}

/**
 * Type-safe mock for the BlobPathService
 */
export interface MockBlobPathService extends BlobPathService {
  getAssetPath: jest.MockedFunction<BlobPathService['getAssetPath']>;
  getBookImagePath: jest.MockedFunction<BlobPathService['getBookImagePath']>;
  getBrainrotTextPath: jest.MockedFunction<BlobPathService['getBrainrotTextPath']>;
  getFulltextPath: jest.MockedFunction<BlobPathService['getFulltextPath']>;
  getSourceTextPath: jest.MockedFunction<BlobPathService['getSourceTextPath']>;
  getSharedImagePath: jest.MockedFunction<BlobPathService['getSharedImagePath']>;
  getSiteAssetPath: jest.MockedFunction<BlobPathService['getSiteAssetPath']>;
  getAudioPath: jest.MockedFunction<BlobPathService['getAudioPath']>;
  convertLegacyPath: jest.MockedFunction<BlobPathService['convertLegacyPath']>;
  getBookSlugFromPath: jest.MockedFunction<BlobPathService['getBookSlugFromPath']>;
}

/**
 * Type-safe mock for VercelBlobAssetService
 */
export interface MockVercelBlobAssetService
  extends Omit<
    VercelBlobAssetService,
    | 'getAssetUrl'
    | 'assetExists'
    | 'fetchAsset'
    | 'fetchTextAsset'
    | 'uploadAsset'
    | 'deleteAsset'
    | 'listAssets'
  > {
  getAssetUrl: jest.MockedFunction<VercelBlobAssetService['getAssetUrl']>;
  assetExists: jest.MockedFunction<VercelBlobAssetService['assetExists']>;
  fetchAsset: jest.MockedFunction<VercelBlobAssetService['fetchAsset']>;
  fetchTextAsset: jest.MockedFunction<VercelBlobAssetService['fetchTextAsset']>;
  uploadAsset: jest.MockedFunction<VercelBlobAssetService['uploadAsset']>;
  deleteAsset: jest.MockedFunction<VercelBlobAssetService['deleteAsset']>;
  listAssets: jest.MockedFunction<VercelBlobAssetService['listAssets']>;
}

/**
 * Type-safe mock for Vercel Blob's primary functions
 */
export interface MockVercelBlob {
  put: jest.MockedFunction<(typeof import('@vercel/blob'))['put']>;
  list: jest.MockedFunction<(typeof import('@vercel/blob'))['list']>;
  head: jest.MockedFunction<(typeof import('@vercel/blob'))['head']>;
  del: jest.MockedFunction<(typeof import('@vercel/blob'))['del']>;
}

/**
 * Type-safe mock for fetch Response
 */
export interface MockResponse
  extends Omit<
    Response,
    'json' | 'text' | 'arrayBuffer' | 'blob' | 'formData' | 'clone' | 'bytes'
  > {
  json: jest.MockedFunction<Response['json']>;
  text: jest.MockedFunction<Response['text']>;
  arrayBuffer: jest.MockedFunction<Response['arrayBuffer']>;
  blob: jest.MockedFunction<Response['blob']>;
  formData: jest.MockedFunction<Response['formData']>;
  clone: jest.MockedFunction<Response['clone']>;
  bytes: jest.MockedFunction<Response['bytes']>;
}

/**
 * Type-safe mock for fetch function
 */
export type MockFetch = jest.MockedFunction<typeof global.fetch>;

/**
 * Type-safe mock for AssetPathService
 */
export interface MockAssetPathService {
  getAssetPath: jest.MockedFunction<
    (assetType: string, bookSlug: string | null, assetName: string) => string
  >;
  normalizeLegacyPath: jest.MockedFunction<(legacyPath: string) => string>;
  getTextPath: jest.MockedFunction<
    (bookSlug: string, textType: string, chapter?: string | number) => string
  >;
  getBookSlugFromPath: jest.MockedFunction<(path: string) => string | null>;
  getAudioPath: jest.MockedFunction<(bookSlug: string, chapter: string | number) => string>;
  getImagePath: jest.MockedFunction<
    (bookSlug: string, imageType: string, chapter?: string | number, extension?: string) => string
  >;
}
