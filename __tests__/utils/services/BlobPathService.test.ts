import { AssetType } from '../../../types/assets';
import { AssetPathService } from '../../../utils/services/AssetPathService';
import { BlobPathService, blobPathService } from '../../../utils/services/BlobPathService';

describe('BlobPathService', () => {
  let service: BlobPathService;
  let mockAssetPathService: jest.Mocked<AssetPathService>;

  beforeEach(() => {
    // Create a mock for AssetPathService
    mockAssetPathService = {
      getAssetPath: jest.fn(),
      getAudioPath: jest.fn(),
      getBrainrotTextPath: jest.fn(),
      getTextPath: jest.fn(),
      getImagePath: jest.fn(),
      getSourceTextPath: jest.fn(),
      getBookImagePath: jest.fn(),
      getSharedImagePath: jest.fn(),
      getSiteAssetPath: jest.fn(),
      normalizeLegacyPath: jest.fn(),
      getBookSlugFromPath: jest.fn(),
      convertLegacyPath: jest.fn(),
      convertAssetsPrefixPath: jest.fn(),
      convertBooksPrefixPath: jest.fn(),
      convertDirectPath: jest.fn(),
      processAssetTypeAndRemainder: jest.fn(),
      processAudioRemainder: jest.fn(),
      processTextRemainder: jest.fn(),
      padChapter: jest.fn(),
      mapAssetType: jest.fn(),
    } as unknown as jest.Mocked<AssetPathService>;

    // Create a new instance with our mock
    service = new BlobPathService(mockAssetPathService);
  });

  describe('getBookImagePath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getBookImagePath.mockReturnValue('assets/image/hamlet/hamlet-01.png');

      // Call the method
      const result = service.getBookImagePath('hamlet', 'hamlet-01.png');

      // Verify the result
      expect(mockAssetPathService.getBookImagePath).toHaveBeenCalledWith('hamlet', 'hamlet-01.png');
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });
  });

  describe('getBrainrotTextPath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getBrainrotTextPath.mockReturnValue(
        'assets/text/hamlet/brainrot-chapter-01.txt',
      );

      // Call the method
      const result = service.getBrainrotTextPath('hamlet', '1');

      // Verify the result
      expect(mockAssetPathService.getBrainrotTextPath).toHaveBeenCalledWith('hamlet', '1');
      expect(result).toBe('books/hamlet/text/brainrot-chapter-01.txt');
    });
  });

  describe('getFulltextPath', () => {
    it('should delegate to AssetPathService.getTextPath and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getTextPath.mockReturnValue('assets/text/hamlet/fulltext.txt');

      // Call the method
      const result = service.getFulltextPath('hamlet');

      // Verify the result
      expect(mockAssetPathService.getTextPath).toHaveBeenCalledWith('hamlet', 'fulltext');
      expect(result).toBe('books/hamlet/text/fulltext.txt');
    });
  });

  describe('getSourceTextPath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getSourceTextPath.mockReturnValue(
        'assets/text/hamlet/source-source.txt',
      );

      // Call the method
      const result = service.getSourceTextPath('hamlet', 'source.txt');

      // Verify the result
      expect(mockAssetPathService.getSourceTextPath).toHaveBeenCalledWith('hamlet', 'source.txt');
      expect(result).toBe('books/hamlet/text/source-source.txt');
    });
  });

  describe('getSharedImagePath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getSharedImagePath.mockReturnValue('assets/shared/shared-image.png');

      // Call the method
      const result = service.getSharedImagePath('shared-image.png');

      // Verify the result
      expect(mockAssetPathService.getSharedImagePath).toHaveBeenCalledWith('shared-image.png');
      expect(result).toBe('images/shared-image.png');
    });
  });

  describe('getSiteAssetPath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getSiteAssetPath.mockReturnValue('assets/site/logo.svg');

      // Call the method
      const result = service.getSiteAssetPath('logo.svg');

      // Verify the result
      expect(mockAssetPathService.getSiteAssetPath).toHaveBeenCalledWith('logo.svg');
      expect(result).toBe('site-assets/logo.svg');
    });
  });

  describe('getAudioPath', () => {
    it('should delegate to AssetPathService and adapt paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getAudioPath.mockReturnValue('assets/audio/hamlet/chapter-01.mp3');

      // Call the method
      const result = service.getAudioPath('hamlet', '1');

      // Verify the result
      expect(mockAssetPathService.getAudioPath).toHaveBeenCalledWith('hamlet', '1');
      expect(result).toBe('books/hamlet/audio/chapter-01.mp3');
    });
  });

  describe('getAssetPath', () => {
    it('should delegate to AssetPathService and adapt paths correctly for different asset types', () => {
      // Setup the mock for audio
      mockAssetPathService.getAssetPath.mockReturnValue('assets/audio/hamlet/full-audiobook.mp3');

      // Call the method
      const result = service.getAssetPath(AssetType.AUDIO, 'hamlet', 'full-audiobook.mp3');

      // Verify the result
      expect(mockAssetPathService.getAssetPath).toHaveBeenCalledWith(
        AssetType.AUDIO,
        'hamlet',
        'full-audiobook.mp3',
      );
      expect(result).toBe('books/hamlet/audio/full-audiobook.mp3');

      // Setup the mock for image
      mockAssetPathService.getAssetPath.mockReturnValue('assets/image/odyssey/cover.jpg');

      // Call the method
      const imageResult = service.getAssetPath(AssetType.IMAGE, 'odyssey', 'cover.jpg');

      // Verify the result
      expect(mockAssetPathService.getAssetPath).toHaveBeenCalledWith(
        AssetType.IMAGE,
        'odyssey',
        'cover.jpg',
      );
      expect(imageResult).toBe('books/odyssey/images/cover.jpg');
    });
  });

  describe('convertLegacyPath', () => {
    it('should delegate to AssetPathService.normalizeLegacyPath and adapt the result', () => {
      // Setup the mock
      mockAssetPathService.normalizeLegacyPath.mockReturnValue('assets/image/hamlet/hamlet-01.png');

      // Call the method
      const result = service.convertLegacyPath('/assets/hamlet/images/hamlet-01.png');

      // Verify the result
      expect(mockAssetPathService.normalizeLegacyPath).toHaveBeenCalledWith(
        '/assets/hamlet/images/hamlet-01.png',
      );
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });

    it('should handle shared images path correctly', () => {
      // Setup the mock
      mockAssetPathService.normalizeLegacyPath.mockReturnValue('assets/shared/shared-image.png');

      // Call the method
      const result = service.convertLegacyPath('/assets/images/shared-image.png');

      // Verify the result
      expect(mockAssetPathService.normalizeLegacyPath).toHaveBeenCalledWith(
        '/assets/images/shared-image.png',
      );
      expect(result).toBe('images/shared-image.png');
    });

    it('should handle site assets path correctly', () => {
      // Setup the mock
      mockAssetPathService.normalizeLegacyPath.mockReturnValue('assets/site/logo.svg');

      // Call the method
      const result = service.convertLegacyPath('/site-assets/logo.svg');

      // Verify the result
      expect(mockAssetPathService.normalizeLegacyPath).toHaveBeenCalledWith(
        '/site-assets/logo.svg',
      );
      expect(result).toBe('site-assets/logo.svg');
    });
  });

  describe('getBookSlugFromPath', () => {
    it('should delegate to AssetPathService.getBookSlugFromPath', () => {
      // Setup the mock
      mockAssetPathService.getBookSlugFromPath.mockReturnValue('hamlet');

      // Call the method
      const result = service.getBookSlugFromPath('books/hamlet/images/hamlet-01.png');

      // Verify the result
      expect(mockAssetPathService.getBookSlugFromPath).toHaveBeenCalledWith(
        'books/hamlet/images/hamlet-01.png',
      );
      expect(result).toBe('hamlet');
    });

    it('should handle non-matching paths correctly', () => {
      // Setup the mock
      mockAssetPathService.getBookSlugFromPath.mockReturnValue(null);

      // Call the method
      const result = service.getBookSlugFromPath('something/not-a-book-path/file.txt');

      // Verify the result
      expect(mockAssetPathService.getBookSlugFromPath).toHaveBeenCalledWith(
        'something/not-a-book-path/file.txt',
      );
      expect(result).toBeNull();
    });
  });

  // Test that the singleton instance works properly
  describe('blobPathService singleton', () => {
    it('should be an instance of BlobPathService', () => {
      expect(blobPathService).toBeInstanceOf(BlobPathService);
    });
  });

  // Test integration with real AssetPathService
  describe('integration with real AssetPathService', () => {
    let realService: BlobPathService;

    beforeEach(() => {
      // Create a real service with the real AssetPathService
      realService = new BlobPathService();
    });

    it('should generate paths for book images compatible with old format', () => {
      const result = realService.getBookImagePath('hamlet', 'hamlet-01.png');
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });

    it('should generate paths for brainrot text compatible with old format', () => {
      const result = realService.getBrainrotTextPath('hamlet', '1');
      expect(result).toBe('books/hamlet/text/brainrot-chapter-01.txt');
    });

    it('should generate paths for shared images compatible with old format', () => {
      const result = realService.getSharedImagePath('shared-image.png');
      expect(result).toBe('images/shared-image.png');
    });

    it('should convert legacy paths compatible with old format', () => {
      const result = realService.convertLegacyPath('/assets/hamlet/images/hamlet-01.png');
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });

    it('should generate asset paths for various asset types correctly', () => {
      // Audio asset
      const audioPath = realService.getAssetPath(AssetType.AUDIO, 'hamlet', 'full-audiobook.mp3');
      expect(audioPath).toBe('books/hamlet/audio/full-audiobook.mp3');

      // Image asset
      const imagePath = realService.getAssetPath(AssetType.IMAGE, 'iliad', 'cover.jpg');
      expect(imagePath).toBe('books/iliad/images/cover.jpg');

      // Text asset
      const textPath = realService.getAssetPath(AssetType.TEXT, 'odyssey', 'chapter-01.txt');
      expect(textPath).toBe('books/odyssey/text/chapter-01.txt');
    });
  });
});
