import { downloadFromSpaces, getAudioPathFromUrl } from '../../utils/downloadFromSpaces';

// Mock fetch API
global.fetch = jest.fn();

describe('downloadFromSpaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variable
    process.env.NEXT_PUBLIC_SPACES_BASE_URL = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com';
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
        get: jest.fn().mockReturnValue('audio/mpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    // Call the function
    const url = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    const result = await downloadFromSpaces(url);

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
    expect(result.url).toBe(url);
    expect(result.size).toBe(1024);
    expect(result.contentType).toBe('audio/mpeg');
  });

  it('should add base URL for path-only inputs', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    // Call the function
    const path = 'the-iliad/audio/book-01.mp3';
    const expectedUrl = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    const result = await downloadFromSpaces(path);

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    expect(result.url).toBe(expectedUrl);
  });

  it('should handle leading slashes in paths', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('audio/mpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    // Call the function
    const path = '/the-iliad/audio/book-01.mp3';
    const expectedUrl = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    const result = await downloadFromSpaces(path);

    // Assertions
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    expect(result.url).toBe(expectedUrl);
  });

  it('should retry on failure', async () => {
    // Mock implementation
    const mockArrayBuffer = new ArrayBuffer(1024);
    const mockFetch = global.fetch as jest.Mock;
    
    // First call fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('audio/mpeg')
        },
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
      });

    // Reduce timeout and retry delay for test
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return 1 as any;
    });

    // Call the function
    const url = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    const result = await downloadFromSpaces(url, { maxRetries: 3 });

    // Assertions
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.size).toBe(1024);
    expect(result.contentType).toBe('audio/mpeg');
  });

  it('should throw after max retries', async () => {
    // Mock implementation
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error('Network error'));

    // Reduce timeout and retry delay for test
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return 1 as any;
    });

    // Call the function
    const url = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    
    // Assertions
    await expect(downloadFromSpaces(url, { maxRetries: 2 }))
      .rejects
      .toThrow('Failed to download from');
    
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe('getAudioPathFromUrl', () => {
  it('should extract path from URL', () => {
    const url = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3';
    expect(getAudioPathFromUrl(url)).toBe('the-iliad/audio/book-01.mp3');
  });

  it('should remove leading slash', () => {
    const path = '/the-iliad/audio/book-01.mp3';
    expect(getAudioPathFromUrl(path)).toBe('the-iliad/audio/book-01.mp3');
  });

  it('should return path as is if no leading slash', () => {
    const path = 'the-iliad/audio/book-01.mp3';
    expect(getAudioPathFromUrl(path)).toBe('the-iliad/audio/book-01.mp3');
  });
});