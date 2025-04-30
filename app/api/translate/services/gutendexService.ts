import {
  BookDetail,
  GutendexAuthor,
  GutendexBookDetails,
  GutendexSearchResponse,
  GutendexSearchResultItem,
} from '../../../utils/types';
import { parseHtmlIntoText } from '../utils/textUtils';

const PREFERRED_FORMATS = [
  'text/plain; charset=utf-8',
  'text/plain',
  'text/html; charset=utf-8',
  'text/html',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
];

/**
 * Searches the Gutendex API for books matching the query
 */
export async function gutendexSearch(query: string): Promise<GutendexSearchResultItem[]> {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`gutendex search failed: ${res.status}`);
  }
  
  const data: unknown = await res.json();

  // Basic validation
  if (
    typeof data !== 'object' ||
    data === null ||
    !('results' in data) ||
    !Array.isArray((data as GutendexSearchResponse).results)
  ) {
    throw new Error('Invalid search response structure from Gutendex');
  }

  return (data as GutendexSearchResponse).results;
}

/**
 * Selects the best available format from the book's formats
 */
export function pickBestFormat(formats: Record<string, string>) {
  for (const fmt of PREFERRED_FORMATS) {
    if (formats[fmt]) {
      return { chosenFormat: fmt, downloadUrl: formats[fmt] };
    }
  }
  throw new Error('no recognized format found in gutendex data');
}

/**
 * Fetches book text from Gutendex by book ID
 */
export async function fetchBookText(id: number): Promise<BookDetail> {
  const url = `https://gutendex.com/books/${id}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`gutendex metadata fetch failed: ${res.status}`);
  }
  
  const data: unknown = await res.json();

  // Type validation
  if (
    typeof data !== 'object' ||
    data === null ||
    !('formats' in data) ||
    !('title' in data) ||
    !('authors' in data)
  ) {
    throw new Error('Invalid book details structure from Gutendex');
  }

  const bookData = data as GutendexBookDetails;

  const { chosenFormat, downloadUrl } = pickBestFormat(bookData.formats);
  const title = bookData.title;
  const authors =
    (bookData.authors || []).map((a: GutendexAuthor) => a.name).join(', ') || 'unknown';

  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`failed to download text: ${downloadRes.status}`);
  }
  
  const buf = await downloadRes.arrayBuffer();
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buf);

  if (chosenFormat.includes('text/plain')) {
    return { title, authors, text: utf8Text };
  } else if (chosenFormat.includes('text/html')) {
    return { title, authors, text: parseHtmlIntoText(utf8Text) };
  }
  
  throw new Error('no plain text/html found; only epub/mobi. cannot parse.');
}