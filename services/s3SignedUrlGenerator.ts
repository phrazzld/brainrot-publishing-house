import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { S3SignedUrlGenerator, SigningError } from '../types/dependencies';

/**
 * Default values for S3 configuration when not provided via environment variables
 */
const DEFAULT_CONFIG = {
  region: 'us-east-1',
  expirySeconds: 900, // 15 minutes
};

/**
 * Implementation of the S3SignedUrlGenerator interface that creates
 * time-limited signed URLs for accessing protected assets in S3 buckets.
 * Uses AWS SDK v3 and loads configuration from environment variables.
 */
export class RealS3SignedUrlGenerator implements S3SignedUrlGenerator {
  private s3Client: S3Client;
  private bucket: string;
  private expirySeconds: number;

  /**
   * Creates a new instance of the S3 signed URL generator.
   * Loads credentials and configuration from environment variables.
   *
   * @throws {Error} When required environment variables are missing
   */
  constructor() {
    const accessKeyId = process.env.SPACES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;
    const endpoint = process.env.SPACES_ENDPOINT;
    const bucket = process.env.SPACES_BUCKET;

    // Validate required environment variables
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required S3 credentials: SPACES_ACCESS_KEY_ID or SPACES_SECRET_ACCESS_KEY'
      );
    }

    if (!endpoint) {
      throw new Error('Missing required S3 configuration: SPACES_ENDPOINT');
    }

    if (!bucket) {
      throw new Error('Missing required S3 configuration: SPACES_BUCKET');
    }

    // Initialize the S3 client with credentials and configuration
    this.s3Client = new S3Client({
      region: process.env.SPACES_REGION || DEFAULT_CONFIG.region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucket = bucket;

    // Configure URL expiry time with fallback to default
    const configuredExpiry = process.env.SPACES_EXPIRY_SECONDS;
    this.expirySeconds = configuredExpiry
      ? parseInt(configuredExpiry, 10)
      : DEFAULT_CONFIG.expirySeconds;

    // Validate expiry is a reasonable number
    const MAX_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days (AWS SDK max)
    if (isNaN(this.expirySeconds) || this.expirySeconds <= 0) {
      this.expirySeconds = DEFAULT_CONFIG.expirySeconds;
    } else if (this.expirySeconds > MAX_EXPIRY_SECONDS) {
      // Cap the expiry time to the maximum allowed
      this.expirySeconds = MAX_EXPIRY_SECONDS;
    }
  }

  /**
   * Creates a signed URL for an S3 object that grants temporary access.
   *
   * @param path - The S3 object path to create a signed URL for
   * @returns A Promise that resolves to the signed URL string
   * @throws {SigningError} When URL signing fails due to credentials, permissions, or service issues
   */
  async createSignedS3Url(path: string): Promise<string> {
    try {
      // Create a command to get the object
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.normalizePath(path),
      });

      // Generate the signed URL with the configured expiry
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expirySeconds,
      });

      return signedUrl;
    } catch (error) {
      // Wrap and rethrow any AWS SDK errors as SigningError
      throw new SigningError(
        `Failed to generate signed URL for path: ${path}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Normalizes an S3 path by removing any leading slashes
   *
   * @param path - The path to normalize
   * @returns The normalized path
   * @private
   */
  private normalizePath(path: string): string {
    // Remove leading slash if present to avoid S3 path issues
    return path.startsWith('/') ? path.substring(1) : path;
  }
}

/**
 * Factory function that creates and returns a new instance of RealS3SignedUrlGenerator.
 * Useful for dependency injection in contexts where a factory is preferred over direct instantiation.
 *
 * @returns A new S3SignedUrlGenerator instance
 */
export function createS3SignedUrlGenerator(): S3SignedUrlGenerator {
  return new RealS3SignedUrlGenerator();
}
