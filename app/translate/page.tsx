'use client';

import { ChangeEvent, useState } from 'react';

import LogDisplay from '@/components/translate/LogDisplay';
import SearchForm, { ModelOption } from '@/components/translate/SearchForm';
import SearchResults from '@/components/translate/SearchResults';
import { useTranslationStream } from '@/hooks/useTranslationStream';

const MODEL_OPTIONS: ModelOption[] = [
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'o3-mini', label: 'o3-mini' },
  { value: 'o1', label: 'o1' },
  { value: 'deepseek/deepseek-r1', label: 'deepseek r1' },
];

export default function TranslatePage() {
  // Form state
  const [query, setQuery] = useState('');
  const [model, setModel] = useState('o3-mini');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  // Use custom hook for handling translation event streams
  const [streamState, streamActions] = useTranslationStream();
  const { logs, error, running, searchResults } = streamState;
  const { startSearch, startTranslation, resetResults } = streamActions;

  // Event handlers
  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => setModel(e.target.value);
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);
  const handleNotesChange = (e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value);
  const handleSearch = () => {
    startSearch({ query, model, password, notes });
  };
  const handleBookSelect = (bookId: number) => {
    startTranslation({ bookId, query, model, password, notes });
  };

  return (
    <main className="min-h-screen p-4 flex flex-col gap-4">
      <h1 className="text-3xl">translate some public domain text</h1>

      {searchResults.length === 0 ? (
        <SearchForm
          query={query}
          model={model}
          password={password}
          notes={notes}
          running={running}
          onQueryChange={handleQueryChange}
          onModelChange={handleModelChange}
          onPasswordChange={handlePasswordChange}
          onNotesChange={handleNotesChange}
          onSearch={handleSearch}
          modelOptions={MODEL_OPTIONS}
        />
      ) : (
        <SearchResults
          searchResults={searchResults}
          onBookSelect={handleBookSelect}
          onReset={resetResults}
          running={running}
        />
      )}

      <LogDisplay logs={logs} error={error} />
    </main>
  );
}
