'use client';

import { useEffect, useState } from 'react';
import { BookSearchResult } from '../../utils/types';

export default function TranslatePage() {
  const [query, setQuery] = useState('');
  const [model, setModel] = useState('o3-mini');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [evtSource, setEvtSource] = useState<EventSource | null>(null);
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);

  // initiate search to fetch top 5 results
  function startSearch() {
    if (!query.trim() || !password.trim()) {
      alert('need query + password');
      return;
    }
    setLogs([]);
    setError('');
    setSearchResults([]);
    setRunning(true);

    let url = `/api/translate?query=${encodeURIComponent(query)}&model=${encodeURIComponent(
      model
    )}&password=${encodeURIComponent(password)}`;
    if (notes.length > 0) {
      url += `&notes=${encodeURIComponent(notes)}`;
    }

    const es = new EventSource(url);
    setEvtSource(es);

    es.onmessage = (evt) => {
      console.log('onmessage:', evt.data);
    };

    es.addEventListener('log', (event: MessageEvent) => {
      setLogs((old) => [`[log] ${event.data}`, ...old]);
    });

    es.addEventListener('results', (event: MessageEvent) => {
      try {
        const results = JSON.parse(event.data);
        setSearchResults(results);
        setLogs((old) => [`[log] received search results`, ...old]);
      } catch (err) {
        console.error('failed to parse results event', err);
        setError("couldn't parse search results: " + String(err));
      }
      es.close();
      setEvtSource(null);
      setRunning(false);
    });

    es.addEventListener('error', (event: MessageEvent) => {
      console.error('sse error event', event);
      setError(`error: ${event.data}`);
      es.close();
      setEvtSource(null);
      setRunning(false);
    });
  }

  // automatically start translation when a search result is selected
  function startTranslationWithBook(bookId: number) {
    setLogs([]);
    setError('');
    setRunning(true);

    let url = `/api/translate?bookId=${encodeURIComponent(
      bookId.toString()
    )}&query=${encodeURIComponent(query)}&model=${encodeURIComponent(
      model
    )}&password=${encodeURIComponent(password)}`;
    if (notes.length > 0) {
      url += `&notes=${encodeURIComponent(notes)}`;
    }

    const es = new EventSource(url);
    setEvtSource(es);

    es.onmessage = (evt) => {
      console.log('onmessage:', evt.data);
    };

    es.addEventListener('log', (event: MessageEvent) => {
      setLogs((old) => [`[log] ${event.data}`, ...old]);
    });

    es.addEventListener('source', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { filename, content } = payload;
        const blob = new Blob([content], { type: 'text/plain' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        setLogs((old) => [`[log] downloaded source text -> ${filename}`, ...old]);
      } catch (err) {
        console.error('failed to parse source event', err);
        setError("couldn't parse raw source text: " + String(err));
      }
    });

    es.addEventListener('done', (event: MessageEvent) => {
      setLogs((old) => ['[log] translation complete! initiating download...', ...old]);
      try {
        const { filename, content } = JSON.parse(event.data);
        const blob = new Blob([content], { type: 'text/plain' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error('failed to parse done event', err);
        setError('failed to parse final text: ' + String(err));
      }
      es.close();
      setEvtSource(null);
      setRunning(false);
    });

    es.addEventListener('error', (event: MessageEvent) => {
      console.error('sse error event', event);
      setError(`error: ${event.data}`);
      es.close();
      setEvtSource(null);
      setRunning(false);
    });
  }

  // reset search results to allow reselecting
  function resetSelection() {
    setSearchResults([]);
  }

  useEffect(() => {
    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [evtSource]);

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      <h1 className="text-3xl">translate some public domain text</h1>

      <div className="flex flex-col gap-2 max-w-md">
        <label>password (for private usage)</label>
        <input
          type="password"
          className="p-2 text-black"
          placeholder="enter secret"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label>pick a model</label>
        <select className="p-2 text-black" value={model} onChange={(e) => setModel(e.target.value)}>
          {MODEL_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label>enter book/author query</label>
        <input
          className="p-2 text-black"
          placeholder="e.g. alice in wonderland"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label>other notes</label>
        <input
          className="p-2 text-black"
          placeholder={`e.g. always start chapters with "whadup chat, it's ya boi"`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {searchResults.length === 0 && (
          <button className="btn btn-primary" onClick={startSearch} disabled={running}>
            {running ? 'searching...' : 'search'}
          </button>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl mb-2">select a book from the results:</h2>
            <div className="grid gap-4">
              {searchResults.map((book) => (
                <button
                  type="button"
                  key={book.id}
                  className="p-4 border rounded-lg hover:bg-gray-100 text-left w-full appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => startTranslationWithBook(book.id)}
                  disabled={running}
                >
                  <h3 className="font-bold text-lg">{book.title}</h3>
                  <p className="italic">by {book.authors}</p>
                  <p className="text-sm text-gray-600">downloads: {book.downloadCount}</p>
                </button>
              ))}
            </div>
            <button className="mt-2 underline text-blue-500" onClick={resetSelection}>
              or search again
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-red-400">error: {error}</div>}

      <div className="mt-4 bg-black/20 p-2 rounded-md max-w-2xl">
        <h2 className="text-lg font-semibold mb-2">logs</h2>
        <div className="text-sm">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </main>
  );
}

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'o3-mini', label: 'o3-mini' },
  { value: 'o1', label: 'o1' },
  { value: 'deepseek/deepseek-r1', label: 'deepseek r1' },
];
