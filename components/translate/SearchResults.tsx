'use client';

import { BookSearchResult } from '../../utils/types';

interface SearchResultsProps {
  searchResults: BookSearchResult[];
  onBookSelect: (bookId: number) => void;
  onReset: () => void;
  running: boolean;
}

export default function SearchResults({
  searchResults,
  onBookSelect,
  onReset,
  running,
}: SearchResultsProps) {
  if (searchResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="text-xl mb-2">select a book from the results:</h2>
      <div className="grid gap-4">
        {searchResults.map((book) => (
          <button
            type="button"
            key={book.id}
            className="p-4 border rounded-lg hover:bg-gray-100 text-left w-full appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onBookSelect(book.id)}
            disabled={running}
          >
            <h3 className="font-bold text-lg">{book.title}</h3>
            <p className="italic">by {book.authors}</p>
            <p className="text-sm text-gray-600">downloads: {book.downloadCount}</p>
          </button>
        ))}
      </div>
      <button className="mt-2 underline text-blue-500" onClick={onReset}>
        or search again
      </button>
    </div>
  );
}
