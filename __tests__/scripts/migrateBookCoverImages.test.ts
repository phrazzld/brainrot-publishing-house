import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BlobService } from '../../utils/services/BlobService';
import { BlobPathService } from '../../utils/services/BlobPathService';
import translations from '../../translations';

// Mock the BlobService
jest.mock('../../utils/services/BlobService', () => {
  return {
    BlobService: jest.fn().mockImplementation(() => ({
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://public.blob.vercel-storage.com/test-url',
        size: 1024,
        uploadedAt: new Date().toISOString(),
      }),
      getFileInfo: jest.fn().mockResolvedValue({
        size: 1024,
        uploadedAt: new Date().toISOString(),
        contentType: 'image/png',
      }),
      getUrlForPath: jest.fn().mockImplementation((path) => 
        `https://public.blob.vercel-storage.com/${path}`
      ),
    })),
    blobService: {
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://public.blob.vercel-storage.com/test-url',
        size: 1024,
        uploadedAt: new Date().toISOString(),
      }),
      getFileInfo: jest.fn().mockResolvedValue({
        size: 1024,
        uploadedAt: new Date().toISOString(),
        contentType: 'image/png',
      }),
      getUrlForPath: jest.fn().mockImplementation((path) => 
        `https://public.blob.vercel-storage.com/${path}`
      ),
    },
  };
});

// Mock file existence
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    size: 1024,
    mtimeMs: Date.now(),
  }),
  access: jest.fn().mockResolvedValue(undefined),
}));

// Define the types we'll need
interface MigrationOptions {
  dryRun?: boolean;
  books?: string[];
  force?: boolean;
  retries?: number;
  concurrency?: number;
}

interface BookMigrationResult {
  status: 'success' | 'skipped' | 'failed';
  originalPath: string;
  blobPath: string;
  blobUrl: string;
  error?: string;
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  books: Record<string, BookMigrationResult>;
}

class MigrationLog {
  private log: Record<string, BookMigrationResult> = {};
  
  constructor(private readonly logFile: string) {}
  
  public async load(): Promise<void> {
    try {
      await fs.access(this.logFile);
      const data = await fs.readFile(this.logFile, 'utf8');
      this.log = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty log
      this.log = {};
    }
  }
  
  public async save(): Promise<void> {
    await fs.writeFile(this.logFile, JSON.stringify(this.log, null, 2), 'utf8');
  }
  
  public add(bookSlug: string, result: BookMigrationResult): void {
    this.log[bookSlug] = result;
  }
  
  public has(bookSlug: string): boolean {
    return bookSlug in this.log;
  }
  
  public get(bookSlug: string): BookMigrationResult | undefined {
    return this.log[bookSlug];
  }
  
  public getAll(): Record<string, BookMigrationResult> {
    return { ...this.log };
  }
}

class CoverImageMigrationService {
  private migrationLog: MigrationLog;
  
  constructor(
    private readonly blobService: BlobService,
    private readonly blobPathService: BlobPathService,
    logFile: string = 'cover-images-migration.json'
  ) {
    this.migrationLog = new MigrationLog(logFile);
  }
  
  // Mock file creation for testing
  private createMockFile(filePath: string): File {
    return new File(['mock file content'], path.basename(filePath), {
      type: 'image/png',
    });
  }
  
  public async migrateAll(options: MigrationOptions = {}): Promise<MigrationResult> {
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      books: {},
    };
    
    // Load existing migration log
    await this.migrationLog.load();
    
    // Get books with cover images
    const books = translations
      .filter(book => 
        book.coverImage && 
        (!options.books || options.books.includes(book.slug))
      );
    
    result.total = books.length;
    
    // Migrate each book cover
    for (const book of books) {
      // Skip if already migrated and not forced
      if (this.migrationLog.has(book.slug) && !options.force && !options.dryRun) {
        result.skipped++;
        result.books[book.slug] = this.migrationLog.get(book.slug)!;
        continue;
      }
      
      try {
        // Skip actual upload in dry run mode
        if (options.dryRun) {
          const originalPath = book.coverImage;
          const blobPath = this.blobPathService.convertLegacyPath(originalPath);
          const blobUrl = this.blobService.getUrlForPath(blobPath);
          
          const migrationResult: BookMigrationResult = {
            status: 'skipped',
            originalPath,
            blobPath,
            blobUrl,
          };
          
          result.skipped++;
          result.books[book.slug] = migrationResult;
          continue;
        }
        
        // Perform actual migration
        const migrationResult = await this.migrateBookCover(book);
        
        // Update statistics
        if (migrationResult.status === 'success') {
          result.migrated++;
        } else if (migrationResult.status === 'skipped') {
          result.skipped++;
        } else {
          result.failed++;
        }
        
        // Store result
        result.books[book.slug] = migrationResult;
        this.migrationLog.add(book.slug, migrationResult);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Record failure
        const failedResult: BookMigrationResult = {
          status: 'failed',
          originalPath: book.coverImage,
          blobPath: '',
          blobUrl: '',
          error: errorMessage,
        };
        
        result.failed++;
        result.books[book.slug] = failedResult;
        this.migrationLog.add(book.slug, failedResult);
      }
    }
    
