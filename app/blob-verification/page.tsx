'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import translations from '@/translations';
import { assetExistsInBlobStorage, clearBlobUrlCache } from '@/utils';

interface AssetStatus {
  exists: boolean;
  loading: boolean;
  error: string | null;
}

interface BookVerificationStatus {
  coverImage: AssetStatus;
  firstChapter: AssetStatus;
  audio: AssetStatus;
  overall: 'success' | 'partial' | 'failed' | 'loading';
}

// Helper function to verify a book cover image
async function verifyBookCoverImage(book: (typeof translations)[0]): Promise<AssetStatus> {
  try {
    const coverExists = await assetExistsInBlobStorage(book.coverImage);
    return { exists: coverExists, loading: false, error: null };
  } catch (error) {
    return {
      exists: false,
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper function to verify a book's first chapter
async function verifyBookFirstChapter(book: (typeof translations)[0]): Promise<AssetStatus> {
  if (book.chapters.length === 0) {
    return { exists: false, loading: false, error: 'No chapters available' };
  }

  try {
    const chapterExists = await assetExistsInBlobStorage(book.chapters[0].text);
    return { exists: chapterExists, loading: false, error: null };
  } catch (error) {
    return {
      exists: false,
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper function to verify a book's audio
async function verifyBookAudio(book: (typeof translations)[0]): Promise<AssetStatus> {
  if (book.chapters.length === 0 || !book.chapters[0].audioSrc) {
    return { exists: false, loading: false, error: 'No audio available' };
  }

  try {
    const audioExists = await assetExistsInBlobStorage(book.chapters[0].audioSrc);
    return { exists: audioExists, loading: false, error: null };
  } catch (error) {
    return {
      exists: false,
      loading: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper function to determine the overall status
function determineOverallStatus(
  coverImage: AssetStatus,
  firstChapter: AssetStatus
): 'success' | 'partial' | 'failed' | 'loading' {
  if (coverImage.exists && firstChapter.exists) {
    return 'success';
  } else if (coverImage.exists || firstChapter.exists) {
    return 'partial';
  }
  return 'failed';
}

export default function BlobVerificationPage() {
  const [bookStatuses, setBookStatuses] = useState<Record<string, BookVerificationStatus>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCacheCleared, setIsCacheCleared] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Function to verify a single book's assets in Blob storage
  async function verifyBook(slug: string) {
    const book = translations.find((t) => t.slug === slug);
    if (!book) return;

    // Update book status to loading
    setBookStatuses((prev) => ({
      ...prev,
      [slug]: {
        coverImage: { exists: false, loading: true, error: null },
        firstChapter: { exists: false, loading: true, error: null },
        audio: { exists: false, loading: true, error: null },
        overall: 'loading',
      },
    }));

    // Run verifications in parallel
    const [coverImageStatus, firstChapterStatus, audioStatus] = await Promise.all([
      verifyBookCoverImage(book),
      verifyBookFirstChapter(book),
      verifyBookAudio(book),
    ]);

    // Determine overall status
    const overall = determineOverallStatus(coverImageStatus, firstChapterStatus);

    // Update book status
    setBookStatuses((prev) => ({
      ...prev,
      [slug]: {
        coverImage: coverImageStatus,
        firstChapter: firstChapterStatus,
        audio: audioStatus,
        overall,
      },
    }));
  }

  // Function to verify all books in parallel
  async function verifyAllBooks() {
    setIsVerifying(true);

    // Reset all book statuses to loading
    const initialStatuses: Record<string, BookVerificationStatus> = {};
    translations.forEach((book) => {
      initialStatuses[book.slug] = {
        coverImage: { exists: false, loading: true, error: null },
        firstChapter: { exists: false, loading: true, error: null },
        audio: { exists: false, loading: true, error: null },
        overall: 'loading',
      };
    });
    setBookStatuses(initialStatuses);

    // Start verification for all books in parallel
    const verificationPromises = translations.map((book) => verifyBook(book.slug));
    await Promise.all(verificationPromises);

    setIsVerifying(false);
  }

  // Clear cache and rerun verification
  function handleClearCache() {
    clearBlobUrlCache();
    setIsCacheCleared(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsCacheCleared(false), 3000);
  }

  // Run verification on initial load
  useEffect(() => {
    verifyAllBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Get status summary
  const successCount = Object.values(bookStatuses).filter((s) => s.overall === 'success').length;
  const partialCount = Object.values(bookStatuses).filter((s) => s.overall === 'partial').length;
  const failedCount = Object.values(bookStatuses).filter((s) => s.overall === 'failed').length;
  const loadingCount = Object.values(bookStatuses).filter((s) => s.overall === 'loading').length;
  const totalBooks = translations.length;

  // Book Card Component
  function BookVerificationCard({
    book,
    status,
    onVerify,
  }: {
    book: (typeof translations)[0];
    status: BookVerificationStatus;
    onVerify: () => void;
  }) {
    // Determine the status color
    let statusColor = 'bg-blue-200';
    if (status.overall === 'success') statusColor = 'bg-green-200 dark:bg-green-800';
    else if (status.overall === 'partial') statusColor = 'bg-yellow-200 dark:bg-yellow-800';
    else if (status.overall === 'failed') statusColor = 'bg-red-200 dark:bg-red-800';
    else statusColor = 'bg-blue-200 dark:bg-blue-800';

    return (
      <div className={`${statusColor} p-4 rounded-lg`}>
        <h2 className="text-xl font-bold mb-4">{book.title}</h2>

        <div className="mb-4">
          <div className="flex justify-between">
            <div>Cover Image:</div>
            <div>{status.coverImage.loading ? '⏳' : status.coverImage.exists ? '✅' : '❌'}</div>
          </div>

          <div className="flex justify-between">
            <div>First Chapter:</div>
            <div>
              {status.firstChapter.loading ? '⏳' : status.firstChapter.exists ? '✅' : '❌'}
            </div>
          </div>

          <div className="flex justify-between">
            <div>Audio:</div>
            <div>
              {status.audio.loading
                ? '⏳'
                : status.audio.exists
                  ? '✅'
                  : status.audio.error === 'No audio available'
                    ? 'N/A'
                    : '❌'}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onVerify}
            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg text-sm"
          >
            Verify
          </button>

          <Link
            href={`/reading-room/${book.slug}`}
            className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-lg text-sm"
          >
            Open Book
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto my-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Blob Storage Verification</h1>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-2">Overall Status</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
            <span className="font-bold">Success:</span> {successCount} / {totalBooks}
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
            <span className="font-bold">Partial:</span> {partialCount} / {totalBooks}
          </div>
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
            <span className="font-bold">Failed:</span> {failedCount} / {totalBooks}
          </div>
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
            <span className="font-bold">Loading:</span> {loadingCount} / {totalBooks}
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={verifyAllBooks}
            disabled={isVerifying}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Verify All Books'}
          </button>

          <button
            onClick={handleClearCache}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            {isCacheCleared ? 'Cache Cleared!' : 'Clear Cache'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {translations.map((book) => (
          <BookVerificationCard
            key={book.slug}
            book={book}
            status={
              bookStatuses[book.slug] || {
                coverImage: { exists: false, loading: true, error: null },
                firstChapter: { exists: false, loading: true, error: null },
                audio: { exists: false, loading: true, error: null },
                overall: 'loading',
              }
            }
            onVerify={() => verifyBook(book.slug)}
          />
        ))}
      </div>
    </div>
  );
}
