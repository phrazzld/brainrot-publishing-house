/**
 * Translation data for Divine Comedy: Purgatorio
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const divineComedyPurgatorio: Translation = {
  slug: 'divine-comedy-purgatorio',
  title: 'divine comedy: purgatorio',
  shortDescription:
    'dante climbs redemption mountain, souls grinding for heaven access. mid-tier afterlife hits different.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default divineComedyPurgatorio;
