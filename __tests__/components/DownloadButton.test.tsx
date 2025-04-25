import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownloadButton from '../../components/DownloadButton';
import * as blobUrlUtils from '../../utils/getBlobUrl';

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

document.createElement = jest.fn().mockImplementation((tag) => {
  if (tag === 'a') return mockLink;
  return document.createElement(tag);
});

document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

// Mock fetch
global.fetch = jest.fn();

describe('DownloadButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (blobUrlUtils.getAssetUrlWithFallback as jest.Mock).mockResolvedValue('https://mock-blob-url.com/audio.mp3');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['mock audio content'], { type: 'audio/mpeg' })),
    });
  });

  it('renders the download button for a full audiobook', () => {
    render(<DownloadButton slug="hamlet" type="full" />);
    
    expect(screen.getByText('download full audiobook')).toBeInTheDocument();
  });

  it('renders the download button for a chapter', () => {
    render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);
    
    expect(screen.getByText('download chapter 3')).toBeInTheDocument();
  });

  it('downloads a full audiobook from Blob storage', async () => {
    render(<DownloadButton slug="hamlet" type="full" />);
    
    fireEvent.click(screen.getByText('download full audiobook'));
    
    expect(screen.getByText('downloading...')).toBeInTheDocument();
    
    // Check if getAssetUrlWithFallback was called with the correct path
    expect(blobUrlUtils.getAssetUrlWithFallback).toHaveBeenCalledWith('/hamlet/audio/full-audiobook.mp3');
    
    await waitFor(() => {
      // Check if fetch was called with the resolved URL
      expect(global.fetch).toHaveBeenCalledWith('https://mock-blob-url.com/audio.mp3');
      
      // Check if the download link was created and clicked
      expect(mockLink.download).toBe('hamlet.mp3');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      
      // Button should return to normal state
      expect(screen.getByText('download full audiobook')).toBeInTheDocument();
    });
  });

  it('downloads a chapter audiobook from Blob storage', async () => {
    render(<DownloadButton slug="hamlet" type="chapter" chapter={3} />);
    
    fireEvent.click(screen.getByText('download chapter 3'));
    
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
    
    render(<DownloadButton slug="hamlet" type="full" />);
    
    fireEvent.click(screen.getByText('download full audiobook'));
    
    await waitFor(() => {
      expect(screen.getByText('failed to download. sry bestie.')).toBeInTheDocument();
    });
  });

  it('shows an error when file fetch returns not ok', async () => {
    // Mock fetch to return not ok
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    });
    
    render(<DownloadButton slug="hamlet" type="full" />);
    
    fireEvent.click(screen.getByText('download full audiobook'));
    
    await waitFor(() => {
      expect(screen.getByText('failed to download. sry bestie.')).toBeInTheDocument();
    });
  });
});