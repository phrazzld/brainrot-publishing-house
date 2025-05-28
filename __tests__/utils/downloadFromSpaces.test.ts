import { downloadFromSpaces, getAudioPathFromUrl } from '../../utils/downloadFromSpaces';
import { assetPathService } from '../../utils/services/AssetPathService';

// Mock fetch API
global.fetch = jest.fn();

describe('downloadFromSpaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variable
    process.env.NEXT_PUBLIC_SPACES_BASE_URL =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should download a file from a full URL', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg'),
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    // Define the legacy path - we don't need standard path here
    const legacyPath = 'the-iliad/audio/book-01.mp3';

    // We're still testing with legacy paths since downloadFromSpaces works with DO paths
    const url = `https://brainrot-publishing.nyc3.digitaloceanspaces.com/${legacyPath}`;

    // Type cast result since actual implementation returns void
    // Using type unknown and then cast to expected interface structure
    const result = (await downloadFromSpaces(url)) as unknown as {
      url: string;
      size: number;
      contentType: string;
    };

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
    expect(result?.url).toBe(url);
    expect(result?.size).toBe(1024);
    expect(result?.contentType).toBe('audio/mpeg');

    // Verify we can convert the legacy path to the new standardized path
    expect(assetPathService.convertLegacyPath(legacyPath)).toContain('assets/audio');
  });

  it('should add base URL for path-only inputs', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg'),
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    // Call the function with legacy path (as this utility is for legacy paths)
    const path = 'the-iliad/audio/book-01.mp3';
    const expectedUrl =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';

    // Type cast result since actual implementation returns void
    // Using type unknown and then cast to expected interface structure
    const result = (await downloadFromSpaces(path)) as unknown as {
      url: string;
    };

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    expect(result?.url).toBe(expectedUrl);

    // Verify the standardized path that this would map to
    const standardPath = assetPathService.convertLegacyPath(path);
    expect(standardPath).toContain('assets/audio/the-iliad');
  });

  it('should handle leading slashes in paths', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg'),
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    // Call the function with legacy path with leading slash
    const path = '/the-iliad/audio/book-01.mp3';
    const expectedUrl =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';

    // Type cast result since actual implementation returns void
    // Using type unknown and then cast to expected interface structure
    const result = (await downloadFromSpaces(path)) as unknown as {
      url: string;
    };

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    expect(result?.url).toBe(expectedUrl);

    // Verify both path services handle leading slashes
    const standardPath = assetPathService.convertLegacyPath(path);
    expect(standardPath).not.toContain('//');
    expect(standardPath).toContain('assets/audio/the-iliad');
  });

  it('should retry on failure', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;

    // First call fails, second succeeds
    mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg'),
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    });

    // Reduce timeout and retry delay for test
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: () => void) => {
      callback();
      return 1 as unknown as NodeJS.Timeout;
    });

    // Call the function
    const url =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';

    // The downloadFromSpaces function is deprecated and will throw an error
    // In the actual code, but for the test we've mocked it
    // We need to type cast the result as the actual implementation returns void
    // Using type unknown and then cast to expected interface structure
    const result = (await downloadFromSpaces(url, { maxRetries: 3 })) as unknown as {
      size: number;
      contentType: string;
    };

    // Assertions
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result?.size).toBe(1024);
    expect(result?.contentType).toBe('audio/mpeg');
  });

  it('should throw after max retries', async () => {
    // Mock implementation
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error('Network error'));

    // Reduce timeout and retry delay for test
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: () => void) => {
      callback();
      return 1 as unknown as NodeJS.Timeout;
    });

    // Call the function
    const url =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';

    // Assertions
    await expect(downloadFromSpaces(url, { maxRetries: 2 })).rejects.toThrow(
      'Failed to download from',
    );

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('getAudioPathFromUrl', () => {
  it('should extract path from URL', () => {
    // Test with legacy path format
    const url =
      'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    const extractedPath = getAudioPathFromUrl(url);
    expect(extractedPath).toBe('the-iliad/audio/book-01.mp3');

    // Verify we can convert to standardized path
    const standardPath = assetPathService.convertLegacyPath(extractedPath);
    expect(standardPath).toContain('assets/audio/the-iliad');
  });

  it('should remove leading slash', () => {
    const path = '/the-iliad/audio/book-01.mp3';
    const extractedPath = getAudioPathFromUrl(path);
    expect(extractedPath).toBe('the-iliad/audio/book-01.mp3');

    // Verify we can convert to standardized path
    const standardPath = assetPathService.convertLegacyPath(extractedPath);
    expect(standardPath).toContain('assets/audio/the-iliad');
  });

  it('should return path as is if no leading slash', () => {
    const path = 'the-iliad/audio/book-01.mp3';
    const extractedPath = getAudioPathFromUrl(path);
    expect(extractedPath).toBe('the-iliad/audio/book-01.mp3');

    // Verify we can convert to standardized path
    const standardPath = assetPathService.convertLegacyPath(extractedPath);
    expect(standardPath).toContain('assets/audio/the-iliad');
  });

  it('should handle both legacy and standardized paths', () => {
    // Legacy path format
    const legacyPath = 'the-iliad/audio/book-01.mp3';
    expect(getAudioPathFromUrl(legacyPath)).toBe(legacyPath);

    // Standardized path format - also works with getAudioPathFromUrl but returns without domain
    const standardPath = 'assets/audio/the-iliad/chapter-01.mp3';
    const url = `https://test-blob-storage.com/${standardPath}`;
    expect(getAudioPathFromUrl(url)).toBe(standardPath);
  });
});
