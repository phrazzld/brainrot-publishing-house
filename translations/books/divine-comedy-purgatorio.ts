/**
 * Translation data for Divine Comedy: Purgatorio
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const divineComedyPurgatorio: Translation = {
  slug: 'divine-comedy-purgatorio',
  title: 'divine comedy: purgatorio',
  shortDescription:
    'dante climbs redemption mountain, souls grinding for heaven access. mid-tier afterlife hits different.',
  coverImage: getAssetUrl(
    '/assets/the-divine-comedy-purgatorio/images/purgatorio-02.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default divineComedyPurgatorio;
