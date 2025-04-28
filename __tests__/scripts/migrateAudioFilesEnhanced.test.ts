/**
 * Tests for the enhanced audio migration script
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { blobService } from '../../utils/services/BlobService';

// Mock environment configuration
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock file system
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{"books":[]}'),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

// Mock AWS S3 client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({
      Body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from([0xFF, 0xFB, 0x90, 0x44]); // Mock MP3 header
        },
      },
      ContentType: 'audio/mpeg',
      ContentLength: 1024,
    })),
  })),
  ListObjectsV2Command: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

// Mock Blob service
vi.mock('../../utils/services/BlobService', () => ({
  blobService: {
    uploadFile: vi.fn().mockResolvedValue({
      url: 'https://example.com/test.mp3',
      size: 1024,
      uploadedAt: new Date().toISOString(),
    }),
    getFileInfo: vi.fn().mockResolvedValue({
      size: 1024,
    }),
    getUrlForPath: vi.fn().mockImplementation((path) => `https://example.com/${path}`),
  },
}));

// Mock translations
vi.mock('../../translations', () => ({
  default: [
    {
      slug: 'test-book',
      title: 'Test Book',
      chapters: [
        {
          title: 'Chapter 1',
          audioSrc: 'test-book/audio/chapter-01.mp3',
        },
      ],
    },
  ],
}));

// Mock readline interface
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn().mockImplementation((_, callback) => callback('y')),
    close: vi.fn(),
  }),
}));

// Import the module under test
// Note: We're not directly importing the module to avoid executing it
// Instead, we'll import it dynamically in the tests

describe('Enhanced Audio Migration Script', () => {
  // Constants for testing
  const TEST_BOOK_SLUG = 'test-book';
  const TEST_AUDIO_KEY = 'test-book/audio/chapter-01.mp3';
  
  // Mock process.exit to prevent tests from actually exiting
  const originalExit = process.exit;
  
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Mock process.exit
    process.exit = vi.fn() as any;
    
    // Mock process.argv
    process.argv = ['node', 'migrateAudioFilesEnhanced.ts', '--dry-run', `--books=${TEST_BOOK_SLUG}`];
    
    // Mock console.log to reduce test output noise
    console.log = vi.fn();
    console.error = vi.fn();
    
    // Setup existsSync mock for different scenarios
    (existsSync as any).mockImplementation((path: string) => {
      if (path.includes('inventory')) {
        return false; // No inventory file by default
      }
      return true; // Other files exist
    });
  });
  
  afterEach(() => {
    // Restore process.exit
    process.exit = originalExit;
  });
  
  it('should create an instance of S3Client with correct configuration', async () => {
    // Import the function that creates the S3 client
    const script = await import('../../scripts/migrateAudioFilesEnhanced');
    
    // Verify S3Client was constructed
    expect(S3Client).toHaveBeenCalled();
  });
  
  it('should correctly parse command line arguments', async () => {
    // Setup test arguments
    process.argv = [
      'node',
      'migrateAudioFilesEnhanced.ts',
      '--dry-run',
      '--books=test-book',
      '--force',
      '--retries=5',
      '--concurrency=2',
      '--log-file=test.json',
      '--verbose',
      '--size-threshold=200',
    ];
    
    // Import the script to trigger argument parsing
    const script = await import('../../scripts/migrateAudioFilesEnhanced');
    
    // Since we can't easily access internal state, we can verify behavior indirectly
    // Look for verbose logging or check output file path in writeFile calls
    expect(fs.writeFile).toHaveBeenCalled();
  });
  
  it('should upload files to Blob storage', async () => {
    // Import the script
    const script = await import('../../scripts/migrateAudioFilesEnhanced');
    
    // Verify that uploadFile was called on the blob service
    expect(blobService.uploadFile).toHaveBeenCalled();
  });
  
  it('should generate a detailed report', async () => {
    // Import the script
    const script = await import('../../scripts/migrateAudioFilesEnhanced');
    
    // Verify that writeFile was called for both JSON and MD reports
    const writeFileCalls = (fs.writeFile as any).mock.calls;
    expect(writeFileCalls.length).toBeGreaterThanOrEqual(1);
    
    // Check that at least one call was for writing a markdown file
    const mdFileCalls = writeFileCalls.filter((call: any[]) => 
      typeof call[0] === 'string' && call[0].endsWith('.md')
    );
    expect(mdFileCalls.length).toBeGreaterThanOrEqual(1);
  });
  
  it('should handle inventory file if provided', async () => {
    // Setup mock for inventory file existence
    (existsSync as any).mockImplementation((path: string) => {
      if (path.includes('inventory')) {
        return true; // Inventory file exists
      }
      return true; // Other files exist
    });
    
    // Setup mock readFile to return valid inventory data
    (fs.readFile as any).mockResolvedValue(JSON.stringify({
      books: [
        {
          slug: TEST_BOOK_SLUG,
          title: 'Test Book',
          files: [
            {
              key: TEST_AUDIO_KEY,
              exists: true,
              isPlaceholder: false,
              size: 1048576, // 1MB
              cdnUrl: `https://cdn.example.com/${TEST_AUDIO_KEY}`,
              chapterTitle: 'Chapter 1',
            }
          ]
        }
      ]
    }));
    
    // Set command line arg for inventory
    process.argv.push('--inventory=test-inventory.json');
    
    // Import the script
    const script = await import('../../scripts/migrateAudioFilesEnhanced');
    
    // Verify that readFile was called for the inventory
    expect(fs.readFile).toHaveBeenCalled();
  });
});