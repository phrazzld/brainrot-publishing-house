import * as nextNavigation from 'next/navigation';

import { act, renderHook } from '@testing-library/react';

import { useChapterNavigation } from '@/hooks/useChapterNavigation';
import { Translation } from '@/utils/types';

// Type for mocked module
type MockedNavigation = typeof nextNavigation & {
  useParams: jest.Mock;
  useSearchParams: jest.Mock;
  useRouter: jest.Mock;
  ReadonlyURLSearchParams: jest.Mock;
};

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn().mockReturnValue({ slug: 'test-book' }),
  useSearchParams: jest.fn().mockReturnValue({
    get: jest.fn((param) => {
      if (param === 'c') return '0';
      if (param === 't') return '0';
      return null;
    }),
  }),
  useRouter: jest.fn().mockReturnValue({
    replace: jest.fn(),
  }),
  ReadonlyURLSearchParams: jest.fn(),
}));

// Get the mocked module
const mockedNavigation = nextNavigation as MockedNavigation;

// Mock translations data
const mockTranslations: Translation[] = [
  {
    title: 'Test Book',
    slug: 'test-book',
    author: 'Test Author',
    description: 'A test book',
    coverImage: '/cover.jpg',
    publishingInfo: 'Test Publisher, 2023',
    chapters: [
      { title: 'Chapter 1', text: 'file1.txt', audioSrc: 'audio1.mp3' },
      { title: 'Chapter 2', text: 'file2.txt', audioSrc: 'audio2.mp3' },
      { title: 'Chapter 3', text: 'file3.txt', audioSrc: 'audio3.mp3' },
    ],
  },
];

describe('useChapterNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));

    const [state, _] = result.current;

    // Verify initial state
    expect(state.chapterIndex).toBe(0);
    expect(state.slug).toBe('test-book');
    expect(state.translation).toEqual(mockTranslations[0]);
    expect(state.chapterData).toEqual(mockTranslations[0].chapters[0]);
    expect(state.totalChapters).toBe(3);
  });

  it('should navigate to next chapter', () => {
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));
    const router = mockedNavigation.useRouter();

    // Navigate to next chapter
    act(() => {
      const [_, actions] = result.current;
      actions.goNextChapter();
    });

    // Verify state updates
    const [state, _] = result.current;
    expect(state.chapterIndex).toBe(1);

    // Verify router update
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=1');
  });

  it('should navigate to previous chapter', () => {
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));
    const router = mockedNavigation.useRouter();

    // First go to chapter 2
    act(() => {
      const [_, actions] = result.current;
      actions.handleChapterClick(2);
    });

    // Then navigate back to previous chapter
    act(() => {
      const [_, actions] = result.current;
      actions.goPrevChapter();
    });

    // Verify state updates
    const [state, _] = result.current;
    expect(state.chapterIndex).toBe(1);

    // Verify router update
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=1');
  });

  it('should handle direct chapter click', () => {
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));
    const router = mockedNavigation.useRouter();

    // Click on chapter 2
    act(() => {
      const [_, actions] = result.current;
      actions.handleChapterClick(2);
    });

    // Verify state updates
    const [state, _] = result.current;
    expect(state.chapterIndex).toBe(2);

    // Verify router update
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=2');
  });

  it('should throttle timestamp updates', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));
    const router = mockedNavigation.useRouter();

    // Update timestamp
    act(() => {
      const [_, actions] = result.current;
      actions.updateTimestamp(10);
    });

    // First update should go through
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=0&t=10');

    // Reset mock to check next call
    router.replace.mockClear();

    // Try another timestamp update immediately - should be throttled
    act(() => {
      const [_, actions] = result.current;
      actions.updateTimestamp(20);
    });

    // No router update due to throttling
    expect(router.replace).not.toHaveBeenCalled();

    // Advance time past throttle window
    jest.advanceTimersByTime(5500);

    // Try timestamp update again
    act(() => {
      const [_, actions] = result.current;
      actions.updateTimestamp(30);
    });

    // Should update now
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=0&t=30');

    jest.useRealTimers();
  });

  it('should handle navigation during timestamp throttling', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useChapterNavigation(mockTranslations));
    const router = mockedNavigation.useRouter();

    // Update timestamp first
    act(() => {
      const [_, actions] = result.current;
      actions.updateTimestamp(10);
    });

    router.replace.mockClear();

    // Try to update timestamp again - should be throttled
    act(() => {
      const [_, actions] = result.current;
      actions.updateTimestamp(20);
    });

    // No call due to throttling
    expect(router.replace).not.toHaveBeenCalled();

    // But navigation should still work during throttling
    act(() => {
      const [_, actions] = result.current;
      actions.goNextChapter();
    });

    // Should update router despite timestamp throttling
    expect(router.replace).toHaveBeenCalledWith('/reading-room/test-book?c=1');

    jest.useRealTimers();
  });
});
