/**
 * Translation data for The Republic
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const theRepublic: Translation = {
  slug: 'the-republic',
  title: 'the republic',
  shortDescription:
    'plato spittin facts about justice and the ideal state. socrates stays undefeated in debate club.',
  coverImage: getAssetUrl('/assets/the-republic/images/republic-07.png', USE_BLOB_STORAGE),
  status: 'coming soon',
  chapters: [],
};

export default theRepublic;
