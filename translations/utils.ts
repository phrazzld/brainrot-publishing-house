/**
 * Utility functions for working with translations
 */
import { getAssetUrl as importedGetAssetUrl } from '../utils/getBlobUrl.js';
import { Translation } from './types.js';

/**
 * Enable/disable Blob storage globally for testing
 */
export const USE_BLOB_STORAGE = true;

/**
 * Expose getAssetUrl for translations
 */
export const getAssetUrl = importedGetAssetUrl;

/**
 * Helper function to generate audio URLs directly to avoid double URL issue
 */
export const getDirectAudioUrl = (bookSlug: string, filename: string): string => {
  // Use the tenant-specific base URL that's working in verification
  const baseUrl = 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';
  return `${baseUrl}/${bookSlug}/audio/${filename}.mp3`;
};

/**
 * Find a translation by its slug
 */
export function getTranslationBySlug(
  translations: Translation[],
  slug: string,
): Translation | undefined {
  return translations.find((t) => t.slug === slug);
}
