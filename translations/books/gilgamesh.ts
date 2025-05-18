/**
 * Translation data for The Epic of Gilgamesh
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const gilgamesh: Translation = {
  slug: 'gilgamesh',
  title: 'the epic of gilgamesh',
  shortDescription:
    'ancient mesopotamian hero grinding for immortality, bromance with enkidu goes hard. OG epic poetry hits different.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default gilgamesh;
