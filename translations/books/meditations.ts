/**
 * Translation data for Meditations
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE } from '../utils.js';

const meditations: Translation = {
  slug: 'meditations',
  title: 'meditations',
  shortDescription:
    'marcus aurelius personal journal hits different. stoic emperor dropping wisdom while running rome.',
  coverImage: getAssetUrl('/assets/meditations/images/meditations-01.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default meditations;
