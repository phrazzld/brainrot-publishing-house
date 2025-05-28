/**
 * Translation data for Divine Comedy: Paradiso
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

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
