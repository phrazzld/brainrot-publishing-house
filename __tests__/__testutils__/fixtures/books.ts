/**
 * Fixtures for book-related test data
 */
const { Book, Chapter } = require('../../../translations/types');

/**
 * Creates a Chapter fixture with type-safe overrides
 */
function createChapterFixture(overrides = {}) {
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
function createBookFixture(overrides = {}) {
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
      createChapterFixture({ number: 2, title: 'Chapter 2', path: 'chapter-02.txt', audioSrc: 'chapter-02.mp3' }),
    ],
    status: 'published',
    ...overrides,
  };
}

/**
 * Builder pattern for creating complex Book objects
 */
class BookBuilder {
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
  withSlug(slug) {
    this.book.slug = slug;
    return this;
  }

  /**
   * Set the book title
   */
  withTitle(title) {
    this.book.title = title;
    return this;
  }

  /**
   * Set the book author
   */
  withAuthor(author) {
    this.book.author = author;
    return this;
  }

  /**
   * Set the book status
   */
  withStatus(status) {
    this.book.status = status;
    return this;
  }

  /**
   * Add chapters to the book
   */
  withChapters(count) {
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
  withCustomChapters(chapters) {
    this.book.chapters = chapters;
    return this;
  }

  /**
   * Build the final Book object
   */
  build() {
    return this.book;
  }
}

module.exports = {
  createChapterFixture,
  createBookFixture,
  BookBuilder,
};