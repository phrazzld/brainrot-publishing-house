// Mock translations data for testing
const mockTranslations = [
  {
    slug: 'test-available',
    title: 'Test Available Book',
    shortDescription: 'An available book for testing',
    coverImage: '/test/available.jpg',
    status: 'available',
    chapters: [],
  },
  {
    slug: 'test-coming-soon',
    title: 'Test Coming Soon Book',
    shortDescription: 'A coming soon book for testing',
    coverImage: '/test/coming-soon.jpg',
    status: 'coming soon',
    chapters: [],
  },
  {
    slug: 'test-with-purchase',
    title: 'Test Book with Purchase',
    shortDescription: 'An available book with purchase link',
    coverImage: '/test/purchase.jpg',
    status: 'available',
    purchaseUrl: 'https://example.com/buy',
    chapters: [],
  },
];

export default mockTranslations;
