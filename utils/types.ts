// Common type definitions for the application

// ---- Gutendex API Types ----
export interface GutendexAuthor {
  name: string;
  birth_year?: number | null;
  death_year?: number | null;
}

export interface GutendexBookFormat {
  [mimeType: string]: string; // e.g., "text/plain; charset=utf-8": "url"
}

// Represents a book in the search results list
export interface GutendexSearchResultItem {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  media_type: string;
  formats: GutendexBookFormat;
  download_count: number;
}

// Represents the full API response for a search query
export interface GutendexSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexSearchResultItem[];
}

// Represents the detailed book metadata from /books/{id}
// Currently identical to search result item, but may have specific fields in the future
export type GutendexBookDetails = GutendexSearchResultItem;

// ---- Internal Application Types ----

// Structure sent to the client for search results display
export interface BookSearchResult {
  id: number;
  title: string;
  authors: string; // Joined author names
  downloadCount: number;
}

// Structure for detailed book info used internally or sent via SSE
export interface BookDetail {
  title: string;
  authors: string;
  text: string;
}

// ---- SSE Payload Types ----
export interface SsePayload<T = unknown> {
  type: 'log' | 'error' | 'results' | 'source' | 'chunk' | 'done' | 'retrying';
  data: T;
}

export interface SseSourcePayload {
  filename: string;
  content: string; // Original book text
}

export interface SseDonePayload {
  filename: string;
  content: string; // Full translated text
}