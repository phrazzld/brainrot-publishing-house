# Unified Asset Naming Conventions

This document defines the standardized naming conventions for all assets in the Brainrot Publishing House application, with a focus on text files and their path structures.

## Book Slugs

All book slugs must follow these conventions:

- **Format**: Lowercase kebab-case
- **No articles**: Remove "the", "a", "an" from the beginning
- **Examples**:
  - `huckleberry-finn` (not `the-adventures-of-huckleberry-finn`)
  - `iliad` (not `the-iliad`)
  - `declaration-of-independence`

### Slug Mapping

The following mappings are canonical:

- `the-adventures-of-huckleberry-finn` → `huckleberry-finn`
- `the-iliad` → `iliad`
- `the-odyssey` → `odyssey`
- `the-aeneid` → `aeneid`

## Text Files

### Standard Filename Format

All text files must follow this structure:

- **Pattern**: `brainrot-{type}-{number}.txt`
- **Prefix**: Always `brainrot-`
- **Type**: One of:
  - `chapter` - For books divided into chapters
  - `act` - For plays (like Hamlet)
  - `part` - For books divided into parts
  - `scene` - For subdivisions within acts
- **Number**: Two-digit zero-padded Arabic numerals (01, 02, ..., 99)
- **Extension**: Always `.txt`

### Examples

- `brainrot-chapter-01.txt` (Chapter 1)
- `brainrot-chapter-15.txt` (Chapter 15)
- `brainrot-act-03.txt` (Act 3)
- `brainrot-part-02.txt` (Part 2)

### Special Cases

- **Single-file books**: Use `brainrot-fulltext.txt`
- **Books with mixed divisions**: Use the primary division type
- **Prologues/Epilogues**: Use `brainrot-prologue.txt` and `brainrot-epilogue.txt`

## Path Structure

### Standard Vercel Blob Path

All text assets in Vercel Blob storage must follow this structure:

```
assets/text/{book-slug}/{filename}.txt
```

### Examples

- `assets/text/huckleberry-finn/brainrot-chapter-01.txt`
- `assets/text/hamlet/brainrot-act-03.txt`
- `assets/text/the-raven/brainrot-fulltext.txt`

## Legacy Path Conversions

### Common Legacy Patterns

The following legacy patterns will be converted:

1. **Book slug variations**:
   - `/assets/the-adventures-of-huckleberry-finn/...` → `/assets/huckleberry-finn/...`
2. **Roman numerals**:
   - `chapter-i.txt` → `brainrot-chapter-01.txt`
   - `act-v.txt` → `brainrot-act-05.txt`
3. **Inconsistent prefixes**:
   - `Chapter 1.txt` → `brainrot-chapter-01.txt`
   - `01-prologue.txt` → `brainrot-prologue.txt`
4. **Path variations**:
   - `/assets/{book}/text/...` → `assets/text/{book}/...`
   - `/assets/text/{book}/brainrot/...` → `assets/text/{book}/...`

## Audio Files

### Standard Filename Format

Audio files follow a similar pattern:

- **Pattern**: `{type}-{number}.mp3`
- **Type**: `chapter`, `act`, `part`, `full-audiobook`
- **Number**: Two-digit zero-padded Arabic numerals
- **Extension**: Always `.mp3`

### Examples

- `chapter-01.mp3`
- `act-02.mp3`
- `full-audiobook.mp3`

### Standard Path

```
assets/audio/{book-slug}/{filename}.mp3
```

## Image Files

### Book Covers

- **Pattern**: `{book-slug}.jpg` or `{book-slug}.png`
- **Path**: `assets/covers/{filename}`

### Chapter Images

- **Pattern**: `{book-slug}-{number}.png`
- **Path**: `assets/{book-slug}/images/{filename}`

## Implementation Notes

### AssetPathService

The `AssetPathService` class is responsible for:

- Converting legacy paths to standard paths
- Generating new paths following these conventions
- Normalizing book slugs

### AssetNameValidator

The `AssetNameValidator` utility provides:

- Roman numeral to Arabic conversion
- Number padding functions
- Path validation against these conventions

## Migration Strategy

1. **Phase 1**: Implement path conversion logic
2. **Phase 2**: Create migration script for existing files
3. **Phase 3**: Update application to use fallback loading
4. **Phase 4**: Complete migration and remove legacy paths

## Version History

- **v1.0.0** (2025-01-18): Initial standardization document
