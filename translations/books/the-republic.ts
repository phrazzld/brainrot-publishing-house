/**
 * Translation data for The Republic
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const theRepublic: Translation = {
  slug: 'the-republic',
  title: 'the republic',
  shortDescription:
    'plato spittin facts about justice and the ideal state. socrates stays undefeated in debate club.',
  coverImage: getAssetUrl('/assets/covers/placeholder.jpg', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default theRepublic;
