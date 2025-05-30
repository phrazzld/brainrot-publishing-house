/**
 * Translation data for Divine Comedy: Inferno
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE } from '../utils.js';

const divineComedyInferno: Translation = {
  slug: 'divine-comedy-inferno',
  title: 'divine comedy: inferno',
  shortDescription:
    'dante speedruns hell tiers, virgil best tour guide. medieval doom eternal vibes go crazy.',
  coverImage: getAssetUrl(
    '/assets/the-divine-comedy-inferno/images/inferno-01.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default divineComedyInferno;
