import React from 'react';

import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/react';

import DownloadButton from '../../components/DownloadButton';
import { render } from '../utils/test-utils';

// Mock URL.createObjectURL
URL.createObjectURL = jest.fn(() => 'mock-blob-url');

// Mock createElement and appendChild
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockLink = {
  href: '',
  download: '',
  click: mockClick,
};

// Store original document.createElement to avoid recursion
const originalCreateElement = document.createElement;
document.createElement = jest.fn().mockImplementation((tag) => {
  if (tag === 'a') return mockLink;
  // Use the original createElement to avoid recursion
  return originalCreateElement.call(document, tag);
});

document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

// Mock fetch - we need to mock both API calls
// First call gets the URL, second call downloads the file
global.fetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes('proxy=true')) {
    // This is the proxied file download request
    return Promise.resolve({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['mock audio content'], { type: 'audio/mpeg' })),
    });
  } else {
    // This is the initial API call to get URL
    return Promise.resolve({
      ok: true,
      json: jest.fn().mockResolvedValue({
        url: 'https://vercel-blob.vercel.app/hamlet/audio/chapter-01.mp3',
        isCdnUrl: false,
        shouldProxy: false,
      }),
    });
  }
});

describe('DownloadButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock fetch implementation to our default implementation
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('proxy=true')) {
        // This is the proxied file download request
        return Promise.resolve({
          ok: true,
          blob: jest
            .fn()
            .mockResolvedValue(new Blob(['mock audio content'], { type: 'audio/mpeg' })),
        });
      } else {
        // This is the initial API call to get URL
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            url: 'https://vercel-blob.vercel.app/hamlet/audio/chapter-01.mp3',
            isCdnUrl: false,
            shouldProxy: false,
          }),
        });
      }
    });
  });

  it('renders the download button for a chapter', () => {
    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);

    // Just check if the text is in the container
    const buttonText = container.textContent;
    expect(buttonText).toContain('download chapter 3');
  });

  it('downloads a chapter audiobook through the API proxy', async () => {
    // Mock the chapter-specific response
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('proxy=true')) {
        // This is the proxied file download request
        return Promise.resolve({
          ok: true,
          blob: jest
            .fn()
            .mockResolvedValue(new Blob(['mock audio content'], { type: 'audio/mpeg' })),
        });
      } else {
        // This is the initial API call to get URL
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            url: 'https://vercel-blob.vercel.app/hamlet/audio/chapter-03.mp3',
            isCdnUrl: false,
            shouldProxy: false,
          }),
        });
      }
    });

    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      // Verify API calls
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Should first call the API to get URL info
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
        '/api/download?slug=hamlet&type=chapter&chapter=3',
      );

      // Then should call the proxy endpoint
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
        '/api/download?slug=hamlet&type=chapter&chapter=3&proxy=true',
      );

      // Check download filename
      expect(mockLink.download).toBe('hamlet-chapter-3.mp3');
    });
  });

  it('shows an error message when API call fails', async () => {
    // Mock the first fetch (API call) to fail
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={1} />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      const errorMessage = container.textContent?.includes('Failed to download');
      expect(errorMessage).toBe(true);
    });
  });

  it('shows an error when file fetch returns not ok', async () => {
    // First call succeeds, proxy call fails
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (!url.includes('proxy=true')) {
        // Initial API call succeeds
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            url: 'https://vercel-blob.vercel.app/hamlet/audio/chapter-01.mp3',
            isCdnUrl: false,
            shouldProxy: false,
          }),
        });
      } else {
        // Proxy call fails
        return Promise.resolve({
          ok: false,
          text: jest.fn().mockResolvedValue('File not found'),
        });
      }
    });

    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={1} />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      const errorMessage = container.textContent?.includes('Failed to download');
      expect(errorMessage).toBe(true);
    });
  });

  it('handles error responses with error field', async () => {
    // Mock API call to return an error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          error: 'Resource not found',
          message: 'The requested audio file does not exist',
          code: 'NotFound.404',
        }),
      ),
    });

    const { container } = render(<DownloadButton slug="nonexistent" type="chapter" chapter={1} />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      const errorMessage = container.textContent?.includes(
        'The requested audio file does not exist',
      );
      expect(errorMessage).toBe(true);
    });
  });
});
