import { BlobPathService, blobPathService } from '../../../utils/services/BlobPathService';

describe('BlobPathService', () => {
  let service: BlobPathService;
  
  beforeEach(() => {
    service = new BlobPathService();
  });
  
  describe('getBookImagePath', () => {
    it('should generate correct path for book images', () => {
      const result = service.getBookImagePath('hamlet', 'hamlet-01.png');
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });
    
    it('should handle special characters in filenames', () => {
      const result = service.getBookImagePath('the-iliad', 'image with spaces & special chars!.png');
      expect(result).toBe('books/the-iliad/images/image with spaces & special chars!.png');
    });
  });
  
  describe('getBrainrotTextPath', () => {
    it('should generate correct path for brainrot text files', () => {
      const result = service.getBrainrotTextPath('hamlet', 'act-i');
      expect(result).toBe('books/hamlet/text/brainrot/act-i.txt');
    });
  });
  
  describe('getFulltextPath', () => {
    it('should generate correct path for fulltext files', () => {
      const result = service.getFulltextPath('hamlet');
      expect(result).toBe('books/hamlet/text/brainrot/fulltext.txt');
    });
  });
  
  describe('getSourceTextPath', () => {
    it('should generate correct path for source text files', () => {
      const result = service.getSourceTextPath('hamlet', 'source.txt');
      expect(result).toBe('books/hamlet/text/source/source.txt');
    });
  });
  
  describe('getSharedImagePath', () => {
    it('should generate correct path for shared images', () => {
      const result = service.getSharedImagePath('shared-image.png');
      expect(result).toBe('images/shared-image.png');
    });
  });
  
  describe('getSiteAssetPath', () => {
    it('should generate correct path for site assets', () => {
      const result = service.getSiteAssetPath('logo.svg');
      expect(result).toBe('site-assets/logo.svg');
    });
  });
  
  describe('getAudioPath', () => {
    it('should generate correct path for audio files', () => {
      const result = service.getAudioPath('hamlet', 'act-i');
      expect(result).toBe('books/hamlet/audio/act-i.mp3');
    });
  });
  
  describe('convertLegacyPath', () => {
    it('should convert shared images path correctly', () => {
      const legacyPath = '/assets/images/shared-image.png';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('images/shared-image.png');
    });
    
    it('should convert book assets path correctly', () => {
      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('books/hamlet/images/hamlet-01.png');
    });
    
    it('should convert audio files path correctly', () => {
      const legacyPath = '/hamlet/audio/act-i.mp3';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('books/hamlet/audio/act-i.mp3');
    });
    
    it('should handle paths with no pattern match', () => {
      const legacyPath = '/something/unknown/path.txt';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('something/unknown/path.txt');
    });
    
    it('should handle paths with nested directories', () => {
      const legacyPath = '/assets/the-republic/text/brainrot/nested/folder/file.txt';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('books/the-republic/text/brainrot/nested/folder/file.txt');
    });
    
    it('should handle paths with special characters', () => {
      const legacyPath = '/assets/the-republic/text/file with spaces & symbols!.txt';
      const result = service.convertLegacyPath(legacyPath);
      expect(result).toBe('books/the-republic/text/file with spaces & symbols!.txt');
    });
  });
  
  describe('getBookSlugFromPath', () => {
    it('should extract book slug from blob path', () => {
      const path = 'books/hamlet/images/hamlet-01.png';
      const result = service.getBookSlugFromPath(path);
      expect(result).toBe('hamlet');
    });
    
    it('should extract book slug from legacy asset path', () => {
      const path = '/assets/the-iliad/images/iliad-01.png';
      const result = service.getBookSlugFromPath(path);
      expect(result).toBe('the-iliad');
    });
    
    it('should extract book slug from legacy audio path', () => {
      const path = '/the-odyssey/audio/book-01.mp3';
      const result = service.getBookSlugFromPath(path);
      expect(result).toBe('the-odyssey');
    });
    
    it('should return null for non-matching path', () => {
      const path = 'something/not-a-book-path/file.txt';
      const result = service.getBookSlugFromPath(path);
      expect(result).toBeNull();
    });
  });
});