// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}));

import { GET } from '@/app/api/download/route';
import { getAssetUrlWithFallback } from '@/utils';

// Mock dependencies
jest.mock('@/utils', () => ({
  getAssetUrlWithFallback: jest.fn(),
}));


// Mock AWS SDK
const mockGetSignedUrl = jest.fn().mockReturnValue('https://mocked-s3-signed-url.com/file.mp3');
jest.mock('aws-sdk', () => {
  return {
    Endpoint: jest.fn(),
    S3: jest.fn().mockImplementation(() => ({
      getSignedUrl: mockGetSignedUrl
    })),
  };
});

describe('Download API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SPACES_ENDPOINT = 'test-endpoint.digitaloceanspaces.com';
    process.env.SPACES_BUCKET_NAME = 'test-bucket';
    process.env.SPACES_ACCESS_KEY_ID = 'test-key';
    process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
  });

  it('should return an error for missing query params', async () => {
    // Create a mock URL without query params
    const mockReq = { url: 'https://example.com/api/download' };
    
    // Call the handler
    const res = await GET(mockReq as any);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toBe('missing query params');
  });

  it('should return a Blob URL for a file that exists in Blob storage', async () => {
    // Mock the asset URL to return a Blob URL (not containing SPACES_ENDPOINT)
    (getAssetUrlWithFallback as jest.Mock).mockResolvedValue(
      'https://public.blob.vercel-storage.com/books/hamlet/audio/full-audiobook.mp3'
    );
    
    // Create a mock URL with query params
    const mockReq = { url: 'https://example.com/api/download?slug=hamlet&type=full' };
    
    // Call the handler
    const res = await GET(mockReq as any);
    const data = await res.json();
    
    // Expect a successful response with the Blob URL
    expect(res.status).toBe(200);
    expect(data.url).toBe('https://public.blob.vercel-storage.com/books/hamlet/audio/full-audiobook.mp3');
    expect(getAssetUrlWithFallback).toHaveBeenCalledWith('/hamlet/audio/full-audiobook.mp3');
  });

  it('should return a signed S3 URL for a file that only exists in S3', async () => {
    // Set a value for SPACES_ENDPOINT to be detected in the includes check
    process.env.SPACES_ENDPOINT = 'test-endpoint.digitaloceanspaces.com';
    
    // Mock the asset URL to return a path containing SPACES_ENDPOINT to trigger S3 signing
    (getAssetUrlWithFallback as jest.Mock).mockResolvedValue(
      'test-endpoint.digitaloceanspaces.com/hamlet/audio/book-01.mp3'
    );
    
    // Create a mock URL with query params
    const mockReq = { url: 'https://example.com/api/download?slug=hamlet&type=chapter&chapter=1' };
    
    // Call the handler
    const res = await GET(mockReq as any);
    const data = await res.json();
    
    // Expect a successful response with the signed S3 URL
    expect(res.status).toBe(200);
    expect(data.url).toBe('https://mocked-s3-signed-url.com/file.mp3');
    expect(getAssetUrlWithFallback).toHaveBeenCalledWith('/hamlet/audio/book-01.mp3');
    expect(mockGetSignedUrl).toHaveBeenCalled();
  });

  it('should return 404 when file is not found in either storage', async () => {
    // Mock the asset URL to throw an error
    (getAssetUrlWithFallback as jest.Mock).mockRejectedValue(new Error('File not found'));
    
    // Create a mock URL with query params
    const mockReq = { url: 'https://example.com/api/download?slug=nonexistent&type=full' };
    
    // Call the handler
    const res = await GET(mockReq as any);
    const data = await res.json();
    
    // Expect a 404 response
    expect(res.status).toBe(404);
    expect(data.error).toBe('file not found');
  });
});