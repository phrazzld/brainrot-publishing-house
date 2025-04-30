import * as cheerio from 'cheerio';

const DEFAULT_CHUNK_SIZE = 20000;

/**
 * Parses HTML content into plain text, preserving heading structure and paragraphs.
 */
export function parseHtmlIntoText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style').remove();

  const textChunks: string[] = [];
  $('h1, h2, h3, p, br').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3'].includes(tag)) {
      const headingText = $(el).text().trim();
      if (headingText) {
        textChunks.push(headingText.toUpperCase(), '');
      }
    } else if (tag === 'p') {
      const pText = $(el).text().trim().replace(/\s+/g, ' ');
      if (pText) {
        textChunks.push(pText, '');
      }
    } else if (tag === 'br') {
      textChunks.push('');
    }
  });

  let combined = textChunks.join('\n');
  combined = combined.replace(/\n{3,}/g, '\n\n').trim();
  return combined;
}

/**
 * Chunks text flexibly based on double newlines, falling back to single newlines as needed.
 * Ensures chunks don't exceed the specified maximum size.
 */
export function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE): string[] {
  let paragraphs = fullText.split('\n\n');
  if (paragraphs.length < 2) {
    paragraphs = fullText.split('\n');
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const para of paragraphs) {
    const sizeWithBuffer = para.length + 2;
    if (currentSize + sizeWithBuffer > maxSize) {
      chunks.push(current.join('\n\n'));
      current = [para];
      currentSize = sizeWithBuffer;
    } else {
      current.push(para);
      currentSize += sizeWithBuffer;
    }
  }
  if (current.length) {
    chunks.push(current.join('\n\n'));
  }

  return chunks;
}