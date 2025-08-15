/**
 * Translation data for The Great Gatsby
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl } from '../utils.js';

const greatGatsby: Translation = {
  slug: 'great-gatsby',
  title: 'the great gatsby',
  shortDescription:
    'no cap the wildest green light ohio rizz story, old sport gets absolutely cooked by capitalism. west egg vs east egg beef goes brazy, gatsby throwing ragers for a baddie who chose the bag.',
  coverImage: getAssetUrl('/assets/great-gatsby/images/cover.png', USE_BLOB_STORAGE),
  status: 'available',
  chapters: [
    {
      title: 'introduction',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-introduction.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 1',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-1.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 2',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-2.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 3',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-3.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 4',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-4.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 5',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-5.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 6',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-6.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 7',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-7.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 8',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-8.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
    {
      title: 'chapter 9',
      text: getAssetUrl('/assets/text/great-gatsby/brainrot-chapter-9.txt', USE_BLOB_STORAGE),
      audioSrc: null,
    },
  ],
};

export default greatGatsby;