    // Save migration log
    if (!options.dryRun) {
      await this.migrationLog.save();
    }
    
    return result;
  }
  
  private async migrateBookCover(book: typeof translations[0]): Promise<BookMigrationResult> {
    const originalPath = book.coverImage;
    const blobPath = this.blobPathService.convertLegacyPath(originalPath);
    
    // This would be where we read the actual file in production code
    const file = this.createMockFile(originalPath);
    
    // Get the directory path
    const pathname = path.dirname(blobPath);
    const filename = path.basename(blobPath);
    
    // Upload to Blob storage
    const uploadResult = await this.blobService.uploadFile(file, {
      pathname,
      filename,
      access: 'public',
      cacheControl: 'max-age=31536000, immutable', // 1 year cache
    });
    
    // Verify upload
    const verified = await this.verifyUpload(uploadResult.url);
    
    if (!verified) {
      return {
        status: 'failed',
        originalPath,
        blobPath,
        blobUrl: uploadResult.url,
        error: 'Verification failed',
      };
    }
    
    return {
      status: 'success',
      originalPath,
      blobPath,
      blobUrl: uploadResult.url,
    };
  }
  
  private async verifyUpload(blobUrl: string): Promise<boolean> {
    try {
      // Get file info to verify it exists
      const fileInfo = await this.blobService.getFileInfo(blobUrl);
      return fileInfo.size > 0;
    } catch (error) {
      return false;
    }
  }
}

describe('CoverImageMigrationService', () => {
  let migrationService: CoverImageMigrationService;
  
  beforeEach(() => {
    migrationService = new CoverImageMigrationService(
      new BlobService(),
      new BlobPathService(),
      'test-migration-log.json'
    );
  });
  
  it('should list all cover images in translations', () => {
    const booksWithCovers = translations.filter(book => book.coverImage);
    expect(booksWithCovers.length).toBeGreaterThan(0);
  });
  
  it('should correctly map paths using BlobPathService', () => {
    const blobPathService = new BlobPathService();
    const examplePath = '/assets/hamlet/images/hamlet-07.png';
    const blobPath = blobPathService.convertLegacyPath(examplePath);
    
    expect(blobPath).toBe('books/hamlet/images/hamlet-07.png');
  });
  
  it('should perform a dry run without uploading', async () => {
    const result = await migrationService.migrateAll({ dryRun: true });
    
    expect(result.total).toBeGreaterThan(0);
    expect(result.skipped).toBe(result.total);
    expect(result.migrated).toBe(0);
    expect(result.failed).toBe(0);
  });
  
  it('should migrate all cover images', async () => {
    const result = await migrationService.migrateAll();
    
    expect(result.total).toBeGreaterThan(0);
    expect(result.migrated).toBe(result.total);
    expect(result.failed).toBe(0);
    
    // Check each book has a successful result
    for (const book of translations.filter(b => b.coverImage)) {
      expect(result.books[book.slug]).toBeDefined();
      expect(result.books[book.slug].status).toBe('success');
      expect(result.books[book.slug].blobPath).toBeDefined();
      expect(result.books[book.slug].blobUrl).toContain('https://public.blob.vercel-storage.com/');
    }
  });
  
  it('should skip already migrated images', async () => {
    // First migration
    await migrationService.migrateAll();
    
    // Second migration should skip
    const result = await migrationService.migrateAll();
    
    expect(result.total).toBeGreaterThan(0);
    expect(result.skipped).toBe(result.total);
    expect(result.migrated).toBe(0);
  });
  
  it('should force re-migration when force option is true', async () => {
    // First migration
    await migrationService.migrateAll();
    
    // Force re-migration
    const result = await migrationService.migrateAll({ force: true });
    
    expect(result.total).toBeGreaterThan(0);
    expect(result.migrated).toBe(result.total);
    expect(result.skipped).toBe(0);
  });
  
  it('should handle errors during migration', async () => {
    // Mock an error
    jest.spyOn(BlobService.prototype, 'uploadFile').mockRejectedValueOnce(new Error('Upload failed'));
    
    const result = await migrationService.migrateAll({ 
      books: [translations[0].slug] 
    });
    
    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.books[translations[0].slug].status).toBe('failed');
    expect(result.books[translations[0].slug].error).toBeDefined();
  });
});