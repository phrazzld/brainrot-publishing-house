import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  RealS3SignedUrlGenerator,
  createS3SignedUrlGenerator,
} from '../../services/s3SignedUrlGenerator';
import { SigningError } from '../../types/dependencies';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      // Mock implementation of S3Client
    })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      // Store params for testing
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('RealS3SignedUrlGenerator', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup test environment variables
    process.env = {
      ...originalEnv,
      SPACES_ACCESS_KEY_ID: 'test-access-key',
      SPACES_SECRET_ACCESS_KEY: 'test-secret-key',
      SPACES_ENDPOINT: 'https://test-endpoint.digitaloceanspaces.com',
      SPACES_BUCKET: 'test-bucket',
      SPACES_REGION: 'test-region',
      SPACES_EXPIRY_SECONDS: '600', // 10 minutes
    };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with all required environment variables', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const generator = new RealS3SignedUrlGenerator();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'test-region',
          endpoint: 'https://test-endpoint.digitaloceanspaces.com',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
          },
        })
      );
    });

    it('should throw error when missing access key ID', () => {
      delete process.env.SPACES_ACCESS_KEY_ID;
      expect(() => new RealS3SignedUrlGenerator()).toThrow(
        'Missing required S3 credentials: SPACES_ACCESS_KEY_ID or SPACES_SECRET_ACCESS_KEY'
      );
    });

    it('should throw error when missing secret access key', () => {
      delete process.env.SPACES_SECRET_ACCESS_KEY;
      expect(() => new RealS3SignedUrlGenerator()).toThrow(
        'Missing required S3 credentials: SPACES_ACCESS_KEY_ID or SPACES_SECRET_ACCESS_KEY'
      );
    });

    it('should throw error when missing endpoint', () => {
      delete process.env.SPACES_ENDPOINT;
      expect(() => new RealS3SignedUrlGenerator()).toThrow(
        'Missing required S3 configuration: SPACES_ENDPOINT'
      );
    });

    it('should throw error when missing bucket', () => {
      delete process.env.SPACES_BUCKET;
      expect(() => new RealS3SignedUrlGenerator()).toThrow(
        'Missing required S3 configuration: SPACES_BUCKET'
      );
    });

    it('should use default region when not provided', () => {
      delete process.env.SPACES_REGION;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const generator = new RealS3SignedUrlGenerator();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1', // Default value from the implementation
        })
      );
    });

    it('should use default expiry when not provided', () => {
      delete process.env.SPACES_EXPIRY_SECONDS;

      const generator = new RealS3SignedUrlGenerator();

      // Set up mock for testing expiry
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed-url.example.com');

      generator.createSignedS3Url('test-path');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          expiresIn: 900, // Default 15 minutes (900 seconds)
        })
      );
    });

    it('should use default expiry when invalid value is provided', () => {
      process.env.SPACES_EXPIRY_SECONDS = 'invalid-number';

      const generator = new RealS3SignedUrlGenerator();

      // Set up mock for testing expiry
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed-url.example.com');

      generator.createSignedS3Url('test-path');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          expiresIn: 900, // Default 15 minutes (900 seconds)
        })
      );
    });
  });

  // Tests for createSignedS3Url method functionality
  describe('createSignedS3Url', () => {
    beforeEach(() => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://test-endpoint.digitaloceanspaces.com/test-bucket/test-path?signed=true'
      );
    });

    // Test: Command creation and parameters
    describe('command preparation', () => {
      it('should create a GetObjectCommand with correct bucket and key', async () => {
        const generator = new RealS3SignedUrlGenerator();
        await generator.createSignedS3Url('test-path');

        expect(GetObjectCommand).toHaveBeenCalledWith({
          Bucket: 'test-bucket',
          Key: 'test-path',
        });
      });

      it('should remove leading slash from path', async () => {
        const generator = new RealS3SignedUrlGenerator();
        await generator.createSignedS3Url('/test-path');

        expect(GetObjectCommand).toHaveBeenCalledWith({
          Bucket: 'test-bucket',
          Key: 'test-path', // Leading slash removed
        });
      });
    });

    // Test: URL generation and expiry settings
    describe('URL generation', () => {
      it('should call getSignedUrl with the command and correct expiry', async () => {
        const generator = new RealS3SignedUrlGenerator();
        await generator.createSignedS3Url('test-path');

        expect(getSignedUrl).toHaveBeenCalledWith(
          expect.anything(), // S3Client mock
          expect.any(Object), // GetObjectCommand mock
          expect.objectContaining({
            expiresIn: 600, // From test env variable
          })
        );
      });

      it('should return the signed URL string on success', async () => {
        const generator = new RealS3SignedUrlGenerator();
        const result = await generator.createSignedS3Url('test-path');

        expect(result).toBe(
          'https://test-endpoint.digitaloceanspaces.com/test-bucket/test-path?signed=true'
        );
      });
    });

    // Test: Error handling
    describe('error handling', () => {
      it('should throw SigningError when getSignedUrl fails', async () => {
        const testError = new Error('Test signing error');
        (getSignedUrl as jest.Mock).mockRejectedValue(testError);

        const generator = new RealS3SignedUrlGenerator();

        await expect(generator.createSignedS3Url('test-path')).rejects.toThrow(SigningError);
        await expect(generator.createSignedS3Url('test-path')).rejects.toMatchObject({
          name: 'SigningError',
          message: expect.stringContaining('Failed to generate signed URL for path: test-path'),
          cause: testError,
        });
      });

      it('should handle non-Error objects in catch block', async () => {
        // Some SDKs might throw non-Error objects
        (getSignedUrl as jest.Mock).mockRejectedValue('String error');

        const generator = new RealS3SignedUrlGenerator();

        await expect(generator.createSignedS3Url('test-path')).rejects.toThrow(SigningError);
        await expect(generator.createSignedS3Url('test-path')).rejects.toMatchObject({
          name: 'SigningError',
          message: expect.stringContaining('Failed to generate signed URL for path: test-path'),
          cause: undefined, // Should be undefined for non-Error objects
        });
      });
    });
  });

  describe('createS3SignedUrlGenerator', () => {
    it('should return a valid S3SignedUrlGenerator instance', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const generator = createS3SignedUrlGenerator();
      expect(generator).toBeInstanceOf(RealS3SignedUrlGenerator);
      expect(generator).toHaveProperty('createSignedS3Url');
    });
  });
});
