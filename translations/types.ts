/**
 * Type definitions for translation data
 */

/**
 * Represents a chapter within a book
 */
export interface Chapter {
  title: string;
  text: string;
  audioSrc: string | null;
}

/**
 * Represents a complete translation of a book
 */
export interface Translation {
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  status: 'available' | 'coming soon';
  purchaseUrl?: string;
  chapters: Chapter[];
}
