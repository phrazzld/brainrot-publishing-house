import { AssetType } from '@/types/assets.js';
import { AssetNameMigration } from '@/utils/migration/AssetNameMigration.js';

describe('AssetNameMigration', () => {
  let migration: AssetNameMigration;

  beforeEach(() => {
    migration = new AssetNameMigration();
  });

  describe('migrateAssetName', () => {
    describe('Audio assets', () => {
      test('standardized names unchanged', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, 'chapter-01.mp3');
        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(false);
        expect(result.migratedName).toBe('chapter-01.mp3');
      });

      test('migrates numeric audio names', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, '1.mp3');
        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-01.mp3');
      });

      test('migrates book- prefix names', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, 'book-10.mp3');
        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-10.mp3');
      });

      test('migrates slug-based names', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, 'the-iliad-chapter-5.mp3');
        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-05.mp3');
      });

      test('handles full audiobook names', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, 'full-audiobook.mp3');
        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(false);
        expect(result.migratedName).toBe('full-audiobook.mp3');
      });

      test('marks non-migratable as failure', () => {
        const result = migration.migrateAssetName(AssetType.AUDIO, 'invalid-audio.wav');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Text assets', () => {
      test('should not change already standardized names', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'brainrot-chapter-01.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(false);
        expect(result.migratedName).toBe('brainrot-chapter-01.txt');
      });

      test('should migrate brainrot directory text names', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'brainrot/5.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('brainrot-chapter-05.txt');
      });

      test('should migrate brainrot fulltext directory name', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'brainrot/fulltext.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('brainrot-fulltext.txt');
      });

      test('should migrate source directory text names with numbers', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'source/3.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('source-chapter-03.txt');
      });

      test('should migrate source directory text names with custom names', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'source/introduction.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('source-introduction.txt');
      });

      test('should migrate simple numeric text names', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, '7.txt');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-07.txt');
      });

      test('should mark non-migratable names as failure', () => {
        const result = migration.migrateAssetName(AssetType.TEXT, 'invalid-text.doc');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Image assets', () => {
      test('should not change already standardized names', () => {
        const result = migration.migrateAssetName(AssetType.IMAGE, 'chapter-01.jpg');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(false);
        expect(result.migratedName).toBe('chapter-01.jpg');
      });

      test('should migrate simple numeric image names', () => {
        const result = migration.migrateAssetName(AssetType.IMAGE, '1.jpg');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-01.jpg');
      });

      test('should migrate numeric image names with different extensions', () => {
        const result = migration.migrateAssetName(AssetType.IMAGE, '10.png');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-10.png');
      });

      test('should migrate slug-based image names', () => {
        const result = migration.migrateAssetName(AssetType.IMAGE, 'hamlet-chapter-5.webp');

        expect(result.success).toBe(true);
        expect(result.wasChanged).toBe(true);
        expect(result.migratedName).toBe('chapter-05.webp');
      });

      test('should handle cover and thumbnail names', () => {
        expect(migration.migrateAssetName(AssetType.IMAGE, 'cover.jpg').wasChanged).toBe(false);
        expect(migration.migrateAssetName(AssetType.IMAGE, 'thumbnail.png').wasChanged).toBe(false);
      });

      test('should mark non-migratable names as failure', () => {
        const result = migration.migrateAssetName(AssetType.IMAGE, 'invalid-image.tiff');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
