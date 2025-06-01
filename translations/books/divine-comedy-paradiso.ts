/**
 * Translation data for Divine Comedy: Paradiso
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const divineComedyParadiso: Translation = {
  slug: 'divine-comedy-paradiso',
  title: 'divine comedy: paradiso',
  shortDescription:
    'dante achieves peak enlightenment, heaven tour maximum vibes. beatrice best girl confirmed.',
  coverImage: getAssetUrl(
    '/assets/the-divine-comedy-paradiso/images/paradiso-02.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default divineComedyParadiso;
