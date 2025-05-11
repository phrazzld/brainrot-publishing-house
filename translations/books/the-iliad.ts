/**
 * Translation data for The Iliad
 */
import { getAssetUrl } from '../../utils';
import { Translation } from '../types';
import { USE_BLOB_STORAGE, getDirectAudioUrl } from '../utils';

const theIliad: Translation = {
  slug: 'the-iliad',
  title: 'the iliad',
  shortDescription:
    'achilles big salty, trojan bros caught in 4k, city going bruh-level meltdown. w drama, 100% based.',
  coverImage: getAssetUrl('/assets/the-iliad/images/the-iliad-01.png', USE_BLOB_STORAGE),
  status: 'available',
  purchaseUrl: 'https://a.co/d/3Jgk26x',
  chapters: [
    {
      title: 'book 1',
      text: getAssetUrl('/assets/the-iliad/text/book-01.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-01'),
    },
    {
      title: 'book 2',
      text: getAssetUrl('/assets/the-iliad/text/book-02.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-02'),
    },
    {
      title: 'book 3',
      text: getAssetUrl('/assets/the-iliad/text/book-03.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-03'),
    },
    {
      title: 'book 4',
      text: getAssetUrl('/assets/the-iliad/text/book-04.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-04'),
    },
    {
      title: 'book 5',
      text: getAssetUrl('/assets/the-iliad/text/book-05.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-05'),
    },
    {
      title: 'book 6',
      text: getAssetUrl('/assets/the-iliad/text/book-06.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-06'),
    },
    {
      title: 'book 7',
      text: getAssetUrl('/assets/the-iliad/text/book-07.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-07'),
    },
    {
      title: 'book 8',
      text: getAssetUrl('/assets/the-iliad/text/book-08.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-08'),
    },
    {
      title: 'book 9',
      text: getAssetUrl('/assets/the-iliad/text/book-09.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-09'),
    },
    {
      title: 'book 10',
      text: getAssetUrl('/assets/the-iliad/text/book-10.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-10'),
    },
    {
      title: 'book 11',
      text: getAssetUrl('/assets/the-iliad/text/book-11.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-11'),
    },
    {
      title: 'book 12',
      text: getAssetUrl('/assets/the-iliad/text/book-12.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-12'),
    },
    {
      title: 'book 13',
      text: getAssetUrl('/assets/the-iliad/text/book-13.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-13'),
    },
    {
      title: 'book 14',
      text: getAssetUrl('/assets/the-iliad/text/book-14.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-14'),
    },
    {
      title: 'book 15',
      text: getAssetUrl('/assets/the-iliad/text/book-15.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-15'),
    },
    {
      title: 'book 16',
      text: getAssetUrl('/assets/the-iliad/text/book-16.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-16'),
    },
    {
      title: 'book 17',
      text: getAssetUrl('/assets/the-iliad/text/book-17.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-17'),
    },
    {
      title: 'book 18',
      text: getAssetUrl('/assets/the-iliad/text/book-18.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-18'),
    },
    {
      title: 'book 19',
      text: getAssetUrl('/assets/the-iliad/text/book-19.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-19'),
    },
    {
      title: 'book 20',
      text: getAssetUrl('/assets/the-iliad/text/book-20.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-20'),
    },
    {
      title: 'book 21',
      text: getAssetUrl('/assets/the-iliad/text/book-21.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-21'),
    },
    {
      title: 'book 22',
      text: getAssetUrl('/assets/the-iliad/text/book-22.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-22'),
    },
    {
      title: 'book 23',
      text: getAssetUrl('/assets/the-iliad/text/book-23.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-23'),
    },
    {
      title: 'book 24',
      text: getAssetUrl('/assets/the-iliad/text/book-24.txt', USE_BLOB_STORAGE),
      audioSrc: getDirectAudioUrl('the-iliad', 'book-24'),
    },
  ],
};

export default theIliad;
