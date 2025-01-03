// translations/index.ts
// a single place to store all translations. each has chapters, so we can do chunked reading.

const translations = [
  {
    slug: 'the-iliad',
    title: 'the iliad',
    shortDescription: 'achilles and hector and helen and troy and all that',
    coverImage: '/assets/images/achilles-03.png',
    status: 'available',
    chapters: [
      {
        title: 'book 1',
        text: "/assets/iliad/text/book-01.txt",
        audioSrc: '/assets/iliad/audio/book-01.mp3'
      },
      {
        title: 'book 2',
        text: "/assets/iliad/text/book-02.txt",
        audioSrc: '/assets/iliad/audio/book-02.mp3'
      },
      {
        title: 'book 3',
        text: "/assets/iliad/text/book-03.txt",
        audioSrc: '/assets/iliad/audio/book-03.mp3'
      },
      {
        title: 'book 4',
        text: "/assets/iliad/text/book-04.txt",
        audioSrc: '/assets/iliad/audio/book-04.mp3'
      },
      {
        title: 'book 5',
        text: "/assets/iliad/text/book-05.txt",
        audioSrc: '/assets/iliad/audio/book-05.mp3'
      },
      {
        title: 'book 6',
        text: "/assets/iliad/text/book-06.txt",
        audioSrc: '/assets/iliad/audio/book-06.mp3'
      },
      {
        title: 'book 7',
        text: "/assets/iliad/text/book-07.txt",
        audioSrc: '/assets/iliad/audio/book-07.mp3'
      },
      {
        title: 'book 8',
        text: "/assets/iliad/text/book-08.txt",
        audioSrc: '/assets/iliad/audio/book-08.mp3'
      },
      {
        title: 'book 9',
        text: "/assets/iliad/text/book-09.txt",
        audioSrc: '/assets/iliad/audio/book-09.mp3'
      },
      {
        title: 'book 10',
        text: "/assets/iliad/text/book-10.txt",
        audioSrc: '/assets/iliad/audio/book-10.mp3'
      },
      {
        title: 'book 11',
        text: "/assets/iliad/text/book-11.txt",
        audioSrc: '/assets/iliad/audio/book-11.mp3'
      },
      {
        title: 'book 12',
        text: "/assets/iliad/text/book-12.txt",
        audioSrc: '/assets/iliad/audio/book-12.mp3'
      },
      {
        title: 'book 13',
        text: "/assets/iliad/text/book-13.txt",
        audioSrc: '/assets/iliad/audio/book-13.mp3'
      },
      {
        title: 'book 14',
        text: "/assets/iliad/text/book-14.txt",
        audioSrc: '/assets/iliad/audio/book-14.mp3'
      },
      {
        title: 'book 15',
        text: "/assets/iliad/text/book-15.txt",
        audioSrc: '/assets/iliad/audio/book-15.mp3'
      },
      {
        title: 'book 16',
        text: "/assets/iliad/text/book-16.txt",
        audioSrc: '/assets/iliad/audio/book-16.mp3'
      },
      {
        title: 'book 17',
        text: "/assets/iliad/text/book-17.txt",
        audioSrc: '/assets/iliad/audio/book-17.mp3'
      },
      {
        title: 'book 18',
        text: "/assets/iliad/text/book-18.txt",
        audioSrc: '/assets/iliad/audio/book-18.mp3'
      },
      {
        title: 'book 19',
        text: "/assets/iliad/text/book-19.txt",
        audioSrc: '/assets/iliad/audio/book-19.mp3'
      },
      {
        title: 'book 20',
        text: "/assets/iliad/text/book-20.txt",
        audioSrc: '/assets/iliad/audio/book-20.mp3'
      },
      {
        title: 'book 21',
        text: "/assets/iliad/text/book-21.txt",
        audioSrc: '/assets/iliad/audio/book-21.mp3'
      },
      {
        title: 'book 22',
        text: "/assets/iliad/text/book-22.txt",
        audioSrc: '/assets/iliad/audio/book-22.mp3'
      },
      {
        title: 'book 23',
        text: "/assets/iliad/text/book-23.txt",
        audioSrc: '/assets/iliad/audio/book-23.mp3'
      },
      {
        title: 'book 24',
        text: "/assets/iliad/text/book-24.txt",
        audioSrc: '/assets/iliad/audio/book-24.mp3'
      },
      // ...
    ],
  },
  {
    slug: 'the-odyssey',
    title: 'the odyssey',
    shortDescription: 'now it\'s all about odysseus bruh',
    coverImage: '/assets/images/achilles-01.png',
    status: 'coming soon',
    chapters: [
      // ...
    ],
  },
  {
    slug: 'the-aeneid',
    title: 'the aeneid',
    shortDescription: 'virgil coming in hot with this one',
    coverImage: '/assets/images/aeneid-02.png',
    status: 'coming soon',
    chapters: [
      // ...
    ],
  },
  {
    slug: 'the-divine-comedy-inferno',
    title: 'the divine comedy: the inferno',
    shortDescription: 'dante the rizzler is at it again',
    coverImage: '/assets/images/inferno-01.png',
    status: 'coming soon',
    chapters: [
      // ...
    ],
  },
]

export default translations
