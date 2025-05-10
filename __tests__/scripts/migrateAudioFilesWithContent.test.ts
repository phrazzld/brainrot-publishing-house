// Import necessary modules for testing
import { jest } from '@jest/globals';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Mock downloadFromSpaces
jest.mock('../../utils/downloadFromSpaces', () => ({
  downloadFromSpaces: jest.fn().mockResolvedValue({
    url: 'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3',
    content: Buffer.from('mock audio content'),
    size: 1024 * 1024, // 1MB
    contentType: 'audio/mpeg',
    timeTaken: 500,
  }),
  getAudioPathFromUrl: (url: string) => {
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    }
    return url.startsWith('/') ? url.slice(1) : url;
  },
}));

// Mock blobService
jest.mock('../../utils/services/BlobService', () => {
  const mockUploadResult = {
    url: 'https://public.blob.vercel-storage.com/the-iliad/audio/book-01.mp3',
    size: 1024 * 1024,
    uploadedAt: new Date().toISOString(),
  };

  return {
    blobService: {
      uploadFile: jest.fn().mockResolvedValue(mockUploadResult),
      getFileInfo: jest.fn().mockImplementation((url) => {
        // Simulate file already exists in some cases
        if (url.includes('book-02.mp3')) {
          return Promise.resolve({ size: 1024 * 1024 * 2, url });
        }
        // Simulate file doesn't exist for book-01
        if (url.includes('book-01.mp3')) {
          return Promise.reject(new Error('File not found'));
        }
        // Default behavior
        return Promise.resolve({ size: 1024 * 1024, url });
      }),
      getUrlForPath: jest
        .fn()
        .mockImplementation((path) => `https://public.blob.vercel-storage.com/${path}`),
    },
  };
});

// Mock blobPathService
jest.mock('../../utils/services/BlobPathService', () => ({
  blobPathService: {
    convertLegacyPath: jest.fn().mockImplementation((path) => {
      // Remove leading slash if present
      return path.startsWith('/') ? path.slice(1) : path;
    }),
  },
}));

// Mock translations
jest.mock('../../translations/index', () => ({
  default: [
    {
      slug: 'the-iliad',
      title: 'The Iliad',
      chapters: [
        {
          title: 'Book 1',
          audioSrc:
            'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-01.mp3',
        },
        {
          title: 'Book 2',
          audioSrc:
            'https://brainrot-publishing.nyc3.digitaloceanspaces.com/the-iliad/audio/book-02.mp3',
        },
      ],
    },
    {
      slug: 'the-odyssey',
      title: 'The Odyssey',
      chapters: [],
    },
  ],
}));

// Import the script (mock its dependencies first)
const scriptPath = '../../scripts/migrateAudioFilesWithContent.ts';

// Dynamically require to access the exported classes/functions for testing
// Define appropriate types for these imports
interface AudioFilesMigratorClass {
  new (options: {
    dryRun: boolean;
    books: string[];
    force: boolean;
    retries: number;
    concurrency: number;
    logFile: string;
    verbose: boolean;
  }): {
    run: () => Promise<{ skipped: number; successful: number; failed: number }>;
  };
}

interface ParseArgsFn {
  (args: string[]): {
    dryRun: boolean;
    books: string[];
    force: boolean;
    retries: number;
    concurrency: number;
    logFile: string;
    verbose: boolean;
  };
}

let AudioFilesMigrator: AudioFilesMigratorClass;
let _parseArgs: ParseArgsFn; // Prefixed with underscore as it's unused

// Setup to load the script
beforeAll(async () => {
  // Mock implementation needed for script loading
  (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

  // Import the script dynamically to test its functions
  const importedModule = await import(scriptPath);

  // Assuming AudioFilesMigrator and parseArgs are exported or can be extracted
  // This is for illustration - adjust based on how your script is structured
  AudioFilesMigrator = importedModule.AudioFilesMigrator;
  _parseArgs = importedModule.parseArgs;

  // If they're not exported, you'll need to test the script's behavior through its side effects
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Tests
describe('migrateAudioFilesWithContent script', () => {
  // Test the script behavior by mocking process.argv and calling the main function
  test('migrates audio files correctly', async () => {
    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = ['node', 'migrateAudioFilesWithContent.ts', '--dry-run', '--verbose'];

    try {
      // Import and call the main function
      const { main } = await import(scriptPath);

      // Mock exit to prevent actual exit
      const mockExit = jest
        .spyOn(process, 'exit')
        .mockImplementation((_code?: number) => undefined as never);

      // Run the main function
      await main();

      // Assertions
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(fs.writeFile).toHaveBeenCalled();
    } finally {
      // Restore original argv
      process.argv = originalArgv;
    }
  });

  test('handles dry run mode correctly', async () => {
    // Create a migrator instance with dry run option
    const options = {
      dryRun: true,
      books: [],
      force: false,
      retries: 3,
      concurrency: 5,
      logFile: 'test-output.json',
      verbose: true,
    };

    // If AudioFilesMigrator is not directly accessible, this test may need to be adapted
    const migrator = new AudioFilesMigrator(options);
    const summary = await migrator.run();

    // Check if the run completed with expected results
    expect(summary.skipped).toBeGreaterThan(0);
    expect(summary.successful).toBe(0); // No actual uploads in dry run

    // Check if writeFile was called with the right file
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('test-output.json'),
      expect.any(String),
      'utf8'
    );
  });

  test('handles file already exists case', async () => {
    // Create a migrator instance that would process book-02.mp3 (which exists in our mock)
    const options = {
      dryRun: false,
      books: ['the-iliad'],
      force: false, // Don't force upload
      retries: 3,
      concurrency: 5,
      logFile: 'test-output.json',
      verbose: true,
    };

    // If AudioFilesMigrator is not directly accessible, this test may need to be adapted
    const migrator = new AudioFilesMigrator(options);
    const summary = await migrator.run();

    // Expect at least one skipped file (book-02.mp3)
    expect(summary.skipped).toBeGreaterThanOrEqual(1);
  });

  test('forces upload when --force is used', async () => {
    // Create a migrator instance with force option
    const options = {
      dryRun: false,
      books: ['the-iliad'],
      force: true, // Force upload even if exists
      retries: 3,
      concurrency: 5,
      logFile: 'test-output.json',
      verbose: true,
    };

    // If AudioFilesMigrator is not directly accessible, this test may need to be adapted
    const migrator = new AudioFilesMigrator(options);
    const summary = await migrator.run();

    // Expect uploads for both files since force=true
    expect(summary.successful).toBeGreaterThanOrEqual(1);
  });
});
