/**
 * Translation data for The Aeneid
 */
import { getAssetUrl } from '../utils.js';
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getDirectAudioUrl } from '../utils.js';

const theAeneid: Translation = {
  slug: 'the-aeneid',
  title: 'the aeneid',
  shortDescription:
    'trojan boi aeneas on a no cap mission to found rome, basically said "secure the bag or crash out." spoiler: he secures it, bestie.',
  coverImage: getAssetUrl('/assets/the-aeneid/images/the-aeneid-01.png', USE_BLOB_STORAGE),
  status: 'available',
  chapters: [
    {
      title: 'book 1',
      text: getAssetUrl('/assets/the-aeneid/text/book-01.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-01'),
    },
    {
      title: 'book 2',
      text: getAssetUrl('/assets/the-aeneid/text/book-02.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-02'),
    },
    {
      title: 'book 3',
      text: getAssetUrl('/assets/the-aeneid/text/book-03.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-03'),
    },
    {
      title: 'book 4',
      text: getAssetUrl('/assets/the-aeneid/text/book-04.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-04'),
    },
    {
      title: 'book 5',
      text: getAssetUrl('/assets/the-aeneid/text/book-05.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-05'),
    },
    {
      title: 'book 6',
      text: getAssetUrl('/assets/the-aeneid/text/book-06.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-06'),
    },
    {
      title: 'book 7',
      text: getAssetUrl('/assets/the-aeneid/text/book-07.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-07'),
    },
    {
      title: 'book 8',
      text: getAssetUrl('/assets/the-aeneid/text/book-08.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-08'),
    },
    {
      title: 'book 9',
      text: getAssetUrl('/assets/the-aeneid/text/book-09.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-09'),
    },
    {
      title: 'book 10',
      text: getAssetUrl('/assets/the-aeneid/text/book-10.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-10'),
    },
    {
      title: 'book 11',
      text: getAssetUrl('/assets/the-aeneid/text/book-11.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-11'),
    },
    {
      title: 'book 12',
      text: getAssetUrl('/assets/the-aeneid/text/book-12.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-aeneid', 'book-12'),
    },
  ],
};

export default theAeneid;
