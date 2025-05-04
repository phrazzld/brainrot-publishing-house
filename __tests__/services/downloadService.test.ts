import { DownloadRequestParams, DownloadService } from '../../services/downloadService';
import {
  AssetNotFoundError,
  AssetUrlResolver,
  S3SignedUrlGenerator,
  SigningError,
} from '../../types/dependencies';

// Mock implementations of dependencies
const createMockAssetUrlResolver = (): jest.Mocked<AssetUrlResolver> => ({
  getAssetUrlWithFallback: jest.fn(),
});

const createMockS3SignedUrlGenerator = (): jest.Mocked<S3SignedUrlGenerator> => ({
  createSignedS3Url: jest.fn(),
});

describe('DownloadService', () => {
  // Constants for testing
  const TEST_S3_ENDPOINT = 'test-endpoint.digitaloceanspaces.com';
  const TEST_BLOB_URL =
    'https://public.blob.vercel-storage.com/books/hamlet/audio/full-audiobook.mp3';
  const TEST_S3_URL = `https://${TEST_S3_ENDPOINT}/hamlet/audio/full-audiobook.mp3`;
  const TEST_SIGNED_URL = `${TEST_S3_URL}?signed=true&expires=123456`;

  // Common request parameters
  const fullAudiobookParams: DownloadRequestParams = {
    slug: 'hamlet',
    type: 'full',
  };

  const chapterAudiobookParams: DownloadRequestParams = {
    slug: 'hamlet',
    type: 'chapter',
    chapter: '1',
  };

  // Test dependencies
  let mockAssetUrlResolver: jest.Mocked<AssetUrlResolver>;
  let mockS3SignedUrlGenerator: jest.Mocked<S3SignedUrlGenerator>;
  let downloadService: DownloadService;

  beforeEach(() => {
    // Reset mocks before each test
    mockAssetUrlResolver = createMockAssetUrlResolver();
    mockS3SignedUrlGenerator = createMockS3SignedUrlGenerator();

    // Create service instance
    downloadService = new DownloadService(
      mockAssetUrlResolver,
      mockS3SignedUrlGenerator,
      TEST_S3_ENDPOINT
    );
  });

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      // Testing initialization happens in beforeEach
      // Just verify that the service was created successfully
      expect(downloadService).toBeInstanceOf(DownloadService);
    });
  });

  describe('getDownloadUrl', () => {
    describe('Happy Path - Blob URL', () => {
      beforeEach(() => {
        // Default setup: asset resolver returns a Blob URL
        mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_BLOB_URL);
      });

      it('should return Blob URL directly when resolver returns a non-S3 URL', async () => {
        const result = await downloadService.getDownloadUrl(fullAudiobookParams);

        // Verify asset resolver was called with correct path
        expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
          '/hamlet/audio/full-audiobook.mp3'
        );

        // Verify result is the Blob URL
        expect(result).toBe(TEST_BLOB_URL);

        // Verify S3 signer was not called
        expect(mockS3SignedUrlGenerator.createSignedS3Url).not.toHaveBeenCalled();
      });

      it('should handle chapter paths correctly', async () => {
        const result = await downloadService.getDownloadUrl(chapterAudiobookParams);

        // Verify asset resolver was called with correct path including zero-padded chapter
        expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
          '/hamlet/audio/book-01.mp3'
        );

        expect(result).toBe(TEST_BLOB_URL);
      });
    });

    describe('Happy Path - S3 URL', () => {
      beforeEach(() => {
        // Setup: asset resolver returns an S3 URL, signer returns a signed URL
        mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_S3_URL);
        mockS3SignedUrlGenerator.createSignedS3Url.mockResolvedValue(TEST_SIGNED_URL);
      });

      it('should call S3SignedUrlGenerator when resolver returns an S3 URL', async () => {
        const result = await downloadService.getDownloadUrl(fullAudiobookParams);

        // Verify asset resolver was called
        expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
          '/hamlet/audio/full-audiobook.mp3'
        );

        // Verify S3 signer was called with the S3 URL
        expect(mockS3SignedUrlGenerator.createSignedS3Url).toHaveBeenCalledWith(TEST_S3_URL);

        // Verify result is the signed URL
        expect(result).toBe(TEST_SIGNED_URL);
      });
    });

    describe('Error Cases', () => {
      it('should throw AssetNotFoundError when resolver returns falsy value', async () => {
        // Setup: asset resolver returns null (asset not found)
        mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue('');

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          AssetNotFoundError
        );

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toMatchObject({
          name: 'AssetNotFoundError',
          message: expect.stringContaining('Asset not found'),
        });
      });

      it('should propagate AssetNotFoundError from resolver', async () => {
        // Setup: asset resolver throws AssetNotFoundError
        const originalError = new AssetNotFoundError('Original asset not found error');
        mockAssetUrlResolver.getAssetUrlWithFallback.mockRejectedValue(originalError);

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          AssetNotFoundError
        );

        // Should be the same error instance
        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toBe(
          originalError
        );
      });

      it('should wrap non-specific errors from resolver in AssetNotFoundError', async () => {
        // Setup: asset resolver throws a generic error
        mockAssetUrlResolver.getAssetUrlWithFallback.mockRejectedValue(new Error('Generic error'));

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          AssetNotFoundError
        );

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toMatchObject({
          name: 'AssetNotFoundError',
          message: expect.stringContaining('Failed to resolve URL'),
        });
      });

      it('should handle non-Error objects from resolver', async () => {
        // Setup: asset resolver throws a non-Error object
        mockAssetUrlResolver.getAssetUrlWithFallback.mockRejectedValue('String error');

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          AssetNotFoundError
        );

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toMatchObject({
          name: 'AssetNotFoundError',
          message: expect.stringContaining('String error'),
        });
      });

      it('should throw SigningError when S3 signing fails', async () => {
        // Setup: asset resolver returns S3 URL, but signer throws error
        mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_S3_URL);
        mockS3SignedUrlGenerator.createSignedS3Url.mockRejectedValue(new Error('Signing failed'));

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          SigningError
        );

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toMatchObject({
          name: 'SigningError',
          message: expect.stringContaining('Failed to generate signed URL'),
          cause: expect.any(Error),
        });
      });

      it('should create new SigningError when S3 generator throws SigningError', async () => {
        // Setup: asset resolver returns S3 URL, but signer throws SigningError
        mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_S3_URL);
        const originalError = new SigningError('Original signing error');
        mockS3SignedUrlGenerator.createSignedS3Url.mockRejectedValue(originalError);

        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
          SigningError
        );

        // Should include the URL in the message
        await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toMatchObject({
          name: 'SigningError',
          message: expect.stringContaining('Failed to generate signed URL for'),
          message: expect.stringContaining(TEST_S3_URL),
          cause: originalError,
        });
      });

      it('should throw error when chapter is missing for chapter type', async () => {
        // Invalid params: chapter type without chapter number
        const invalidParams: DownloadRequestParams = {
          slug: 'hamlet',
          type: 'chapter',
          // Missing chapter
        };

        await expect(downloadService.getDownloadUrl(invalidParams)).rejects.toThrow(
          'Chapter parameter is required'
        );
      });
    });
  });

  describe('Legacy Path Generation', () => {
    // We'll test the private method indirectly through the public getDownloadUrl method

    it('should generate correct full audiobook path', async () => {
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_BLOB_URL);

      await downloadService.getDownloadUrl(fullAudiobookParams);

      expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
        '/hamlet/audio/full-audiobook.mp3'
      );
    });

    it('should generate correct chapter path with zero-padding for single digit', async () => {
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_BLOB_URL);

      await downloadService.getDownloadUrl({
        slug: 'hamlet',
        type: 'chapter',
        chapter: '2',
      });

      expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
        '/hamlet/audio/book-02.mp3'
      );
    });

    it('should handle multi-digit chapter numbers correctly', async () => {
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_BLOB_URL);

      await downloadService.getDownloadUrl({
        slug: 'hamlet',
        type: 'chapter',
        chapter: '12',
      });

      expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
        '/hamlet/audio/book-12.mp3'
      );
    });
  });
});
