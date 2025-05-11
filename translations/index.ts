// Import all book translations
import hamlet from './books/hamlet';
import huckleberryFinn from './books/huckleberry-finn';
import theAeneid from './books/the-aeneid';
import theIliad from './books/the-iliad';
import theOdyssey from './books/the-odyssey';

/**
 * Translations index
 *
 * This file exports all translations and utility functions for accessing them.
 */

// Export types
export * from './types';
export * from './utils';

// TODO: Import the rest of the books when they are added
// import theRepublic from './books/the-republic';
// import declarationOfIndependence from './books/declaration-of-independence';
// import prideAndPrejudice from './books/pride-and-prejudice';
// import paradiseLost from './books/paradise-lost';
// import meditations from './books/meditations';
// import divineComedyInferno from './books/divine-comedy-inferno';
// import divineComedyPurgatorio from './books/divine-comedy-purgatorio';
// import divineComedyParadiso from './books/divine-comedy-paradiso';
// import bibleOldTestament from './books/bible-old-testament';
// import bibleNewTestament from './books/bible-new-testament';
// import quran from './books/quran';
// import romeoAndJuliet from './books/romeo-and-juliet';
// import midsummerNightsDream from './books/midsummer-nights-dream';
// import gilgamesh from './books/gilgamesh';
// import bhagavadGita from './books/bhagavad-gita';

// Create and export the translations array
const translations = [
  theIliad,
  huckleberryFinn,
  theOdyssey,
  theAeneid,
  hamlet,
  // Add the rest of the books when they are imported
];

export default translations;

/**
 * Find a translation by its slug
 */
export function getTranslationBySlug(slug: string): import('./types').Translation | undefined {
  return translations.find((t) => t.slug === slug);
}
