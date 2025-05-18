/**
 * Translation data for A Midsummer Night's Dream
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const midsummerNightsDream: Translation = {
  slug: 'midsummer-nights-dream',
  title: "a midsummer night's dream",
  shortDescription:
    'fairy drama, love potion chaos, donkey transformation wild. shakespeare on that fantasy pack.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default midsummerNightsDream;
