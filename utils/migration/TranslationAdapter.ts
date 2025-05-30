/**
 * TranslationAdapter.ts
 *
 * This utility provides adapter functions to handle type compatibility issues
 * between the Translation/Chapter interfaces and verification scripts.
 */
import { Chapter, Translation } from '../../translations/types.js';

/**
 * An interface compatible with verification scripts that expect
 * audioSrc to be string | undefined instead of string | null
 */
export interface VerificationChapter {
  title: string;
  text: string;
  audioSrc?: string;
}

/**
 * An interface compatible with verification scripts that expect
 * audioSrc to be string | undefined instead of string | null
 */
export interface VerificationTranslation {
  slug: string;
  title: string;
  coverImage: string;
  chapters: VerificationChapter[];
  shortDescription?: string;
  status?: 'available' | 'coming soon';
  purchaseUrl?: string;
}

/**
 * Converts a Chapter with audioSrc: string | null to a VerificationChapter
 * with audioSrc: string | undefined
 */
export function adaptChapter(chapter: Chapter): VerificationChapter {
  return {
    title: chapter.title,
    text: chapter.text,
    // If audioSrc is null, omit it (resulting in undefined)
    ...(chapter.audioSrc !== null && { audioSrc: chapter.audioSrc }),
  };
}

/**
 * Converts a Translation with chapters[] to a VerificationTranslation
 * with adapted chapters
 */
export function adaptTranslation(translation: Translation): VerificationTranslation {
  return {
    slug: translation.slug,
    title: translation.title,
    coverImage: translation.coverImage,
    shortDescription: translation.shortDescription,
    status: translation.status,
    purchaseUrl: translation.purchaseUrl,
    chapters: translation.chapters.map(adaptChapter),
  };
}
