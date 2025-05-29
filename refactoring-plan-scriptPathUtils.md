# Refactoring Plan for ScriptPathUtils.ts

## Complex Function: extractAssetInfo (complexity: 13)

### Current Issues:
- Multiple responsibilities (path analysis, normalization, metadata extraction)
- Complex conditional checks and nested pattern matching
- Heavy use of regular expressions
- Metadata population spread throughout the function

### Refactoring Approach:

1. **Split into Smaller Functions:**
   - Create a separate function for metadata extraction: `extractAssetMetadata()`
   - Create a function for handling special cases: `handleSpecialAssetCases()`
   - Create a function for path component extraction: `extractPathComponents()`

2. **Implement Clearer Path Component Extraction:**
   ```typescript
   function extractPathComponents(normalizedPath: string): {
     assetType: string;
     bookOrCategory: string | null;
     filename: string;
   } | null {
     // Extract components using regex
     const match = normalizedPath.match(/^assets\/([^/]+)\/(?:([^/]+)\/)?(.+)$/);
     if (!match) return null;
     
     const [, assetType, bookOrCategory, filename] = match;
     return { assetType, bookOrCategory, filename };
   }
   ```

3. **Extract Metadata Extraction Logic:**
   ```typescript
   function extractAssetMetadata(
     filename: string, 
     assetType: string
   ): {
     chapterNumber?: string | number;
     assetCategory?: string;
   } {
     const metadata: Record<string, unknown> = {};
     
     // Handle chapter files
     const chapterMatch = filename.match(/(?:brainrot-)?(?:chapter|act)-(\d+)\./);
     if (chapterMatch) {
       return {
         chapterNumber: chapterMatch[1],
         assetCategory: filename.startsWith('brainrot-') ? 'brainrot' : 'chapter'
       };
     }
     
     // Handle special file types
     if (filename === 'cover.jpg') {
       return { assetCategory: 'cover' };
     }
     
     // Other cases...
     
     return metadata;
   }
   ```

4. **Simplify Main Function:**
   ```typescript
   export function extractAssetInfo(path: string): AssetPathInfo {
     // Normalize the path
     const normalizedPath = normalizePath(path);
     
     // Initialize with default values
     const result: AssetPathInfo = {
       originalPath: path,
       normalizedPath,
       assetType: 'unknown',
       bookSlug: null,
       filename: path.split('/').pop() || '',
       isLegacyFormat: isLegacyPath(path),
       metadata: {},
     };
     
     // Extract path components
     const components = extractPathComponents(normalizedPath);
     if (!components) {
       logUnrecognizedPath(path, normalizedPath);
       return result;
     }
     
     // Update result with components
     result.assetType = components.assetType as AssetType | 'shared' | 'site' | 'unknown';
     
     // Handle different asset types differently
     if (components.assetType === 'shared' || components.assetType === 'site') {
       return handleSharedOrSiteAsset(result, components);
     }
     
     // Process book-specific assets
     return handleBookSpecificAsset(result, components);
   }
   ```

## Complex Function: generateFilename (complexity: 15)

### Current Issues:
- Multiple distinct cases handled in a single function
- Many conditional branches for different asset types
- Special case handling mixed with general logic

### Refactoring Approach:

1. **Extract Special Case Handlers:**
   ```typescript
   function generateCoverFilename(extension?: string): string {
     return `cover.${extension || getFileExtension(AssetType.IMAGE, 'cover')}`;
   }
   
   function generateFullAudioFilename(): string {
     return `full-audiobook.${getFileExtension(AssetType.AUDIO)}`;
   }
   
   function generateFullTextFilename(prefix?: string, extension?: string): string {
     const prefixPart = prefix ? `${prefix}-` : '';
     return `${prefixPart}fulltext.${extension || getFileExtension(AssetType.TEXT)}`;
   }
   ```

2. **Extract Chapter Filename Formatting:**
   ```typescript
   function formatChapterFilename(
     identifier: string | number,
     prefix?: string,
     extension?: string,
     assetType: AssetType = AssetType.AUDIO
   ): string {
     const formattedIdentifier = formatChapterIdentifier(identifier);
     const prefixPart = prefix ? `${prefix}-` : '';
     const ext = extension || getFileExtension(assetType);
     
     return `${prefixPart}chapter-${formattedIdentifier}.${ext}`;
   }
   
   function formatChapterIdentifier(identifier: string | number): string {
     if (typeof identifier === 'number' || /^\d+$/.test(String(identifier))) {
       return assetNameValidator.formatChapterNumber(identifier);
     }
     return String(identifier);
   }
   ```

3. **Simplify Main Function Using Type-Based Dispatching:**
   ```typescript
   export function generateFilename(
     assetType: AssetType,
     identifier: string | number,
     options: FilenameOptions = {},
   ): string {
     const { prefix, extension } = options;
     
     // Handle special identifiers
     if (identifier === 'cover' && assetType === AssetType.IMAGE) {
       return generateCoverFilename(extension);
     }
     
     if (identifier === 'full' || identifier === 'fulltext') {
       if (assetType === AssetType.AUDIO) {
         return generateFullAudioFilename();
       }
       return generateFullTextFilename(prefix, extension);
     }
     
     // Default case: chapter files
     return formatChapterFilename(identifier, prefix, extension, assetType);
   }
   ```

By implementing these refactorings, we'll reduce the cyclomatic complexity of both functions significantly while making the code more maintainable and easier to understand.