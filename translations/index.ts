// translations/index.ts
// a single place to store all translations. each has chapters, so we can do chunked reading.

import { getAssetUrl } from '../utils';

// Enable/disable Blob storage globally for testing
const USE_BLOB_STORAGE = true;

// Helper function to generate audio URLs directly to avoid double URL issue
const getDirectAudioUrl = (bookSlug: string, filename: string): string => {
  // Use the tenant-specific base URL that's working in verification
  const baseUrl = 'https://82qos1wlxbd4iq1g.public.blob.vercel-storage.com';
  return `${baseUrl}/${bookSlug}/audio/${filename}.mp3`;
};

// Define the types for translation data
export interface Chapter {
  title: string;
  text: string;
  audioSrc: string | null;
}

export interface Translation {
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  status: 'available' | 'coming soon';
  purchaseUrl?: string;
  chapters: Chapter[];
}

const translations: Translation[] = [
  {
    slug: 'the-iliad',
    title: 'the iliad',
    shortDescription: "achilles big salty, trojan bros caught in 4k, city going bruh-level meltdown. w drama, 100% based.",
    coverImage: getAssetUrl('/assets/the-iliad/images/the-iliad-01.png', USE_BLOB_STORAGE),
    status: 'available',
    purchaseUrl: 'https://a.co/d/3Jgk26x',
    chapters: [
      {
        title: 'book 1',
        text: getAssetUrl("/assets/the-iliad/text/book-01.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-01')
      },
      {
        title: 'book 2',
        text: getAssetUrl("/assets/the-iliad/text/book-02.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-02')
      },
      {
        title: 'book 3',
        text: getAssetUrl("/assets/the-iliad/text/book-03.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-03')
      },
      {
        title: 'book 4',
        text: getAssetUrl("/assets/the-iliad/text/book-04.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-04')
      },
      {
        title: 'book 5',
        text: getAssetUrl("/assets/the-iliad/text/book-05.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-05')
      },
      {
        title: 'book 6',
        text: getAssetUrl("/assets/the-iliad/text/book-06.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-06')
      },
      {
        title: 'book 7',
        text: getAssetUrl("/assets/the-iliad/text/book-07.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-07')
      },
      {
        title: 'book 8',
        text: getAssetUrl("/assets/the-iliad/text/book-08.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-08')
      },
      {
        title: 'book 9',
        text: getAssetUrl("/assets/the-iliad/text/book-09.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-09')
      },
      {
        title: 'book 10',
        text: getAssetUrl("/assets/the-iliad/text/book-10.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-10')
      },
      {
        title: 'book 11',
        text: getAssetUrl("/assets/the-iliad/text/book-11.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-11')
      },
      {
        title: 'book 12',
        text: getAssetUrl("/assets/the-iliad/text/book-12.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-12')
      },
      {
        title: 'book 13',
        text: getAssetUrl("/assets/the-iliad/text/book-13.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-13')
      },
      {
        title: 'book 14',
        text: getAssetUrl("/assets/the-iliad/text/book-14.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-14')
      },
      {
        title: 'book 15',
        text: getAssetUrl("/assets/the-iliad/text/book-15.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-iliad', 'book-15')
      },
      {
        title: 'book 16',
        text: getAssetUrl("/assets/the-iliad/text/book-16.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-16.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 17',
        text: getAssetUrl("/assets/the-iliad/text/book-17.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-17.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 18',
        text: getAssetUrl("/assets/the-iliad/text/book-18.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-18.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 19',
        text: getAssetUrl("/assets/the-iliad/text/book-19.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-19.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 20',
        text: getAssetUrl("/assets/the-iliad/text/book-20.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-20.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 21',
        text: getAssetUrl("/assets/the-iliad/text/book-21.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-21.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 22',
        text: getAssetUrl("/assets/the-iliad/text/book-22.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-22.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 23',
        text: getAssetUrl("/assets/the-iliad/text/book-23.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-23.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 24',
        text: getAssetUrl("/assets/the-iliad/text/book-24.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-iliad/audio/book-24.mp3', USE_BLOB_STORAGE)
      },
    ],
  },
  {
    slug: 'the-adventures-of-huckleberry-finn',
    title: 'the adventures of huckleberry finn',
    shortDescription: "huck yeets from civil society, links with jim, raft life hits diff. dodging l's, chasing w's, river got that main character energy.",
    coverImage: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/images/huck-finn-09.png', USE_BLOB_STORAGE),
    status: 'available',
    purchaseUrl: 'https://a.co/d/4hjXftX',
    chapters: [
      {
        title: 'chapter i',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-i.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter ii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-ii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter iii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-iii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter iv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-iv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter v',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-v.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter vi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-vi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter vii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-vii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter viii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-viii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter ix',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-ix.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter x',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-x.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xiii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xiii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xiv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xiv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xvi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xvi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xvii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xvii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xviii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xviii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xix',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xix.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xx',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xx.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxiii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxiii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxiv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxiv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxvi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxvi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxvii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxvii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxviii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxviii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxix',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxix.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxx',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxx.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxiii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxiii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxiv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxiv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxv',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxvi',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxvi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxvii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxvii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxviii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxviii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xxxix',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xxxix.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xl',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xl.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xli',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xli.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter xlii',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-xlii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'chapter the last',
        text: getAssetUrl('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-the-last.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
    ]
  },
  {
    slug: 'the-odyssey',
    title: 'the odyssey',
    shortDescription: "odysseus ghosting cyclops & sirens, tries not to flop but finna get that home sweet home. big bde of cunning tbh.",
    coverImage: getAssetUrl('/assets/the-odyssey/images/the-odyssey-01.png', USE_BLOB_STORAGE),
    status: 'available',
    chapters: [
      {
        title: 'book 1',
        text: getAssetUrl("/assets/the-odyssey/text/book-01.txt", USE_BLOB_STORAGE),
        audioSrc: getDirectAudioUrl('the-odyssey', 'book-01')
      },
      {
        title: 'book 2',
        text: getAssetUrl("/assets/the-odyssey/text/book-02.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-02.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 3',
        text: getAssetUrl("/assets/the-odyssey/text/book-03.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-03.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 4',
        text: getAssetUrl("/assets/the-odyssey/text/book-04.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-04.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 5',
        text: getAssetUrl("/assets/the-odyssey/text/book-05.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-05.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 6',
        text: getAssetUrl("/assets/the-odyssey/text/book-06.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-06.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 7',
        text: getAssetUrl("/assets/the-odyssey/text/book-07.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-07.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 8',
        text: getAssetUrl("/assets/the-odyssey/text/book-08.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-08.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 9',
        text: getAssetUrl("/assets/the-odyssey/text/book-09.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-09.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 10',
        text: getAssetUrl("/assets/the-odyssey/text/book-10.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-10.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 11',
        text: getAssetUrl("/assets/the-odyssey/text/book-11.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-11.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 12',
        text: getAssetUrl("/assets/the-odyssey/text/book-12.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-12.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 13',
        text: getAssetUrl("/assets/the-odyssey/text/book-13.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-13.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 14',
        text: getAssetUrl("/assets/the-odyssey/text/book-14.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-14.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 15',
        text: getAssetUrl("/assets/the-odyssey/text/book-15.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-15.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 16',
        text: getAssetUrl("/assets/the-odyssey/text/book-16.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-16.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 17',
        text: getAssetUrl("/assets/the-odyssey/text/book-17.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-17.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 18',
        text: getAssetUrl("/assets/the-odyssey/text/book-18.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-18.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 19',
        text: getAssetUrl("/assets/the-odyssey/text/book-19.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-19.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 20',
        text: getAssetUrl("/assets/the-odyssey/text/book-20.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-20.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 21',
        text: getAssetUrl("/assets/the-odyssey/text/book-21.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-21.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 22',
        text: getAssetUrl("/assets/the-odyssey/text/book-22.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-22.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 23',
        text: getAssetUrl("/assets/the-odyssey/text/book-23.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-23.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 24',
        text: getAssetUrl("/assets/the-odyssey/text/book-24.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-odyssey/audio/book-24.mp3', USE_BLOB_STORAGE)
      },
    ],
  },
  {
    slug: 'the-aeneid',
    title: 'the aeneid',
    shortDescription: "trojan boi aeneas on a no cap mission to found rome, basically said \"secure the bag or crash out.\" spoiler: he secures it, bestie.",
    coverImage: getAssetUrl('/assets/the-aeneid/images/the-aeneid-01.png', USE_BLOB_STORAGE),
    status: 'available',
    chapters: [
      {
        title: 'book 1',
        text: getAssetUrl("/assets/the-aeneid/text/book-01.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-01.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 2',
        text: getAssetUrl("/assets/the-aeneid/text/book-02.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-02.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 3',
        text: getAssetUrl("/assets/the-aeneid/text/book-03.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-03.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 4',
        text: getAssetUrl("/assets/the-aeneid/text/book-04.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-04.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 5',
        text: getAssetUrl("/assets/the-aeneid/text/book-05.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-05.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 6',
        text: getAssetUrl("/assets/the-aeneid/text/book-06.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-06.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 7',
        text: getAssetUrl("/assets/the-aeneid/text/book-07.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-07.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 8',
        text: getAssetUrl("/assets/the-aeneid/text/book-08.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-08.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 9',
        text: getAssetUrl("/assets/the-aeneid/text/book-09.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-09.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 10',
        text: getAssetUrl("/assets/the-aeneid/text/book-10.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-10.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 11',
        text: getAssetUrl("/assets/the-aeneid/text/book-11.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-11.mp3', USE_BLOB_STORAGE)
      },
      {
        title: 'book 12',
        text: getAssetUrl("/assets/the-aeneid/text/book-12.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-aeneid/audio/book-12.mp3', USE_BLOB_STORAGE)
      },
    ],
  },
  {
    slug: 'hamlet',
    title: 'hamlet',
    shortDescription: 'hamlet mad pressed, dad ghost drops the worst dm of all time, uncle sus af. whole kingdom in shambles cuz bro won\'t touch grass.',
    coverImage: getAssetUrl('/assets/hamlet/images/hamlet-07.png', USE_BLOB_STORAGE),
    status: 'available',
    chapters: [
      {
        title: 'act i',
        text: getAssetUrl('/assets/hamlet/text/brainrot/act-i.txt', USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/hamlet/audio/act-i.mp3', USE_BLOB_STORAGE),
      },
      {
        title: 'act ii',
        text: getAssetUrl('/assets/hamlet/text/brainrot/act-ii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'act iii',
        text: getAssetUrl('/assets/hamlet/text/brainrot/act-iii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'act iv',
        text: getAssetUrl('/assets/hamlet/text/brainrot/act-iv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'act v',
        text: getAssetUrl('/assets/hamlet/text/brainrot/act-v.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
    ],
  },
  {
    slug: 'the-republic',
    title: 'the republic',
    shortDescription: "socrates pulls up, asks \"what if we made a city that slaps?\"—ends up min-maxing justice, dunking on poets, and inventing the philosopher-king meta.",
    coverImage: getAssetUrl('/assets/the-republic/images/republic-07.png', USE_BLOB_STORAGE),
    status: 'available',
    chapters: [
      {
        title: 'book i',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-i.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book ii',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-ii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book iii',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-iii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book iv',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-iv.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book v',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-v.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book vi',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-vi.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book vii',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-vii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book viii',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-viii.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book ix',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-ix.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
      {
        title: 'book x',
        text: getAssetUrl('/assets/the-republic/text/brainrot/book-x.txt', USE_BLOB_STORAGE),
        audioSrc: null
      },
    ],
  },
  {
    slug: 'the-declaration-of-independence',
    title: 'the declaration of independence',
    shortDescription: 'king george acting real sus, colonies hit him with the "it\'s not me, it\'s you" vibes. hard-launches freedom era, no cap.',
    coverImage: getAssetUrl('/assets/the-declaration-of-independence/images/america-02.png', USE_BLOB_STORAGE),
    status: 'available',
    chapters: [
      {
        title: 'the declaration of independence',
        text: getAssetUrl("/assets/the-declaration-of-independence/text/the-declaration-of-independence.txt", USE_BLOB_STORAGE),
        audioSrc: getAssetUrl('/the-declaration-of-independence/audio/the-declaration-of-independence.mp3', USE_BLOB_STORAGE)
      },
    ],
  },
  {
    slug: 'pride-and-prejudice',
    title: 'pride and prejudice',
    shortDescription: 'mom says "marry rich," dad says "marry smart," lizzy says "I\'m built different." cue romantic turbulence.',
    coverImage: getAssetUrl('/assets/pride-and-prejudice/images/pride-and-prejudice-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'paradise-lost',
    title: 'paradise lost',
    shortDescription: "god builds a perfect utopia, satan says \"not on my watch,\" humans fumble the bag instantly. paradise lost, drama found.",
    coverImage: getAssetUrl('/assets/paradise-lost/images/paradise-lost-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'meditations',
    title: 'meditations',
    shortDescription: "life be lifin', but marcus just vibes. control what you can, ignore the clowns, stay based.",
    coverImage: getAssetUrl('/assets/meditations/images/meditations-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-divine-comedy-inferno',
    title: 'the divine comedy: the inferno',
    shortDescription: "dante finna see hell like it's giving meltdown vibes. devils be sus asf.",
    coverImage: getAssetUrl('/assets/images/inferno-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-divine-comedy-purgatorio',
    title: 'the divine comedy: the purgatorio',
    shortDescription: "man's took a vibe check, climbing that mountain with the homies to get cleansed. era SHIFT.",
    coverImage: getAssetUrl('/assets/images/purgatorio-02.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-divine-comedy-paradiso',
    title: 'the divine comedy: the paradiso',
    shortDescription: "big glow-up in heaven, man's ratio unstoppable, angels all like \"sheesh.\"",
    coverImage: getAssetUrl('/assets/images/paradiso-02.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-bible-old-testament',
    title: 'the bible: old testament',
    shortDescription: "it's giving creation myths, floods, epic L's & W's, everyone's on that vibe check from abraham to moses. savage.",
    coverImage: getAssetUrl('/assets/images/old-testament-03.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-bible-new-testament',
    title: 'the bible: new testament',
    shortDescription: "jesus is the main character, raising the dead, turning water to wine, big rizz energy. the apostles be living rent-free in everyone's mind.",
    coverImage: getAssetUrl('/assets/images/new-testament-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-quran',
    title: 'the quran',
    shortDescription: "revelation meltdown, the prophet mohammed spitting bars from the top—milk & honey drip, soul-level era. absolutely no flop.",
    coverImage: getAssetUrl('/assets/images/quran-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'romeo-and-juliet',
    title: 'romeo and juliet',
    shortDescription: "star-crossed bffr, love doping them up, they crash out frfr. big yikes vibes.",
    coverImage: getAssetUrl('/assets/images/romeo-and-juliet-02.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'a-midsummer-nights-dream',
    title: "a midsummer night's dream",
    shortDescription: "fairy squad messing up couples, donkey transformation, oh so chaotic. it's literally a bruh moment in the forest.",
    coverImage: getAssetUrl('/assets/images/midsummer-02.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'gilgamesh',
    title: 'gilgamesh',
    shortDescription: "og epic, demigod king's bff dies, so he tries to unalive immortality. ultimate big sad, but he glows up in the end.",
    coverImage: getAssetUrl('/assets/images/gilgamesh-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'bhagavad-gita',
    title: 'bhagavad gita',
    shortDescription: "krishna spitting that moral code, telling arjuna to stop capping & fight. talk about rizz for your soul, bestie.",
    coverImage: getAssetUrl('/assets/images/gita-01.png', USE_BLOB_STORAGE),
    status: 'coming soon',
    chapters: [
    ],
  },
]

export default translations