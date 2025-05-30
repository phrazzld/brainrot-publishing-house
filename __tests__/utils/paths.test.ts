/**
 * Tests for path utilities
 */
import * as path from 'path';

import {
  getDirname,
  getFilename,
  getRelativeFromRoot,
  isMainModule,
  resolveFromModule,
  resolveFromRoot,
} from '../../utils/paths.js';

describe('Path Utilities', () => {
  const mockImportMetaUrl = 'file:///Users/test/project/utils/test.ts';
  const expectedDirname = '/Users/test/project/utils';
  const expectedFilename = '/Users/test/project/utils/test.ts';

  describe('getDirname', () => {
    it('should return the directory name from import.meta.url', () => {
      const result = getDirname(mockImportMetaUrl);
      expect(result).toBe(expectedDirname);
    });

    it('should handle Windows-style paths', () => {
      const windowsUrl = 'file:///C:/Users/test/project/utils/test.ts';
      const result = getDirname(windowsUrl);
      // On Windows this would be 'C:\\Users\\test\\project\\utils'
      // On Unix-like systems it would be '/C:/Users/test/project/utils'
      expect(result).toContain('Users/test/project/utils');
    });
  });

  describe('getFilename', () => {
    it('should return the filename from import.meta.url', () => {
      const result = getFilename(mockImportMetaUrl);
      expect(result).toBe(expectedFilename);
    });
  });

  describe('resolveFromModule', () => {
    it('should resolve a relative path from the module directory', () => {
      const relativePath = '../config/settings.json';
      const result = resolveFromModule(mockImportMetaUrl, relativePath);
      const expected = path.resolve(expectedDirname, relativePath);
      expect(result).toBe(expected);
    });

    it('should handle current directory references', () => {
      const relativePath = './helper.ts';
      const result = resolveFromModule(mockImportMetaUrl, relativePath);
      const expected = path.resolve(expectedDirname, relativePath);
      expect(result).toBe(expected);
    });

    it('should handle parent directory references', () => {
      const relativePath = '../../package.json';
      const result = resolveFromModule(mockImportMetaUrl, relativePath);
      const expected = path.resolve(expectedDirname, relativePath);
      expect(result).toBe(expected);
    });
  });

  describe('isMainModule', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should return true when the module is being run directly', () => {
      process.argv = ['node', expectedFilename];
      const result = isMainModule(mockImportMetaUrl);
      expect(result).toBe(true);
    });

    it('should return false when the module is being imported', () => {
      process.argv = ['node', '/some/other/file.ts'];
      const result = isMainModule(mockImportMetaUrl);
      expect(result).toBe(false);
    });

    it('should handle file:// URLs in process.argv', () => {
      process.argv = ['node', `file://${expectedFilename}`];
      const result = isMainModule(mockImportMetaUrl);
      expect(result).toBe(true);
    });

    it('should return false when process.argv[1] is undefined', () => {
      process.argv = ['node'];
      const result = isMainModule(mockImportMetaUrl);
      expect(result).toBe(false);
    });
  });

  describe('resolveFromRoot', () => {
    it('should resolve a path from the project root', () => {
      const relativePath = 'src/components/Button.tsx';
      const result = resolveFromRoot(relativePath);
      const expected = path.resolve(process.cwd(), relativePath);
      expect(result).toBe(expected);
    });

    it('should handle paths that start with ./', () => {
      const relativePath = './src/utils/helper.ts';
      const result = resolveFromRoot(relativePath);
      const expected = path.resolve(process.cwd(), relativePath);
      expect(result).toBe(expected);
    });
  });

  describe('getRelativeFromRoot', () => {
    it('should return the relative path from project root', () => {
      const absolutePath = path.join(process.cwd(), 'src', 'components', 'Button.tsx');
      const result = getRelativeFromRoot(absolutePath);
      expect(result).toBe(path.join('src', 'components', 'Button.tsx'));
    });

    it('should handle paths outside the project root', () => {
      const absolutePath = '/some/external/path/file.txt';
      const result = getRelativeFromRoot(absolutePath);
      expect(result).toContain('..'); // Should contain .. to go up from project root
    });

    it('should handle the project root itself', () => {
      const result = getRelativeFromRoot(process.cwd());
      expect(result).toBe('');
    });
  });
});
