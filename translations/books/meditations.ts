/**
 * Translation data for Meditations
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const meditations: Translation = {
  slug: 'meditations',
  title: 'meditations',
  shortDescription:
    'marcus aurelius personal journal hits different. stoic emperor dropping wisdom while running rome.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default meditations;
