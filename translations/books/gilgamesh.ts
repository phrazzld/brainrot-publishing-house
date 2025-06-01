/**
 * Translation data for The Epic of Gilgamesh
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const gilgamesh: Translation = {
  slug: 'gilgamesh',
  title: 'the epic of gilgamesh',
  shortDescription:
    'ancient mesopotamian hero grinding for immortality, bromance with enkidu goes hard. OG epic poetry hits different.',
  coverImage: getAssetUrl('/assets/gilgamesh/images/gilgamesh-01.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default gilgamesh;
