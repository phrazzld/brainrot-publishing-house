/**
 * Translation data for The Declaration of Independence
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE, getDirectAudioUrl } from '../utils';

const declarationOfIndependence: Translation = {
  slug: 'declaration-of-independence',
  title: 'the declaration of independence',
  shortDescription:
    'colonies went no cap on king george, dropped the hardest breakup letter in history. life, liberty, and vibes only.',
  coverImage: getAssetUrl(
    '/assets/declaration-of-independence/images/the-declaration-01.png',
    USE_BLOB_STORAGE,
  ),
  status: 'available',
  chapters: [
    {
      title: 'the declaration',
      text: getAssetUrl(
        '/assets/text/declaration-of-independence/brainrot-declaration.txt',
        USE_BLOB_STORAGE,
      ),
      audioSrc: getDirectAudioUrl('declaration-of-independence', 'full-audiobook'),
    },
  ],
};

export default declarationOfIndependence;
