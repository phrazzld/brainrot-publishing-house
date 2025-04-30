import { ReadableStreamDefaultController } from 'stream/web';
import { BookSearchResult, GutendexAuthor, GutendexSearchResultItem } from '../../../utils/types';
import { sseSend } from '../utils/sseUtils';
import { gutendexSearch } from '../services/gutendexService';

/**
 * Handles the search functionality when no bookId is provided.
 * Searches for books matching the query and returns top results.
 */
export async function handleSearchRequest(
  query: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  sseSend(controller, 'log', `starting gutendex search for: ${query}`);
  const results = await gutendexSearch(query);
  sseSend(controller, 'log', `found ${results.length} search results`);

  if (!results.length) {
    sseSend(controller, 'error', `no results found`);
    controller.close();
    return;
  }

  const topResults: BookSearchResult[] = results.slice(0, 5).map((book: GutendexSearchResultItem) => ({
    id: book.id,
    title: book.title,
    authors: (book.authors || []).map((a: GutendexAuthor) => a.name).join(', ') || 'unknown',
    downloadCount: book.download_count || 0,
  }));

  sseSend(controller, 'results', JSON.stringify(topResults));
  controller.close();
}