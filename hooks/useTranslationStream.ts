'use client';

import { useEffect, useState } from 'react';

import { BookSearchResult } from '../utils/types';

// --- State and Action Types ---
interface TranslationStreamState {
  logs: string[];
  error: string;
  running: boolean;
  searchResults: BookSearchResult[];
}

interface TranslationStreamActions {
  startSearch: (params: SearchParams) => void;
  startTranslation: (params: TranslationParams) => void;
  resetResults: () => void;
}

// --- Parameter Object Types ---

// Base parameters shared by search and translation
interface SearchParams {
  query: string;
  model: string;
  password: string;
  notes: string;
}

// Parameters specific to translation (includes bookId)
interface TranslationParams extends SearchParams {
  bookId: number;
}

/**
 * Options for building the API URL.
 * Contains base search parameters and an optional book ID.
 */
interface BuildApiUrlOptions {
  searchParams: SearchParams;
  bookId?: number; // Optional bookId distinguishes search from translation
}

export function useTranslationStream(): [TranslationStreamState, TranslationStreamActions] {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [evtSource, setEvtSource] = useState<EventSource | null>(null);

  /**
   * Creates a URL with query parameters for the API endpoint.
   * @param options - Contains search parameters and optional bookId.
   * @returns The constructed API URL string.
   */
  const buildApiUrl = (options: BuildApiUrlOptions): string => {
    // Destructure the nested options object
    const { searchParams, bookId } = options;
    let url = '/api/translate?';

    // Build query parameters from searchParams
    const queryParams: Record<string, string> = {
      query: searchParams.query,
      model: searchParams.model,
      password: searchParams.password,
    };

    // Add bookId if it exists (for translation requests)
    if (bookId !== undefined) {
      queryParams.bookId = bookId.toString();
    }

    // Add notes if they exist
    if (searchParams.notes?.length > 0) {
      queryParams.notes = searchParams.notes;
    }

    // Encode parameters and append to URL
    const paramString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return url + paramString;
  };

  // Common setup for both search and translation streams
  const setupEventSource = (url: string): EventSource => {
    const es = new EventSource(url);
    setEvtSource(es);

    // Listen for generic messages (not used, but preserved for EventSource initialization)
    es.onmessage = (evt) => {
      // No-op: specific message types are handled by event listeners below
    };

    es.addEventListener('log', (event: MessageEvent) => {
      setLogs((old) => [`[log] ${event.data}`, ...old]);
    });

    es.addEventListener('error', (event: MessageEvent) => {
      // Set error state and close connection
      setError(`error: ${event.data}`);
      es.close();
      setEvtSource(null);
      setRunning(false);
    });

    return es;
  };

  // Start search operation
  const startSearch = (searchParams: SearchParams) => {
    // Accepts SearchParams
    if (!searchParams.query.trim() || !searchParams.password.trim()) {
      alert('need query + password');
      return;
    }

    // Reset state
    setLogs([]);
    setError('');
    setSearchResults([]);
    setRunning(true);

    // Call buildApiUrl with the new options object structure (no bookId)
    const url = buildApiUrl({ searchParams });
    const es = setupEventSource(url);

    // Handle search results
    es.addEventListener('results', (event: MessageEvent) => {
      try {
        const results = JSON.parse(event.data);
        setSearchResults(results);
        setLogs((old) => [`[log] received search results`, ...old]);
      } catch (err) {
        // Handle JSON parse error
        setError(`couldn't parse search results: ${String(err)}`);
      }
      es.close();
      setEvtSource(null);
      setRunning(false);
    });
  };

  // Handle file download
  const downloadFile = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: 'text/plain' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  // Start translation operation
  const startTranslation = (translationParams: TranslationParams) => {
    // Accepts TranslationParams
    // Separate bookId from the rest of the search params
    const { bookId, ...searchParams } = translationParams;

    // Reset state
    setLogs([]);
    setError('');
    setRunning(true);

    // Call buildApiUrl with the new options object structure (including bookId)
    const url = buildApiUrl({ searchParams, bookId });
    const es = setupEventSource(url);

    // Handle source text event
    es.addEventListener('source', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { filename, content } = payload;
        downloadFile(filename, content);
        setLogs((old) => [`[log] downloaded source text -> ${filename}`, ...old]);
      } catch (err) {
        // Handle JSON parse error
        setError(`couldn't parse raw source text: ${String(err)}`);
      }
    });

    // Handle translation completion
    es.addEventListener('done', (event: MessageEvent) => {
      setLogs((old) => ['[log] translation complete! initiating download...', ...old]);
      try {
        const { filename, content } = JSON.parse(event.data);
        downloadFile(filename, content);
      } catch (err) {
        // Handle JSON parse error for translation completion
        setError(`failed to parse final text: ${String(err)}`);
      }
      es.close();
      setEvtSource(null);
      setRunning(false);
    });
  };

  // Reset search results to allow reselecting
  const resetResults = () => {
    setSearchResults([]);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [evtSource]);

  return [
    { logs, error, running, searchResults },
    { startSearch, startTranslation, resetResults },
  ];
}
