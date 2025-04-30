'use client';

import { useEffect, useState } from 'react';
import { BookSearchResult } from '../utils/types';

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

interface SearchParams {
  query: string;
  model: string;
  password: string;
  notes: string;
}

interface TranslationParams extends SearchParams {
  bookId: number;
}

export function useTranslationStream(): [TranslationStreamState, TranslationStreamActions] {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [evtSource, setEvtSource] = useState<EventSource | null>(null);

  // Creates a URL with query parameters for the API endpoint
  const buildApiUrl = (params: SearchParams, bookId?: number): string => {
    let url = '/api/translate?';
    
    const queryParams: Record<string, string> = {
      query: params.query,
      model: params.model,
      password: params.password,
    };
    
    if (bookId !== undefined) {
      queryParams.bookId = bookId.toString();
    }
    
    if (params.notes?.length > 0) {
      queryParams.notes = params.notes;
    }
    
    const paramString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
      
    return url + paramString;
  };

  // Common setup for both search and translation streams
  const setupEventSource = (url: string): EventSource => {
    const es = new EventSource(url);
    setEvtSource(es);
    
    es.onmessage = (evt) => {
      console.log('onmessage:', evt.data);
    };
    
    es.addEventListener('log', (event: MessageEvent) => {
      setLogs((old) => [`[log] ${event.data}`, ...old]);
    });
    
    es.addEventListener('error', (event: MessageEvent) => {
      console.error('sse error event', event);
      setError(`error: ${event.data}`);
      es.close();
      setEvtSource(null);
      setRunning(false);
    });
    
    return es;
  };

  // Start search operation
  const startSearch = ({ query, model, password, notes }: SearchParams) => {
    if (!query.trim() || !password.trim()) {
      alert('need query + password');
      return;
    }
    
    // Reset state
    setLogs([]);
    setError('');
    setSearchResults([]);
    setRunning(true);
    
    const url = buildApiUrl({ query, model, password, notes });
    const es = setupEventSource(url);
    
    // Handle search results
    es.addEventListener('results', (event: MessageEvent) => {
      try {
        const results = JSON.parse(event.data);
        setSearchResults(results);
        setLogs((old) => [`[log] received search results`, ...old]);
      } catch (err) {
        console.error('failed to parse results event', err);
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
  const startTranslation = ({ bookId, query, model, password, notes }: TranslationParams) => {
    // Reset state
    setLogs([]);
    setError('');
    setRunning(true);
    
    const url = buildApiUrl({ query, model, password, notes }, bookId);
    const es = setupEventSource(url);
    
    // Handle source text event
    es.addEventListener('source', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { filename, content } = payload;
        downloadFile(filename, content);
        setLogs((old) => [`[log] downloaded source text -> ${filename}`, ...old]);
      } catch (err) {
        console.error('failed to parse source event', err);
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
        console.error('failed to parse done event', err);
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
    { startSearch, startTranslation, resetResults }
  ];
}