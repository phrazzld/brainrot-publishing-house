/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fetchTextWithFallback } from '../../utils/getBlobUrl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import translations from '../../translations';

// Mock the utils module
jest.mock('../../utils/getBlobUrl', () => ({
  fetchTextWithFallback: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock translations
jest.mock('../../translations', () => [
  {
    slug: 'test-book',
    title: 'Test Book',
    shortDescription: 'A test book',
    coverImage: '/assets/test-book/images/test-cover.png',
    status: 'available',
    chapters: [
      {
        title: 'Chapter 1',
        text: '/assets/test-book/text/brainrot/chapter-1.txt',
        audioSrc: null,
      },
      {
        title: 'Chapter 2',
        text: '/assets/test-book/text/brainrot/chapter-2.txt',
        audioSrc: null,
      },
    ],
  },
]);

// Set up mock implementations for navigation hooks
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
};

// Mock WaveSurfer
jest.mock('wavesurfer.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockReturnValue({
      load: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
      playPause: jest.fn(),
      getCurrentTime: jest.fn().mockReturnValue(0),
      getDuration: jest.fn().mockReturnValue(120),
    }),
  },
}));

// Import the component after setting up mocks
import ReadingRoom from '../../app/reading-room/[slug]/page';

describe('Reading Room with Blob Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useParams as jest.Mock).mockReturnValue({ slug: 'test-book' });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '0';
      if (param === 't') return null;
      return null;
    });
    
    // Mock the fetchTextWithFallback function
    (fetchTextWithFallback as jest.Mock).mockResolvedValue('Test chapter content from Blob storage');
  });
  
  it('should render the reading room component with text from Blob storage', async () => {
    render(<ReadingRoom />);
    
    // Check if the component is trying to fetch text from Blob
    expect(fetchTextWithFallback).toHaveBeenCalledWith('/assets/test-book/text/brainrot/chapter-1.txt');
    
    // Wait for text to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test chapter content from Blob storage')).toBeInTheDocument();
    });
  });
  
  it('should handle fetch failures gracefully', async () => {
    // Mock a fetch failure
    (fetchTextWithFallback as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<ReadingRoom />);
    
    // Check if the component is trying to fetch text from Blob
    expect(fetchTextWithFallback).toHaveBeenCalledWith('/assets/test-book/text/brainrot/chapter-1.txt');
    
    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading text/)).toBeInTheDocument();
    });
  });
  
  it('should change chapter when chapter index changes', async () => {
    const { rerender } = render(<ReadingRoom />);
    
    // Initial chapter
    expect(fetchTextWithFallback).toHaveBeenCalledWith('/assets/test-book/text/brainrot/chapter-1.txt');
    
    // Update search params to change chapter
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '1';
      if (param === 't') return null;
      return null;
    });
    
    // Clear previous calls to track new calls
    (fetchTextWithFallback as jest.Mock).mockClear();
    
    // Re-render with new chapter
    rerender(<ReadingRoom />);
    
    // Should fetch new chapter
    expect(fetchTextWithFallback).toHaveBeenCalledWith('/assets/test-book/text/brainrot/chapter-2.txt');
  });
});