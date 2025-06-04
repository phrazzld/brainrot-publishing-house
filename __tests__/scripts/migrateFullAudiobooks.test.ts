/**
 * Tests for Full Audiobook Migration Script
 */
import * as fs from 'fs';
import * as path from 'path';

import type {
  AudiobookConfig,
  BookMigrationResult,
  MigrationOptions,
} from '../../scripts/migrateFullAudiobooks.js';

// Define types for exec callback
type ExecCallback = (error: Error | null, result: { stdout: string; stderr: string }) => void;
type ExecFunction = (command: string, callback: ExecCallback) => void;

// Mock the logger before anything else
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock dependencies before imports
jest.mock('@vercel/blob');
jest.mock('../../utils/logger.js', () => ({
  createRequestLogger: jest.fn(() => mockLogger),
  default: mockLogger,
}));
jest.mock('child_process', () => ({
  exec: jest.fn((cmd: string, cb: ExecCallback) => cb(null, { stdout: '', stderr: '' })),
}));

// Mock VercelBlobAssetService
const mockAssetService = {
  exists: jest.fn(),
  list: jest.fn(),
  download: jest.fn(),
  upload: jest.fn(),
  getMetadata: jest.fn(),
  assetExists: jest.fn(),
  listAssets: jest.fn(),
  fetchAsset: jest.fn(),
  uploadAsset: jest.fn(),
};

jest.mock('../../utils/services/VercelBlobAssetService.js', () => ({
  VercelBlobAssetService: jest.fn(() => mockAssetService),
  vercelBlobAssetService: mockAssetService, // Mock the singleton too
}));

const { exec } = require('child_process') as { exec: ExecFunction & jest.Mock };

// Import after mocks
interface MigrateFullAudiobooksModule {
  auditAudiobooks: (bookSlugs: string[]) => Promise<AudiobookConfig[]>;
  downloadChapterFiles: (
    config: AudiobookConfig | string,
    chapters: string[],
    tempDir: string,
  ) => Promise<string[]>;
  concatenateChapters: (inputFiles: string[], outputFile: string) => Promise<string>;
  uploadFullAudiobook: (
    localPath: string,
    remotePath: string,
    bookSlug: string,
  ) => Promise<boolean>;
  verifyMigration: (configs: AudiobookConfig[]) => Promise<BookMigrationResult[]>;
  migrateFullAudiobooks: (options: MigrationOptions) => Promise<{
    success: boolean;
    totalBooks: number;
    migrated: number;
    failed: number;
    skipped: number;
    details: BookMigrationResult[];
  }>;
  resetAssetService: () => void;
}

let migrateFullAudiobooksModule: MigrateFullAudiobooksModule;

beforeAll(() => {
  migrateFullAudiobooksModule = require('../../scripts/migrateFullAudiobooks');
});

