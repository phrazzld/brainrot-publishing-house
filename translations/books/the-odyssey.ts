/**
 * Translation data for The Odyssey
 */
import { Translation } from '../types.js';
import { USE_BLOB_STORAGE, getAssetUrl, getDirectAudioUrl } from '../utils.js';

const theOdyssey: Translation = {
  slug: 'the-odyssey',
  title: 'the odyssey',
  shortDescription:
    'odysseus ghosting cyclops & sirens, tries not to flop but finna get that home sweet home. big bde of cunning tbh.',
  coverImage: getAssetUrl('/assets/the-odyssey/images/the-odyssey-01.png', USE_BLOB_STORAGE),
  status: 'available',
  chapters: [
    {
      title: 'book 1',
      text: getAssetUrl('/assets/the-odyssey/text/book-01.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-01'),
    },
    {
      title: 'book 2',
      text: getAssetUrl('/assets/the-odyssey/text/book-02.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-02'),
    },
    {
      title: 'book 3',
      text: getAssetUrl('/assets/the-odyssey/text/book-03.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-03'),
    },
    {
      title: 'book 4',
      text: getAssetUrl('/assets/the-odyssey/text/book-04.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-04'),
    },
    {
      title: 'book 5',
      text: getAssetUrl('/assets/the-odyssey/text/book-05.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-05'),
    },
    {
      title: 'book 6',
      text: getAssetUrl('/assets/the-odyssey/text/book-06.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-06'),
    },
    {
      title: 'book 7',
      text: getAssetUrl('/assets/the-odyssey/text/book-07.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-07'),
    },
    {
      title: 'book 8',
      text: getAssetUrl('/assets/the-odyssey/text/book-08.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-08'),
    },
    {
      title: 'book 9',
      text: getAssetUrl('/assets/the-odyssey/text/book-09.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-09'),
    },
    {
      title: 'book 10',
      text: getAssetUrl('/assets/the-odyssey/text/book-10.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-10'),
    },
    {
      title: 'book 11',
      text: getAssetUrl('/assets/the-odyssey/text/book-11.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-11'),
    },
    {
      title: 'book 12',
      text: getAssetUrl('/assets/the-odyssey/text/book-12.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-12'),
    },
    {
      title: 'book 13',
      text: getAssetUrl('/assets/the-odyssey/text/book-13.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-13'),
    },
    {
      title: 'book 14',
      text: getAssetUrl('/assets/the-odyssey/text/book-14.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-14'),
    },
    {
      title: 'book 15',
      text: getAssetUrl('/assets/the-odyssey/text/book-15.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-15'),
    },
    {
      title: 'book 16',
      text: getAssetUrl('/assets/the-odyssey/text/book-16.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-16'),
    },
    {
      title: 'book 17',
      text: getAssetUrl('/assets/the-odyssey/text/book-17.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-17'),
    },
    {
      title: 'book 18',
      text: getAssetUrl('/assets/the-odyssey/text/book-18.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-18'),
    },
    {
      title: 'book 19',
      text: getAssetUrl('/assets/the-odyssey/text/book-19.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-19'),
    },
    {
      title: 'book 20',
      text: getAssetUrl('/assets/the-odyssey/text/book-20.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-20'),
    },
    {
      title: 'book 21',
      text: getAssetUrl('/assets/the-odyssey/text/book-21.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-21'),
    },
    {
      title: 'book 22',
      text: getAssetUrl('/assets/the-odyssey/text/book-22.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-22'),
    },
    {
      title: 'book 23',
      text: getAssetUrl('/assets/the-odyssey/text/book-23.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-23'),
    },
    {
      title: 'book 24',
      text: getAssetUrl('/assets/the-odyssey/text/book-24.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-odyssey', 'book-24'),
    },
  ],
};

export default theOdyssey;
