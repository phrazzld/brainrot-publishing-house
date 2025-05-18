// Import all book translations
import bhagavadGita from './books/bhagavad-gita';
import bibleNewTestament from './books/bible-new-testament';
import bibleOldTestament from './books/bible-old-testament';
// Available books
import declarationOfIndependence from './books/declaration-of-independence';
import divineComedyInferno from './books/divine-comedy-inferno';
import divineComedyParadiso from './books/divine-comedy-paradiso';
import divineComedyPurgatorio from './books/divine-comedy-purgatorio';
import gilgamesh from './books/gilgamesh';
import hamlet from './books/hamlet';
import huckleberryFinn from './books/huckleberry-finn';
import meditations from './books/meditations';
import midsummerNightsDream from './books/midsummer-nights-dream';
import paradiseLost from './books/paradise-lost';
import prideAndPrejudice from './books/pride-and-prejudice';
import quran from './books/quran';
import romeoAndJuliet from './books/romeo-and-juliet';
import theAeneid from './books/the-aeneid';
import theIliad from './books/the-iliad';
import theOdyssey from './books/the-odyssey';
// Coming soon books
import theRepublic from './books/the-republic';

/**
 * Translations index
 *
 * This file exports all translations and utility functions for accessing them.
 */

// Export types
export * from './types';
export * from './utils';

// Create and export the translations array
const translations = [
  // Available books
  theIliad,
  huckleberryFinn,
  theOdyssey,
  theAeneid,
  hamlet,
  declarationOfIndependence,

  // Coming soon books
  theRepublic,
  prideAndPrejudice,
  paradiseLost,
  meditations,
  divineComedyInferno,
  divineComedyPurgatorio,
  divineComedyParadiso,
  bibleOldTestament,
  bibleNewTestament,
  quran,
  romeoAndJuliet,
  midsummerNightsDream,
  gilgamesh,
  bhagavadGita,
];

export default translations;

/**
 * Find a translation by its slug
 */
export function getTranslationBySlug(slug: string): import('./types').Translation | undefined {
  return translations.find((t) => t.slug === slug);
}
