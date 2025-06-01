/**
 * Translation data for Paradise Lost
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const paradiseLost: Translation = {
  slug: 'paradise-lost',
  title: 'paradise lost',
  shortDescription:
    'satan main character energy, heaven vs hell beef eternal. milton went sicko mode on biblical fanfic.',
  coverImage: getAssetUrl('/assets/paradise-lost/images/paradise-lost-01.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default paradiseLost;
