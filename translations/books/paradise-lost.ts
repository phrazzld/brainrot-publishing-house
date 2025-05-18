/**
 * Translation data for Paradise Lost
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const paradiseLost: Translation = {
  slug: 'paradise-lost',
  title: 'paradise lost',
  shortDescription:
    'satan main character energy, heaven vs hell beef eternal. milton went sicko mode on biblical fanfic.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default paradiseLost;
