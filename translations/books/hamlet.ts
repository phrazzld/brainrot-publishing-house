/**
 * Translation data for Hamlet
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl, getDirectAudioUrl } from '../utils.js';

const hamlet: Translation = {
  slug: 'hamlet',
  title: 'hamlet',
  shortDescription:
    "hamlet mad pressed, dad ghost drops the worst dm of all time, uncle sus af. whole kingdom in shambles cuz bro won't touch grass.",
  coverImage: getAssetUrl('/assets/hamlet/images/hamlet-07.png', USE_BLOB_STORAGE),
  status: 'available',
  chapters: [
    {
      title: 'act i',
      text: getAssetUrl('/assets/text/hamlet/brainrot-act-01.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('hamlet', 'act-i'),
    },
    {
      title: 'act ii',
      text: getAssetUrl('/assets/text/hamlet/brainrot-act-02.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'act iii',
      text: getAssetUrl('/assets/text/hamlet/brainrot-act-03.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'act iv',
      text: getAssetUrl('/assets/text/hamlet/brainrot-act-04.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'act v',
      text: getAssetUrl('/assets/text/hamlet/brainrot-act-05.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
  ],
};

export default hamlet;
