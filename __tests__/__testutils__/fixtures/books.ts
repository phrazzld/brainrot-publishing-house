/**
 * Fixtures for book-related test data
 */
import type { Book as _Book, Chapter as _Chapter } from '../../../translations/types.js';

/**
 * Creates a Chapter fixture with type-safe overrides
 */
function createChapterFixture(overrides = {}): Record<string, unknown> {
  return {
    number: 1,
    title: 'Chapter 1',
    audioSrc: 'chapter-01.mp3',
    path: 'chapter-01.txt',
    ...overrides,
  };
}

/**
 * Creates a Book fixture with type-safe overrides
 */
function createBookFixture(overrides = {}): Record<string, unknown> {
  return {
    slug: 'test-book',
    title: 'Test Book',
    author: 'Test Author',
    translator: 'Test Translator',
    year: '2025',
    coverImage: 'cover.jpg',
    description: 'A test book description',
    chapters: [
      createChapterFixture(),
      createChapterFixture({
        number: 2,
        title: 'Chapter 2',
        path: 'chapter-02.txt',
        audioSrc: 'chapter-02.mp3',
      }),
    ],
    status: 'published',
    ...overrides,
  };
}

/**
 * Builder pattern for creating complex Book objects
 */
class BookBuilder {
  private book: Record<string, unknown>;

  constructor() {
    this.book = {
      slug: 'test-book',
      title: 'Test Book',
      author: 'Test Author',
      translator: 'Test Translator',
      year: '2025',
      coverImage: 'cover.jpg',
      description: 'A test book description',
      chapters: [],
      status: 'published',
    };
  }

  /**
   * Set the book slug
   */
  withSlug(slug: string): BookBuilder {
    this.book.slug = slug;
    return this;
  }

  /**
   * Set the book title
   */
  withTitle(title: string): BookBuilder {
    this.book.title = title;
    return this;
  }

  /**
   * Set the book author
   */
  withAuthor(author: string): BookBuilder {
    this.book.author = author;
    return this;
  }

  /**
   * Set the book status
   */
  withStatus(status: string): BookBuilder {
    this.book.status = status;
    return this;
  }

  /**
   * Add chapters to the book
   */
  withChapters(count: number): BookBuilder {
    this.book.chapters = Array.from({ length: count }).map((_, i) => ({
      number: i + 1,
      title: `Chapter ${i + 1}`,
      path: `chapter-${String(i + 1).padStart(2, '0')}.txt`,
      audioSrc: `chapter-${String(i + 1).padStart(2, '0')}.mp3`,
    }));
    return this;
  }

  /**
   * Add custom chapters to the book
   */
  withCustomChapters(chapters: Array<Record<string, unknown>>): BookBuilder {
    this.book.chapters = chapters;
    return this;
  }

  /**
   * Build the final Book object
   */
  build(): Record<string, unknown> {
    return this.book;
  }
}

export { createChapterFixture, createBookFixture, BookBuilder };
