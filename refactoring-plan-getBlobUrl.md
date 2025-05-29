# Refactoring Plan for getBlobUrl.ts

## Complex Function 1: generateBlobUrl (complexity: 12)

### Current Issues:

- Multiple conditional branches and early returns
- Mixed responsibilities (path conversion, caching, URL generation)
- Parameter processing mixed with core logic
- Cache key generation and URL generation in the same function

### Refactoring Approach:

1. **Extract Option Processing Logic:**

   ```typescript
   function processOptions(options: BlobUrlOptions = {}): {
     baseUrl?: string;
     noCache: boolean;
     useBlobStorage: boolean;
     environment: 'development' | 'production';
   } {
     return {
       baseUrl: options.baseUrl,
       noCache: options.noCache || false,
       useBlobStorage: options.useBlobStorage ?? true,
       environment: options.environment || (process.env.NODE_ENV as 'development' | 'production'),
     };
   }
   ```

2. **Extract Path Processing Logic:**

   ```typescript
   function processBlobPath(path: string, useBlobStorage: boolean): string | null {
     // Early return if not using Blob storage for legacy paths
     if (!useBlobStorage && isLegacyPath(path)) {
       return null;
     }

     // If the path starts with 'assets/', it's already in the new format
     if (path.startsWith('assets/')) {
       return path;
     }

     // Convert path if needed
     return convertToBlobPath(path);
   }
   ```

3. **Extract URL Generation Logic:**

   ```typescript
   function constructBlobUrl(path: string, baseUrl: string): string {
     return path.startsWith('http') ? path : `${baseUrl}/${path}`;
   }
   ```

4. **Simplify Main Function:**

   ```typescript
   export function generateBlobUrl(path: string, options: BlobUrlOptions = {}): string {
     // Process options with defaults
     const { baseUrl, noCache, useBlobStorage, environment } = processOptions(options);

     // Check cache if enabled
     const cacheKey = getCacheKey(path, baseUrl, environment, useBlobStorage);
     const cachedUrl = !noCache ? getCachedUrl(cacheKey) : null;
     if (cachedUrl) {
       return cachedUrl;
     }

     // Process the path
     const processedPath = processBlobPath(path, useBlobStorage);
     if (processedPath === null) {
       return path; // Early return for non-blob paths
     }

     // Determine the base URL
     const blobBaseUrl = determineBaseUrl(environment, baseUrl);

     // Generate the full URL
     const url = constructBlobUrl(processedPath, blobBaseUrl);

     // Cache the result if caching is enabled
     if (!noCache) {
       urlCache[cacheKey] = url;
     }

     return url;
   }
   ```

## Complex Function 2: getAssetUrl (complexity: 14)

### Current Issues:

- Long function with multiple code paths
- Complicated conditionals and pattern matching
- Hardcoded book lists and path patterns
- Multiple responsibilities (path checking, mapping, URL construction)

### Refactoring Approach:

1. **Extract Book Format Checking:**

   ```typescript
   function isBookInNewFormat(bookSlug: string): boolean {
     const comingSoonBooksInNewFormat = [
       'pride-and-prejudice',
       'paradise-lost',
       'meditations',
       // ...other books
     ];

     return comingSoonBooksInNewFormat.includes(bookSlug);
   }
   ```

2. **Extract Path Type Classification:**

   ```typescript
   type PathType = 'mapped' | 'coming-soon' | 'assets-text' | 'book-text' | 'book-images' | 'other';

   function classifyPath(
     path: string,
     mappedPath: string,
   ): {
     type: PathType;
     bookSlug?: string;
     pathWithoutPrefix?: string;
   } {
     // If we got a direct mapping, it's a mapped path
     if (mappedPath !== path) {
       return { type: 'mapped' };
     }

     // Check if this is a coming soon book in the new format
     const comingSoonMatch = path.match(/^\/assets\/([^/]+)\/images\/[^/]+\.(png|jpg|jpeg)$/);
     if (comingSoonMatch) {
       const bookSlug = comingSoonMatch[1];
       if (isBookInNewFormat(bookSlug)) {
         return { type: 'coming-soon', bookSlug };
       }
     }

     // Check for assets path patterns
     if (path.startsWith('/assets/')) {
       const pathWithoutAssets = path.substring('/assets/'.length);

       if (pathWithoutAssets.startsWith('text/')) {
         return { type: 'assets-text', pathWithoutPrefix: pathWithoutAssets };
       }

       if (pathWithoutAssets.match(/^[^/]+\/text\//)) {
         return { type: 'book-text', pathWithoutPrefix: pathWithoutAssets };
       }

       if (pathWithoutAssets.match(/^[^/]+\/images?\//)) {
         return { type: 'book-images', pathWithoutPrefix: pathWithoutAssets };
       }

       return { type: 'other', pathWithoutPrefix: pathWithoutAssets };
     }

     return { type: 'other' };
   }
   ```

3. **Extract URL Generation for Different Path Types:**

   ```typescript
   function generateUrlForPathType(
     pathType: PathType,
     path: string,
     mappedPath: string,
     baseUrl?: string,
     bookSlug?: string,
     pathWithoutPrefix?: string,
   ): string {
     const finalBaseUrl = baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

     switch (pathType) {
       case 'mapped':
         return `${finalBaseUrl}/${mappedPath}`;

       case 'coming-soon':
         // Remove leading slash and return directly
         return `${finalBaseUrl}/${path.substring(1)}`;

       case 'assets-text':
       case 'book-text':
       case 'book-images':
       case 'other':
         // Convert to standard blob path
         const blobPath = blobPathService.convertLegacyPath(path);
         return `${finalBaseUrl}/${blobPath}`;

       default:
         // Use generateBlobUrl as fallback
         return generateBlobUrl(path, { baseUrl, useBlobStorage: true });
     }
   }
   ```

