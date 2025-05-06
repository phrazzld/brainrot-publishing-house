import { AssetType } from '../../../types/assets';
import { AssetPathService } from '../../../utils/services/AssetPathService';

describe('AssetPathService', () => {
  let service: AssetPathService;

  beforeEach(() => {
    service = new AssetPathService();
  });

  describe('getAssetPath', () => {
    it('should generate a path for a book-specific asset', () => {
      const path = service.getAssetPath(AssetType.AUDIO, 'the-iliad', 'chapter-01.mp3');
      expect(path).toBe('assets/audio/the-iliad/chapter-01.mp3');
    });

    it('should generate a path for a shared asset', () => {
      const path = service.getAssetPath('shared', null, 'logo.png');
      expect(path).toBe('assets/shared/logo.png');
    });

    it('should generate a path for a site asset', () => {
      const path = service.getAssetPath('site', null, 'icon.svg');
      expect(path).toBe('assets/site/icon.svg');
    });
  });

  describe('getAudioPath', () => {
    it('should generate a path for a chapter audio file', () => {
      const path = service.getAudioPath('the-odyssey', 5);
      expect(path).toBe('assets/audio/the-odyssey/chapter-05.mp3');
    });

    it('should generate a path for a full audiobook', () => {
      const path = service.getAudioPath('hamlet', 'full');
      expect(path).toBe('assets/audio/hamlet/full-audiobook.mp3');
    });

    it('should pad single-digit chapter numbers', () => {
      const path = service.getAudioPath('the-iliad', '1');
      expect(path).toBe('assets/audio/the-iliad/chapter-01.mp3');
    });
  });

  describe('getBrainrotTextPath', () => {
    it('should generate a path for a brainrot chapter text file', () => {
      const path = service.getBrainrotTextPath('macbeth', 3);
      expect(path).toBe('assets/text/macbeth/brainrot-chapter-03.txt');
    });

    it('should generate a path for a full brainrot text', () => {
      const path = service.getBrainrotTextPath('othello', 'full');
      expect(path).toBe('assets/text/othello/brainrot-fulltext.txt');
    });

    it('should handle fulltext as a chapter identifier', () => {
      const path = service.getBrainrotTextPath('othello', 'fulltext');
      expect(path).toBe('assets/text/othello/brainrot-fulltext.txt');
    });
  });

  describe('getSourceTextPath', () => {
    it('should generate a path for a source chapter text file', () => {
      const path = service.getSourceTextPath('romeo-and-juliet', '2');
      expect(path).toBe('assets/text/romeo-and-juliet/source-chapter-02.txt');
    });

    it('should handle non-chapter filenames', () => {
      const path = service.getSourceTextPath('beowulf', 'introduction.txt');
      expect(path).toBe('assets/text/beowulf/source-introduction.txt');
    });

    it('should handle fulltext source files', () => {
      const path = service.getSourceTextPath('beowulf', 'fulltext');
      expect(path).toBe('assets/text/beowulf/source-fulltext.txt');
    });
  });

  describe('getBookImagePath', () => {
    it('should generate a path for a book image', () => {
      const path = service.getBookImagePath('king-lear', 'cover.jpg');
      expect(path).toBe('assets/image/king-lear/cover.jpg');
    });

    it('should generate a path for a chapter image', () => {
      const path = service.getBookImagePath('midsummer-nights-dream', 'chapter-05.jpg');
      expect(path).toBe('assets/image/midsummer-nights-dream/chapter-05.jpg');
    });
  });

  describe('getSharedImagePath', () => {
    it('should generate a path for a shared image', () => {
      const path = service.getSharedImagePath('publisher-logo.png');
      expect(path).toBe('assets/shared/publisher-logo.png');
    });

    it('should generate a path for a categorized shared image', () => {
      const path = service.getSharedImagePath('twitter.svg', 'social');
      expect(path).toBe('assets/shared/social/twitter.svg');
    });
  });

  describe('getSiteAssetPath', () => {
    it('should generate a path for a site asset', () => {
      const path = service.getSiteAssetPath('favicon.ico');
      expect(path).toBe('assets/site/favicon.ico');
    });

    it('should generate a path for a categorized site asset', () => {
      const path = service.getSiteAssetPath('download.svg', 'icons');
      expect(path).toBe('assets/site/icons/download.svg');
    });
  });
});
