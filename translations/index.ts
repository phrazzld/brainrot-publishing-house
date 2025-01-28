// translations/index.ts
// a single place to store all translations. each has chapters, so we can do chunked reading.

const translations = [
  {
    slug: 'the-iliad',
    title: 'the iliad',
    shortDescription: 'achilles big salty, trojan bros caught in 4k, city going bruh-level meltdown. w drama, 100% based.',
    coverImage: '/assets/images/achilles-03.png',
    status: 'available',
    purchaseUrl: 'https://www.amazon.com/Iliad-Homer-Greece-ebook/dp/B0DTFP8DY7',
    chapters: [
      {
        title: 'book 1',
        text: "/assets/the-iliad/text/book-01.txt",
        audioSrc: '/the-iliad/audio/book-01.mp3'
      },
      {
        title: 'book 2',
        text: "/assets/the-iliad/text/book-02.txt",
        audioSrc: '/the-iliad/audio/book-02.mp3'
      },
      {
        title: 'book 3',
        text: "/assets/the-iliad/text/book-03.txt",
        audioSrc: '/the-iliad/audio/book-03.mp3'
      },
      {
        title: 'book 4',
        text: "/assets/the-iliad/text/book-04.txt",
        audioSrc: '/the-iliad/audio/book-04.mp3'
      },
      {
        title: 'book 5',
        text: "/assets/the-iliad/text/book-05.txt",
        audioSrc: '/the-iliad/audio/book-05.mp3'
      },
      {
        title: 'book 6',
        text: "/assets/the-iliad/text/book-06.txt",
        audioSrc: '/the-iliad/audio/book-06.mp3'
      },
      {
        title: 'book 7',
        text: "/assets/the-iliad/text/book-07.txt",
        audioSrc: '/the-iliad/audio/book-07.mp3'
      },
      {
        title: 'book 8',
        text: "/assets/the-iliad/text/book-08.txt",
        audioSrc: '/the-iliad/audio/book-08.mp3'
      },
      {
        title: 'book 9',
        text: "/assets/the-iliad/text/book-09.txt",
        audioSrc: '/the-iliad/audio/book-09.mp3'
      },
      {
        title: 'book 10',
        text: "/assets/the-iliad/text/book-10.txt",
        audioSrc: '/the-iliad/audio/book-10.mp3'
      },
      {
        title: 'book 11',
        text: "/assets/the-iliad/text/book-11.txt",
        audioSrc: '/the-iliad/audio/book-11.mp3'
      },
      {
        title: 'book 12',
        text: "/assets/the-iliad/text/book-12.txt",
        audioSrc: '/the-iliad/audio/book-12.mp3'
      },
      {
        title: 'book 13',
        text: "/assets/the-iliad/text/book-13.txt",
        audioSrc: '/the-iliad/audio/book-13.mp3'
      },
      {
        title: 'book 14',
        text: "/assets/the-iliad/text/book-14.txt",
        audioSrc: '/the-iliad/audio/book-14.mp3'
      },
      {
        title: 'book 15',
        text: "/assets/the-iliad/text/book-15.txt",
        audioSrc: '/the-iliad/audio/book-15.mp3'
      },
      {
        title: 'book 16',
        text: "/assets/the-iliad/text/book-16.txt",
        audioSrc: '/the-iliad/audio/book-16.mp3'
      },
      {
        title: 'book 17',
        text: "/assets/the-iliad/text/book-17.txt",
        audioSrc: '/the-iliad/audio/book-17.mp3'
      },
      {
        title: 'book 18',
        text: "/assets/the-iliad/text/book-18.txt",
        audioSrc: '/the-iliad/audio/book-18.mp3'
      },
      {
        title: 'book 19',
        text: "/assets/the-iliad/text/book-19.txt",
        audioSrc: '/the-iliad/audio/book-19.mp3'
      },
      {
        title: 'book 20',
        text: "/assets/the-iliad/text/book-20.txt",
        audioSrc: '/the-iliad/audio/book-20.mp3'
      },
      {
        title: 'book 21',
        text: "/assets/the-iliad/text/book-21.txt",
        audioSrc: '/the-iliad/audio/book-21.mp3'
      },
      {
        title: 'book 22',
        text: "/assets/the-iliad/text/book-22.txt",
        audioSrc: '/the-iliad/audio/book-22.mp3'
      },
      {
        title: 'book 23',
        text: "/assets/the-iliad/text/book-23.txt",
        audioSrc: '/the-iliad/audio/book-23.mp3'
      },
      {
        title: 'book 24',
        text: "/assets/the-iliad/text/book-24.txt",
        audioSrc: '/the-iliad/audio/book-24.mp3'
      },
    ],
  },
  {
    slug: 'the-odyssey',
    title: 'the odyssey',
    shortDescription: 'odysseus ghosting cyclops & sirens, tries not to flop but finna get that home sweet home. big bde of cunning tbh.',
    coverImage: '/assets/images/achilles-01.png',
    status: 'available',
    chapters: [
      {
        title: 'book 1',
        text: "/assets/the-odyssey/text/book-01.txt",
        audioSrc: '/the-odyssey/audio/book-01.mp3'
      },
      {
        title: 'book 2',
        text: "/assets/the-odyssey/text/book-02.txt",
        audioSrc: '/the-odyssey/audio/book-02.mp3'
      },
      {
        title: 'book 3',
        text: "/assets/the-odyssey/text/book-03.txt",
        audioSrc: '/the-odyssey/audio/book-03.mp3'
      },
      {
        title: 'book 4',
        text: "/assets/the-odyssey/text/book-04.txt",
        audioSrc: '/the-odyssey/audio/book-04.mp3'
      },
      {
        title: 'book 5',
        text: "/assets/the-odyssey/text/book-05.txt",
        audioSrc: '/the-odyssey/audio/book-05.mp3'
      },
      {
        title: 'book 6',
        text: "/assets/the-odyssey/text/book-06.txt",
        audioSrc: '/the-odyssey/audio/book-06.mp3'
      },
      {
        title: 'book 7',
        text: "/assets/the-odyssey/text/book-07.txt",
        audioSrc: '/the-odyssey/audio/book-07.mp3'
      },
      {
        title: 'book 8',
        text: "/assets/the-odyssey/text/book-08.txt",
        audioSrc: '/the-odyssey/audio/book-08.mp3'
      },
      {
        title: 'book 9',
        text: "/assets/the-odyssey/text/book-09.txt",
        audioSrc: '/the-odyssey/audio/book-09.mp3'
      },
      {
        title: 'book 10',
        text: "/assets/the-odyssey/text/book-10.txt",
        audioSrc: '/the-odyssey/audio/book-10.mp3'
      },
      {
        title: 'book 11',
        text: "/assets/the-odyssey/text/book-11.txt",
        audioSrc: '/the-odyssey/audio/book-11.mp3'
      },
      {
        title: 'book 12',
        text: "/assets/the-odyssey/text/book-12.txt",
        audioSrc: '/the-odyssey/audio/book-12.mp3'
      },
      {
        title: 'book 13',
        text: "/assets/the-odyssey/text/book-13.txt",
        audioSrc: '/the-odyssey/audio/book-13.mp3'
      },
      {
        title: 'book 14',
        text: "/assets/the-odyssey/text/book-14.txt",
        audioSrc: '/the-odyssey/audio/book-14.mp3'
      },
      {
        title: 'book 15',
        text: "/assets/the-odyssey/text/book-15.txt",
        audioSrc: '/the-odyssey/audio/book-15.mp3'
      },
      {
        title: 'book 16',
        text: "/assets/the-odyssey/text/book-16.txt",
        audioSrc: '/the-odyssey/audio/book-16.mp3'
      },
      {
        title: 'book 17',
        text: "/assets/the-odyssey/text/book-17.txt",
        audioSrc: '/the-odyssey/audio/book-17.mp3'
      },
      {
        title: 'book 18',
        text: "/assets/the-odyssey/text/book-18.txt",
        audioSrc: '/the-odyssey/audio/book-18.mp3'
      },
      {
        title: 'book 19',
        text: "/assets/the-odyssey/text/book-19.txt",
        audioSrc: '/the-odyssey/audio/book-19.mp3'
      },
      {
        title: 'book 20',
        text: "/assets/the-odyssey/text/book-20.txt",
        audioSrc: '/the-odyssey/audio/book-20.mp3'
      },
      {
        title: 'book 21',
        text: "/assets/the-odyssey/text/book-21.txt",
        audioSrc: '/the-odyssey/audio/book-21.mp3'
      },
      {
        title: 'book 22',
        text: "/assets/the-odyssey/text/book-22.txt",
        audioSrc: '/the-odyssey/audio/book-22.mp3'
      },
      {
        title: 'book 23',
        text: "/assets/the-odyssey/text/book-23.txt",
        audioSrc: '/the-odyssey/audio/book-23.mp3'
      },
      {
        title: 'book 24',
        text: "/assets/the-odyssey/text/book-24.txt",
        audioSrc: '/the-odyssey/audio/book-24.mp3'
      },
    ],
  },
  {
    slug: 'the-aeneid',
    title: 'the aeneid',
    shortDescription: 'trojan boi aeneas on a no cap mission to found rome, basically said “secure the bag or crash out.” spoiler: he secures it, bestie.',
    coverImage: '/assets/images/aeneid-02.png',
    status: 'available',
    chapters: [
      {
        title: 'book 1',
        text: "/assets/the-aeneid/text/book-01.txt",
        audioSrc: '/the-aeneid/audio/book-01.mp3'
      },
      {
        title: 'book 2',
        text: "/assets/the-aeneid/text/book-02.txt",
        audioSrc: '/the-aeneid/audio/book-02.mp3'
      },
      {
        title: 'book 3',
        text: "/assets/the-aeneid/text/book-03.txt",
        audioSrc: '/the-aeneid/audio/book-03.mp3'
      },
      {
        title: 'book 4',
        text: "/assets/the-aeneid/text/book-04.txt",
        audioSrc: '/the-aeneid/audio/book-04.mp3'
      },
      {
        title: 'book 5',
        text: "/assets/the-aeneid/text/book-05.txt",
        audioSrc: '/the-aeneid/audio/book-05.mp3'
      },
      {
        title: 'book 6',
        text: "/assets/the-aeneid/text/book-06.txt",
        audioSrc: '/the-aeneid/audio/book-06.mp3'
      },
      {
        title: 'book 7',
        text: "/assets/the-aeneid/text/book-07.txt",
        audioSrc: '/the-aeneid/audio/book-07.mp3'
      },
      {
        title: 'book 8',
        text: "/assets/the-aeneid/text/book-08.txt",
        audioSrc: '/the-aeneid/audio/book-08.mp3'
      },
      {
        title: 'book 9',
        text: "/assets/the-aeneid/text/book-09.txt",
        audioSrc: '/the-aeneid/audio/book-09.mp3'
      },
      {
        title: 'book 10',
        text: "/assets/the-aeneid/text/book-10.txt",
        audioSrc: '/the-aeneid/audio/book-10.mp3'
      },
      {
        title: 'book 11',
        text: "/assets/the-aeneid/text/book-11.txt",
        audioSrc: '/the-aeneid/audio/book-11.mp3'
      },
      {
        title: 'book 12',
        text: "/assets/the-aeneid/text/book-12.txt",
        audioSrc: '/the-aeneid/audio/book-12.mp3'
      },
    ],
  },
  {
    slug: 'the-declaration-of-independence',
    title: 'the declaration of independence',
    shortDescription: 'king george acting real sus, colonies hit him with the "it\'s not me, it\'s you" vibes. hard-launches freedom era, no cap.',
    coverImage: '/assets/images/america-02.png',
    status: 'available',
    chapters: [
      {
        title: 'the declaration of independence',
        text: "/assets/the-declaration-of-independence/text/the-declaration-of-independence.txt",
        audioSrc: null
      },
    ],
  },
  {
    slug: 'the-divine-comedy-inferno',
    title: 'the divine comedy: the inferno',
    shortDescription: 'dante finna see hell like it’s giving meltdown vibes. devils be sus asf.',
    coverImage: '/assets/images/inferno-01.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-divine-comedy-purgatorio',
    title: 'the divine comedy: the purgatorio',
    shortDescription: 'man’s took a vibe check, climbing that mountain with the homies to get cleansed. era SHIFT.',
    coverImage: '/assets/images/purgatorio-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-divine-comedy-paradiso',
    title: 'the divine comedy: the paradiso',
    shortDescription: 'big glow-up in heaven, man’s ratio unstoppable, angels all like “sheesh.”',
    coverImage: '/assets/images/paradiso-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-bible-old-testament',
    title: 'the bible: old testament',
    shortDescription: 'it’s giving creation myths, floods, epic L’s & W’s, everyone’s on that vibe check from abraham to moses. savage.',
    coverImage: '/assets/images/old-testament-03.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-bible-new-testament',
    title: 'the bible: new testament',
    shortDescription: 'jesus is the main character, raising the dead, turning water to wine, big rizz energy. the apostles be living rent-free in everyone’s mind.',
    coverImage: '/assets/images/new-testament-01.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-republic',
    title: 'the republic',
    shortDescription: 'plato be like “ideal society or skill issue?” entire blueprint for big-brain vibes. no cap.',
    coverImage: '/assets/images/republic-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'the-quran',
    title: 'the quran',
    shortDescription: 'revelation meltdown, the prophet mohammed spitting bars from the top—milk & honey drip, soul-level era. absolutely no flop.',
    coverImage: '/assets/images/quran-01.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'romeo-and-juliet',
    title: 'romeo and juliet',
    shortDescription: 'star-crossed bffr, love doping them up, they crash out frfr. big yikes vibes.',
    coverImage: '/assets/images/romeo-and-juliet-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'hamlet',
    title: 'hamlet',
    shortDescription: '“to be or not to be,” man’s so mid or maybe next-level? ghost dad on the daily, meltdown central. slay or nay?',
    coverImage: '/assets/images/hamlet-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'a-midsummer-nights-dream',
    title: 'a midsummer night’s dream',
    shortDescription: 'fairy squad messing up couples, donkey transformation, oh so chaotic. it’s literally a bruh moment in the forest.',
    coverImage: '/assets/images/midsummer-02.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'gilgamesh',
    title: 'gilgamesh',
    shortDescription: 'og epic, demigod king’s bff dies, so he tries to unalive immortality. ultimate big sad, but he glows up in the end.',
    coverImage: '/assets/images/gilgamesh-01.png',
    status: 'coming soon',
    chapters: [
    ],
  },
  {
    slug: 'bhagavad-gita',
    title: 'bhagavad gita',
    shortDescription: 'krishna spitting that moral code, telling arjuna to stop capping & fight. talk about rizz for your soul, bestie.',
    coverImage: '/assets/images/gita-01.png',
    status: 'coming soon',
    chapters: [
    ],
  },
]

export default translations