4. **Simplify Main Function:**

   ```typescript
   export function getAssetUrl(
     legacyPath: string,
     useBlobStorage: boolean = true,
     options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
   ): string {
     if (!useBlobStorage) {
       return legacyPath;
     }

     // Apply asset path mapping first to handle known discrepancies
     const mappedPath = mapAssetPath(legacyPath);

     // Classify the path to determine handling strategy
     const { type, bookSlug, pathWithoutPrefix } = classifyPath(legacyPath, mappedPath);

     // Generate URL based on path type
     return generateUrlForPathType(
       type,
       legacyPath,
       mappedPath,
       options.baseUrl,
       bookSlug,
       pathWithoutPrefix,
     );
   }
   ```

## Complex Function 3: fetchTextWithFallback (complexity: 12)

### Current Issues:

- Many conditional branches for different cases
- Multiple try-catch blocks with duplicated error handling
- Excessive logging
- Deep nesting of if-else statements

### Refactoring Approach:

1. **Extract URL Handling Logic:**

   ```typescript
   async function fetchFromDirectUrl(url: string, log: Logger): Promise<string> {
     moduleLogger.info({
       msg: 'Attempting to fetch text from URL',
       url,
     });

     try {
       const response = await fetch(url);
       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
       const textContent = await response.text();

       moduleLogger.info({
         msg: 'Successfully fetched text from URL',
         url,
       });

       return textContent;
     } catch (error) {
       moduleLogger.error({
         msg: 'Failed to fetch text from URL',
         url,
         error: error instanceof Error ? error.message : String(error),
       });
       throw error;
     }
   }
   ```

2. **Extract Standardized Path Fetching:**

   ```typescript
   async function fetchFromStandardizedPath(
     standardizedPath: string,
     standardizedBlobUrl: string,
     legacyPath: string,
     log: Logger,
   ): Promise<string> {
     moduleLogger.info({
       msg: 'Attempting to fetch text from standardized path',
       legacyPath,
       standardizedPath,
       standardizedBlobUrl,
     });

     try {
       const textContent = await blobService.fetchText(standardizedBlobUrl);

       moduleLogger.info({
         msg: 'Successfully fetched text from standardized path',
         standardizedPath,
       });

       return textContent;
     } catch (error) {
       moduleLogger.warn({
         msg: 'Failed to fetch from standardized path, falling back to legacy path',
         standardizedPath,
         legacyPath,
         error: error instanceof Error ? error.message : String(error),
       });

       throw error;
     }
   }
   ```

3. **Extract Legacy Path Fallback:**

   ```typescript
   async function fetchFromLegacyPath(
     legacyPath: string,
     baseUrl?: string,
     log: Logger,
   ): Promise<string> {
     // Normalize legacy URL if needed
     const normalizedPath = normalizeLegacyUrl(legacyPath, baseUrl);

     try {
       // If it's already a full URL after normalization, use it directly
       if (normalizedPath.startsWith('http')) {
         moduleLogger.info({
           msg: `Fetching text from normalized legacy URL: ${normalizedPath}`,
           operation: 'fetch_text_legacy',
           source: 'normalized_legacy_url',
           url: normalizedPath,
         });

         const textContent = await blobService.fetchText(normalizedPath);
         logLegacyFetchSuccess(legacyPath);
         return textContent;
       } else {
         // Otherwise try as a local path
         moduleLogger.info({
           msg: `Fetching text from local path: ${normalizedPath}`,
           operation: 'fetch_text_local',
           source: 'local_path',
           path: normalizedPath,
         });

         const response = await fetch(normalizedPath);
         if (!response.ok) {
           throw new Error(`HTTP error! Status: ${response.status}`);
         }

         const textContent = await response.text();
         logLegacyFetchSuccess(legacyPath);
         return textContent;
       }
     } catch (error) {
       moduleLogger.error({
         msg: 'Failed to fetch from legacy path as well',
         legacyPath,
         error: error instanceof Error ? error.message : String(error),
       });

       throw error;
     }
   }
   ```

4. **Simplify Main Function:**

   ```typescript
   export async function fetchTextWithFallback(
     legacyPath: string,
     options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
   ): Promise<string> {
     try {
       // Check if this is already a full URL (not a path)
       if (legacyPath.startsWith('http://') || legacyPath.startsWith('https://')) {
         return await fetchFromDirectUrl(legacyPath, moduleLogger);
       }

       // Try the standardized path first
       const standardizedPath = blobPathService.convertLegacyPath(legacyPath);
       const standardizedBlobUrl = blobService.getUrlForPath(standardizedPath, {
         baseUrl: options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL,
         noCache: options.noCache,
       });

       try {
         return await fetchFromStandardizedPath(
           standardizedPath,
           standardizedBlobUrl,
           legacyPath,
           moduleLogger,
         );
       } catch (standardError) {
         // Fall back to legacy path
         return await fetchFromLegacyPath(
           legacyPath,
           process.env.NEXT_PUBLIC_BLOB_BASE_URL,
           moduleLogger,
         );
       }
     } catch (error) {
       moduleLogger.error({
         msg: `All fetch attempts failed for: ${legacyPath}`,
         operation: 'fetch_text_failed',
         legacyPath,
         error: error instanceof Error ? error.message : String(error),
       });

       throw new Error(
         `Failed to fetch text: ${error instanceof Error ? error.message : String(error)}`,
       );
     }
   }
   ```

By implementing these refactorings, we can significantly reduce the cyclomatic complexity of all three functions in getBlobUrl.ts, making them more maintainable and easier to understand.
