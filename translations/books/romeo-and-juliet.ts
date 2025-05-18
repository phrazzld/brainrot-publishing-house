/**
 * Translation data for Romeo and Juliet
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const romeoAndJuliet: Translation = {
  slug: 'romeo-and-juliet',
  title: 'romeo and juliet',
  shortDescription:
    'teen love speedrun any%, family beef ruins everything. shakespeare understood toxic relationships fr.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default romeoAndJuliet;
