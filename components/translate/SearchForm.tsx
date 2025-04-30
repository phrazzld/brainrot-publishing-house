'use client';

import { ChangeEvent } from 'react';

export interface ModelOption {
  value: string;
  label: string;
}

export interface SearchFormProps {
  query: string;
  model: string;
  password: string;
  notes: string;
  running: boolean;
  onQueryChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNotesChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  modelOptions: ModelOption[];
}

export default function SearchForm({
  query,
  model,
  password,
  notes,
  running,
  onQueryChange,
  onModelChange,
  onPasswordChange,
  onNotesChange,
  onSearch,
  modelOptions,
}: SearchFormProps) {
  return (
    <div className="flex flex-col gap-2 max-w-md">
      <label htmlFor="password-input">password (for private usage)</label>
      <input
        id="password-input"
        type="password"
        className="p-2 text-black"
        placeholder="enter secret"
        value={password}
        onChange={onPasswordChange}
      />

      <label htmlFor="model-select">pick a model</label>
      <select
        id="model-select"
        className="p-2 text-black"
        value={model}
        onChange={onModelChange}
      >
        {modelOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor="query-input">enter book/author query</label>
      <input
        id="query-input"
        className="p-2 text-black"
        placeholder="e.g. alice in wonderland"
        value={query}
        onChange={onQueryChange}
      />

      <label htmlFor="notes-input">other notes</label>
      <input
        id="notes-input"
        className="p-2 text-black"
        placeholder={`e.g. always start chapters with "whadup chat, it's ya boi"`}
        value={notes}
        onChange={onNotesChange}
      />

      <button className="btn btn-primary" onClick={onSearch} disabled={running}>
        {running ? 'searching...' : 'search'}
      </button>
    </div>
  );
}