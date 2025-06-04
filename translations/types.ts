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

/**
 * Book type alias for backward compatibility with tests
 * This allows tests to import { Book } from '../../../translations/types.js'
 */
export type Book = Translation;
