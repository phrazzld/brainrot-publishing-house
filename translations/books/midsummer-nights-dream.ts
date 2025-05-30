/**
 * Translation data for A Midsummer Night's Dream
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE } from '../utils.js';

const midsummerNightsDream: Translation = {
  slug: 'midsummer-nights-dream',
  title: "a midsummer night's dream",
  shortDescription:
    'fairy drama, love potion chaos, donkey transformation wild. shakespeare on that fantasy pack.',
  coverImage: getAssetUrl(
    '/assets/a-midsummer-nights-dream/images/midsummer-02.png',
    USE_BLOB_STORAGE,
  ),
  status: 'coming soon',
  chapters: [],
};

export default midsummerNightsDream;