describe('migrateFullAudiobooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset asset service instance before each test
    migrateFullAudiobooksModule.resetAssetService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('auditAudiobooks', () => {
    it('should identify books with existing full audiobooks', async () => {
      mockAssetService.exists.mockResolvedValueOnce(true); // the-declaration
      mockAssetService.exists.mockResolvedValueOnce(false); // the-iliad
      mockAssetService.list.mockResolvedValueOnce({
        blobs: Array.from({ length: 24 }, (_, i) => ({
          pathname: `assets/audio/the-iliad/chapter-${String(i + 1).padStart(2, '0')}.mp3`,
          size: 1024 * 1024,
        })),
      });

      const configs = await migrateFullAudiobooksModule.auditAudiobooks([
        'the-declaration',
        'the-iliad',
      ]);

      expect(configs).toHaveLength(2);
      expect(configs[0]).toMatchObject({
        bookSlug: 'the-declaration',
        status: 'exists',
      });
      expect(configs[1]).toMatchObject({
        bookSlug: 'the-iliad',
        status: 'needs_concatenation',
        chapterCount: 24,
      });
    });

    it('should identify books with missing chapters', async () => {
      mockAssetService.exists.mockResolvedValueOnce(false);
      mockAssetService.list.mockResolvedValueOnce({ blobs: [] });

      const configs = await migrateFullAudiobooksModule.auditAudiobooks(['missing-book']);

      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        bookSlug: 'missing-book',
        status: 'missing',
        chapterCount: 0,
      });
    });
  });

  describe('downloadChapterFiles', () => {
    it('should download all chapter files to temp directory', async () => {
      const tempDir = '/tmp/audiobooks/the-iliad';
      const chapters = [
        'assets/audio/the-iliad/chapter-01.mp3',
        'assets/audio/the-iliad/chapter-02.mp3',
      ];

      for (const chapter of chapters) {
        const _localPath = path.join(tempDir, path.basename(chapter));
        mockAssetService.download.mockResolvedValueOnce(undefined);
      }

      const downloadedFiles = await migrateFullAudiobooksModule.downloadChapterFiles(
        'the-iliad',
        chapters,
        tempDir,
      );

      expect(downloadedFiles).toHaveLength(2);
      expect(mockAssetService.download).toHaveBeenCalledTimes(2);
      expect(downloadedFiles[0]).toMatch(/chapter-01\.mp3$/);
      expect(downloadedFiles[1]).toMatch(/chapter-02\.mp3$/);
    });

    it('should handle download errors gracefully', async () => {
      const tempDir = '/tmp/audiobooks/the-iliad';
      const chapters = ['assets/audio/the-iliad/chapter-01.mp3'];

      mockAssetService.download.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        migrateFullAudiobooksModule.downloadChapterFiles('the-iliad', chapters, tempDir),
      ).rejects.toThrow('Network error');
    });
  });

  describe('concatenateChapters', () => {
    it('should concatenate chapters using ffmpeg', async () => {
      const inputFiles = ['/tmp/the-iliad/chapter-01.mp3', '/tmp/the-iliad/chapter-02.mp3'];
      const outputFile = '/tmp/the-iliad/full-audiobook.mp3';

      // Mock ffmpeg check and execution
      exec.mockImplementation((cmd: string, cb: ExecCallback) => {
        if (cmd.includes('ffmpeg -version')) {
          cb(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
        } else if (cmd.includes('ffmpeg -f concat')) {
          cb(null, { stdout: 'Concatenation complete', stderr: '' });
        }
      });

      // Mock file existence
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(fs, 'statSync')
        .mockReturnValue({ size: BigInt(1024 * 1024 * 10) } as unknown as fs.Stats);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const result = await migrateFullAudiobooksModule.concatenateChapters(inputFiles, outputFile);

      expect(result).toBe(outputFile);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('ffmpeg -version'),
        expect.any(Function),
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('ffmpeg -f concat'),
        expect.any(Function),
      );
    });

    it('should throw error if ffmpeg is not available', async () => {
      exec.mockImplementation((cmd: string, cb: ExecCallback) => {
        if (cmd.includes('ffmpeg -version')) {
          cb(new Error('ffmpeg not found'), { stdout: '', stderr: 'command not found' });
        }
      });

      await expect(
        migrateFullAudiobooksModule.concatenateChapters([], '/tmp/output.mp3'),
      ).rejects.toThrow('ffmpeg is not installed');
    });

    it('should validate output file exists and has size', async () => {
      const inputFiles = ['/tmp/chapter-01.mp3'];
      const outputFile = '/tmp/full-audiobook.mp3';

      exec.mockImplementation((cmd: string, cb: ExecCallback) => {
        if (cmd.includes('ffmpeg -version')) {
          cb(null, { stdout: 'ffmpeg version 4.4.0', stderr: '' });
        } else if (cmd.includes('ffmpeg -f concat')) {
          cb(null, { stdout: '', stderr: '' });
        }
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      await expect(
        migrateFullAudiobooksModule.concatenateChapters(inputFiles, outputFile),
      ).rejects.toThrow('Concatenation failed: output file not created');
    });
  });

  describe('uploadFullAudiobook', () => {
    it('should upload file to standardized location', async () => {
      const localPath = '/tmp/the-iliad/full-audiobook.mp3';
      const remotePath = 'assets/audio/the-iliad/full-audiobook.mp3';

      mockAssetService.upload.mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/assets/audio/the-iliad/full-audiobook.mp3',
      });

      jest
        .spyOn(fs, 'statSync')
        .mockReturnValue({ size: BigInt(1024 * 1024 * 50) } as unknown as fs.Stats);

      const result = await migrateFullAudiobooksModule.uploadFullAudiobook(
        localPath,
        remotePath,
        'the-iliad',
      );

      expect(result).toBe(true);
      expect(mockAssetService.upload).toHaveBeenCalledWith(
        localPath,
        remotePath,
        expect.objectContaining({
          contentType: 'audio/mpeg',
        }),
      );
    });

    it('should handle upload errors with retries', async () => {
      const localPath = '/tmp/the-iliad/full-audiobook.mp3';
      const remotePath = 'assets/audio/the-iliad/full-audiobook.mp3';

      jest
        .spyOn(fs, 'statSync')
        .mockReturnValue({ size: BigInt(1024 * 1024 * 50) } as unknown as fs.Stats);

      // First attempt fails, second succeeds
      mockAssetService.upload
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          url: 'https://blob.vercel-storage.com/assets/audio/the-iliad/full-audiobook.mp3',
        });

      const result = await migrateFullAudiobooksModule.uploadFullAudiobook(
        localPath,
        remotePath,
        'the-iliad',
      );

      expect(result).toBe(true);
      expect(mockAssetService.upload).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyMigration', () => {
    it('should verify all audiobooks exist at standardized paths', async () => {
      const configs: AudiobookConfig[] = [
        {
          bookSlug: 'the-iliad',
          bookTitle: 'The Iliad',
          expectedPath: 'assets/audio/the-iliad/full-audiobook.mp3',
          status: 'needs_concatenation',
          chapterCount: 24,
        },
        {
          bookSlug: 'the-declaration',
          bookTitle: 'The Declaration',
          expectedPath: 'assets/audio/the-declaration/full-audiobook.mp3',
          status: 'exists',
          chapterCount: 0,
        },
      ];

      mockAssetService.exists.mockResolvedValue(true);
      mockAssetService.getMetadata.mockResolvedValue({
        size: 1024 * 1024 * 50,
        contentType: 'audio/mpeg',
      });

      const results = await migrateFullAudiobooksModule.verifyMigration(configs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should report verification failures', async () => {
      const configs: AudiobookConfig[] = [
        {
          bookSlug: 'the-iliad',
          bookTitle: 'The Iliad',
          expectedPath: 'assets/audio/the-iliad/full-audiobook.mp3',
          status: 'needs_concatenation',
          chapterCount: 24,
        },
      ];

      mockAssetService.exists.mockResolvedValue(false);

      const results = await migrateFullAudiobooksModule.verifyMigration(configs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('File not found');
    });
  });

  describe('migrateFullAudiobooks (integration)', () => {
    it('should complete full migration workflow', async () => {
      const options = {
        dryRun: false,
        verbose: false,
        force: false,
        books: ['the-iliad'],
      };

      // Mock audit phase
      mockAssetService.exists.mockResolvedValueOnce(false);
      mockAssetService.list.mockResolvedValueOnce({
        blobs: Array.from({ length: 2 }, (_, i) => ({
          pathname: `assets/audio/the-iliad/chapter-${String(i + 1).padStart(2, '0')}.mp3`,
          size: 1024 * 1024,
        })),
      });

      // Mock download phase
      mockAssetService.download.mockResolvedValue(undefined);

      // Mock concatenation phase
      exec.mockImplementation((cmd: string, cb: ExecCallback) => {
        cb(null, { stdout: 'Success', stderr: '' });
      });
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(fs, 'statSync')
        .mockReturnValue({ size: BigInt(1024 * 1024 * 10) } as unknown as fs.Stats);
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => '' as unknown as string);
      jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      // Mock upload phase
      mockAssetService.upload.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/assets/audio/the-iliad/full-audiobook.mp3',
      });

      // Mock verification phase
      mockAssetService.exists.mockResolvedValue(true);
      mockAssetService.getMetadata.mockResolvedValue({
        size: 1024 * 1024 * 50,
        contentType: 'audio/mpeg',
      });

      const results = await migrateFullAudiobooksModule.migrateFullAudiobooks(options);

      expect(results.success).toBe(true);
      expect(results.totalBooks).toBe(1);
      expect(results.migrated).toBe(1);
      expect(results.failed).toBe(0);
    });

    it('should respect dry-run mode', async () => {
      const options = {
        dryRun: true,
        verbose: false,
        force: false,
        books: ['the-iliad'],
      };

      // Mock audit phase only
      mockAssetService.exists.mockResolvedValueOnce(false);
      mockAssetService.list.mockResolvedValueOnce({
        blobs: Array.from({ length: 2 }, (_, i) => ({
          pathname: `assets/audio/the-iliad/chapter-${String(i + 1).padStart(2, '0')}.mp3`,
          size: 1024 * 1024,
        })),
      });

      const results = await migrateFullAudiobooksModule.migrateFullAudiobooks(options);

      expect(results.success).toBe(true);
      expect(results.totalBooks).toBe(1);
      expect(results.migrated).toBe(0);
      expect(results.failed).toBe(0);

      // Should not have called download, upload, or concatenation
      expect(mockAssetService.download).not.toHaveBeenCalled();
      expect(mockAssetService.upload).not.toHaveBeenCalled();
      expect(exec).toHaveBeenCalledTimes(1); // Only for ffmpeg check
    });
  });
});
