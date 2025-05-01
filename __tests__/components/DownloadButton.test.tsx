import React from 'react';

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import * as blobUrlUtils from '../../utils/getBlobUrl';
import DownloadButton from '../../components/DownloadButton';
import { render } from '../utils/test-utils';

// Mock the getBlobUrl utilities
jest.mock('../../utils/getBlobUrl', () => ({
  getAssetUrlWithFallback: jest.fn(),
}));

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

// Mock fetch
global.fetch = jest.fn();

describe('DownloadButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (blobUrlUtils.getAssetUrlWithFallback as jest.Mock).mockResolvedValue(
      'https://mock-blob-url.com/audio.mp3'
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['mock audio content'], { type: 'audio/mpeg' })),
    });
  });

  it('renders the download button for a full audiobook', () => {
    const { container } = render(<DownloadButton slug="hamlet" type="full" />);

    // Just check if the text is in the container
    const buttonText = container.textContent;
    expect(buttonText).toContain('download full audiobook');
  });

  it('renders the download button for a chapter', () => {
    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);

    // Just check if the text is in the container
    const buttonText = container.textContent;
    expect(buttonText).toContain('download chapter 3');
  });

  it('downloads a full audiobook from Blob storage', async () => {
    const { container } = render(<DownloadButton slug="hamlet" type="full" />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    // Check for downloading state
    const downloadingText = container.textContent?.includes('downloading...');
    expect(downloadingText).toBe(true);

    // Check if getAssetUrlWithFallback was called with the correct path
    expect(blobUrlUtils.getAssetUrlWithFallback).toHaveBeenCalledWith(
      '/hamlet/audio/full-audiobook.mp3'
    );

    await waitFor(() => {
      // Check if fetch was called with the resolved URL
      expect(global.fetch).toHaveBeenCalledWith('https://mock-blob-url.com/audio.mp3');

      // Check if the download link was created and clicked
      expect(mockLink.download).toBe('hamlet.mp3');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();

      // Button should return to normal state
      expect(button).toHaveTextContent('download full audiobook');
    });
  });

  it('downloads a chapter audiobook from Blob storage', async () => {
    const { container } = render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    // Check if getAssetUrlWithFallback was called with the correct path
    expect(blobUrlUtils.getAssetUrlWithFallback).toHaveBeenCalledWith('/hamlet/audio/book-03.mp3');

    await waitFor(() => {
      // Check download filename
      expect(mockLink.download).toBe('hamlet-chapter-3.mp3');
    });
  });

  it('shows an error message when download fails', async () => {
    // Mock fetch to fail
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { container } = render(<DownloadButton slug="hamlet" type="full" />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      const errorMessage = container.textContent?.includes('failed to download. sry bestie.');
      expect(errorMessage).toBe(true);
    });
  });

  it('shows an error when file fetch returns not ok', async () => {
    // Mock fetch to return not ok
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });

    const { container } = render(<DownloadButton slug="hamlet" type="full" />);

    // Use a direct selector
    const button = container.querySelector('button');
    fireEvent.click(button as HTMLButtonElement);

    await waitFor(() => {
      const errorMessage = container.textContent?.includes('failed to download. sry bestie.');
      expect(errorMessage).toBe(true);
    });
  });
});
