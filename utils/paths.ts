/**
 * Path resolution utilities for consistent module loading across environments
 *
 * These utilities handle import.meta.url usage and path resolution in a
 * standardized way that works across development, production, and test environments.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gets the directory name of the current module
 * Works in both ESM and CommonJS environments
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns The directory path of the current module
 */
export function getDirname(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * Gets the filename of the current module
 * Works in both ESM and CommonJS environments
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns The filename of the current module
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * Resolves a path relative to the current module
 * Works in both ESM and CommonJS environments
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @param relativePath - Path relative to the current module
 * @returns Absolute path to the target file/directory
 */
export function resolveFromModule(importMetaUrl: string, relativePath: string): string {
  return path.resolve(getDirname(importMetaUrl), relativePath);
}

/**
 * Check if this module is being run directly (not imported)
 * Handles various execution scenarios including tsx, node, and jest
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns True if the module is being executed directly
 */
export function isMainModule(importMetaUrl: string): boolean {
  // Get the script path from process.argv[1]
  const scriptPath = process.argv[1];

  if (!scriptPath) {
    return false;
  }

  // Normalize paths for comparison
  const currentModulePath = fileURLToPath(importMetaUrl);

  // Direct comparison for exact matches
  if (currentModulePath === scriptPath) {
    return true;
  }

  // Handle file:// URLs
  const normalizedScriptPath = scriptPath.startsWith('file://')
    ? fileURLToPath(scriptPath)
    : scriptPath;

  // Compare normalized paths
  if (currentModulePath === normalizedScriptPath) {
    return true;
  }

  // Handle cases where scriptPath might be relative
  const resolvedScriptPath = path.resolve(normalizedScriptPath);
  if (currentModulePath === resolvedScriptPath) {
    return true;
  }

  // For tsx execution, the script path might end with the module path
  if (normalizedScriptPath.endsWith(currentModulePath.replace(process.cwd(), ''))) {
    return true;
  }

  return false;
}

/**
 * Resolves a path relative to the project root
 *
 * @param relativePath - Path relative to project root
 * @returns Absolute path from project root
 */
export function resolveFromRoot(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Creates a standardized __dirname equivalent for ESM modules
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns Directory name (equivalent to CommonJS __dirname)
 */
export function createDirname(importMetaUrl: string): string {
  return getDirname(importMetaUrl);
}

/**
 * Creates a standardized __filename equivalent for ESM modules
 *
 * @param importMetaUrl - The import.meta.url from the calling module
 * @returns Filename (equivalent to CommonJS __filename)
 */
export function createFilename(importMetaUrl: string): string {
  return getFilename(importMetaUrl);
}

/**
 * Utility to get relative path from project root
 * Useful for logging and debugging
 *
 * @param absolutePath - Absolute path to convert
 * @returns Path relative to project root
 */
export function getRelativeFromRoot(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath);
}

export default {
  getDirname,
  getFilename,
  resolveFromModule,
  isMainModule,
  resolveFromRoot,
  createDirname,
  createFilename,
  getRelativeFromRoot,
};
