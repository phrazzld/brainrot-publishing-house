import {
  assetExistsInBlobStorage,
  clearBlobUrlCache,
  generateBlobUrl,
  getAssetUrl,
  getBlobUrl,
} from '../../utils/getBlobUrl';
import { blobPathService } from '../../utils/services/BlobPathService';
import { blobService } from '../../utils/services/BlobService';

// Mock services
jest.mock('../../utils/services/BlobService', () => ({
  blobService: {
    getUrlForPath: jest.fn(),
    getFileInfo: jest.fn(),
  },
}));

jest.mock('../../utils/services/BlobPathService', () => ({
  blobPathService: {
    convertLegacyPath: jest.fn(),
  },
}));

describe('Blob URL Utilities', () => {
  // Store original env values to restore later
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    clearBlobUrlCache();

    // Mock implementation for convertLegacyPath
    (blobPathService.convertLegacyPath as jest.Mock).mockImplementation((path: string) =>
      path.replace(/^\/assets\//, 'books/').replace(/^\//, ''),
    );

    // Mock implementation for getUrlForPath with proper typing
    (blobService.getUrlForPath as jest.Mock).mockImplementation(
      (path: string, options?: { baseUrl?: string; noCache?: boolean }) => {
        const baseUrl = options?.baseUrl || 'https://public.blob.vercel-storage.com';
        return `${baseUrl}/${path}`;
      },
    );

    // Set default environment variables using a type assertion to bypass readonly constraint
    const env = process.env as unknown as Record<string, string>;
    env.NODE_ENV = 'production';
    env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://public.blob.vercel-storage.com';
    env.NEXT_PUBLIC_BLOB_DEV_URL = 'https://dev.blob.vercel-storage.com';
  });

  afterEach(() => {
    // Restore environment variables using a type assertion to bypass readonly constraint
    const env = process.env as unknown as Record<string, string>;

    // Only restore what was originally set
    if ('NODE_ENV' in originalEnv) {
      env.NODE_ENV = originalEnv.NODE_ENV as string;
    } else {
      delete env.NODE_ENV;
    }

    if ('NEXT_PUBLIC_BLOB_BASE_URL' in originalEnv) {
      env.NEXT_PUBLIC_BLOB_BASE_URL = originalEnv.NEXT_PUBLIC_BLOB_BASE_URL as string;
    } else {
      delete env.NEXT_PUBLIC_BLOB_BASE_URL;
    }

    if ('NEXT_PUBLIC_BLOB_DEV_URL' in originalEnv) {
      env.NEXT_PUBLIC_BLOB_DEV_URL = originalEnv.NEXT_PUBLIC_BLOB_DEV_URL as string;
    } else {
      delete env.NEXT_PUBLIC_BLOB_DEV_URL;
    }
  });

  describe('generateBlobUrl', () => {
    it('should convert legacy paths to blob URLs', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const result = generateBlobUrl(legacyPath);

      expect(blobPathService.convertLegacyPath).toHaveBeenCalledWith(legacyPath);
      expect(blobService.getUrlForPath).toHaveBeenCalled();
      expect(result).toContain('books/hamlet/images/hamlet-01.png');
    });

    it('should use direct blob paths without conversion', () => {
      const blobPath = 'books/hamlet/images/hamlet-01.png';
      const result = generateBlobUrl(blobPath);

      expect(blobPathService.convertLegacyPath).not.toHaveBeenCalled();
      expect(blobService.getUrlForPath).toHaveBeenCalled();
      expect(result).toContain(blobPath);
    });

    it('should return legacy path when useBlobStorage is false', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const result = generateBlobUrl(legacyPath, { useBlobStorage: false });

      expect(result).toBe(legacyPath);
      expect(blobPathService.convertLegacyPath).not.toHaveBeenCalled();
      expect(blobService.getUrlForPath).not.toHaveBeenCalled();
    });

    it('should use development URL when environment is development', () => {
      // Use type assertion to set readonly property
      (process.env as unknown as Record<string, string>).NODE_ENV = 'development';
      const blobPath = 'books/hamlet/images/hamlet-01.png';

      generateBlobUrl(blobPath);

      expect(blobService.getUrlForPath).toHaveBeenCalledWith(
        blobPath,
        expect.objectContaining({
          baseUrl: process.env.NEXT_PUBLIC_BLOB_DEV_URL,
        }),
      );
    });

    it('should cache URLs when noCache is false', () => {
      const blobPath = 'books/hamlet/images/hamlet-01.png';

      // First call should use the services
      generateBlobUrl(blobPath);
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(1);

      // Second call should use the cache
      generateBlobUrl(blobPath);
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when noCache is true', () => {
      const blobPath = 'books/hamlet/images/hamlet-01.png';

      // First call
      generateBlobUrl(blobPath, { noCache: true });
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(1);

      // Second call should not use cache
      generateBlobUrl(blobPath, { noCache: true });
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(2);
    });

    it('should use custom base URL when provided', () => {
      const blobPath = 'books/hamlet/images/hamlet-01.png';
      const customBaseUrl = 'https://custom-cdn.example.com';

      generateBlobUrl(blobPath, { baseUrl: customBaseUrl });

      expect(blobService.getUrlForPath).toHaveBeenCalledWith(
        blobPath,
        expect.objectContaining({ baseUrl: customBaseUrl }),
      );
    });
  });

  describe('getBlobUrl', () => {
    it('should call generateBlobUrl with useBlobStorage set to true', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const options = { noCache: true };

      getBlobUrl(legacyPath, options);

      expect(blobPathService.convertLegacyPath).toHaveBeenCalledWith(legacyPath);
      expect(blobService.getUrlForPath).toHaveBeenCalled();
    });
  });

  describe('getAssetUrl', () => {
    it('should pass useBlobStorage parameter to generateBlobUrl', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';

      // With useBlobStorage = true
      let result = getAssetUrl(legacyPath, true);
      expect(blobPathService.convertLegacyPath).toHaveBeenCalledWith(legacyPath);
      expect(blobService.getUrlForPath).toHaveBeenCalled();

      jest.clearAllMocks();

      // With useBlobStorage = false
      result = getAssetUrl(legacyPath, false);
      expect(result).toBe(legacyPath);
      expect(blobPathService.convertLegacyPath).not.toHaveBeenCalled();
      expect(blobService.getUrlForPath).not.toHaveBeenCalled();
    });

    it('should pass additional options to generateBlobUrl', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const options = { noCache: true };

      getAssetUrl(legacyPath, true, options);

      expect(blobService.getUrlForPath).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ noCache: true }),
      );
    });
  });

  describe('assetExistsInBlobStorage', () => {
    beforeEach(() => {
      (blobService.getFileInfo as jest.Mock).mockImplementation(async (url: string) => {
        if (url.includes('exists')) {
          return { url, pathname: 'exists.png', size: 1024 };
        }
        throw new Error('Not found');
      });
    });

    it('should return true if the asset exists', async () => {
      const legacyPath = '/assets/hamlet/images/exists.png';
      const result = await assetExistsInBlobStorage(legacyPath);

      expect(blobService.getFileInfo).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if the asset does not exist', async () => {
      const legacyPath = '/assets/hamlet/images/does-not-exist.png';
      const result = await assetExistsInBlobStorage(legacyPath);

      expect(blobService.getFileInfo).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should use noCache option when checking for asset existence', async () => {
      const legacyPath = '/assets/hamlet/images/exists.png';
      await assetExistsInBlobStorage(legacyPath);

      expect(blobService.getUrlForPath).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ noCache: true }),
      );
    });
  });

  describe('clearBlobUrlCache', () => {
    it('should clear the URL cache', () => {
      const blobPath = 'books/hamlet/images/hamlet-01.png';

      // First call should use the services
      generateBlobUrl(blobPath);
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(1);

      // Second call should use the cache
      generateBlobUrl(blobPath);
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(1);

      // Clear cache
      clearBlobUrlCache();

      // Third call should use the services again
      generateBlobUrl(blobPath);
      expect(blobService.getUrlForPath).toHaveBeenCalledTimes(2);
    });
  });
});
