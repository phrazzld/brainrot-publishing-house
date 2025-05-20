/**
 * Translation data for Pride and Prejudice
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE } from '../utils';

const prideAndPrejudice: Translation = {
  slug: 'pride-and-prejudice',
  title: 'pride and prejudice',
  shortDescription:
    'lizzy bennet vs toxic masculinity, darcy glow-up arc goes crazy. jane austen understood the assignment fr.',
  coverImage: getAssetUrl(
    '/assets/pride-and-prejudice/images/pride-and-prejudice-01.png',
    USE_BLOB_STORAGE
  ),
  status: 'coming soon',
  chapters: [],
};

export default prideAndPrejudice;
