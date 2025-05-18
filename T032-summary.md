# T032: Standardize text file naming and paths - Summary

## Objective

Fix naming inconsistencies for text files in the Brainrot Publishing House, including:

- Book slug naming (e.g., "the-adventures-of-huckleberry-finn" vs "huckleberry-finn")
- Chapter numbering format (Roman numerals vs Arabic numerals)
- Path structure standardization

## Implementation

### 1. Enhanced Core Services

- **AssetNameValidator**: Added `standardizeChapterIdentifier()` method for Roman numeral conversion
- **AssetPathService**: Added `convertLegacyPath()` and `convertTextFilePath()` for path standardization
- **Comprehensive test coverage** for both services

### 2. Documentation

- Created `docs/UNIFIED_ASSET_NAMING.md` documenting naming conventions
- Standardized format: `assets/text/{book-slug}/brainrot-{normalized-identifier}.txt`

### 3. Migration Script

- Created `scripts/standardizeTextFilesBlob.ts` for blob storage migration
- Handles multiple input sources (migration JSONs, translations)
- Supports dry-run mode, selective book processing, and detailed logging

### 4. Fallback Mechanism

- Enhanced `utils/getBlobUrl.ts` with `fetchTextWithFallback()` function
- Automatically tries standardized path first, falls back to legacy if needed
- Ensures backward compatibility during transition

### 5. NPM Scripts Added

```json
"standardize:text:blob": "tsx scripts/standardizeTextFilesBlob.ts"
"standardize:text:blob:dry": "tsx scripts/standardizeTextFilesBlob.ts --dry-run"
"standardize:text:blob:verbose": "tsx scripts/standardizeTextFilesBlob.ts --dry-run --log-file=text-standardization-blob-dry-run.log"
```

## Results

Dry run on Hamlet found 13 text files to standardize:

- Roman numeral acts converted to Arabic (act-i → act-01)
- Paths standardized from `books/hamlet/text/brainrot/` to `assets/text/hamlet/brainrot-`
- All tests passing, ready for production migration

## Next Steps

1. Run the actual migration (not dry-run) to copy files to standardized locations
2. Test the fallback mechanism in development
3. Update translations if needed after migration is complete
4. Remove legacy files after transition period
