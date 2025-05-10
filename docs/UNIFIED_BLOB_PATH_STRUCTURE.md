# Unified Blob Path Structure

## Overview

This document defines the standardized path structure for all assets stored in Vercel Blob storage. The goal is to create a consistent, predictable, and maintainable path structure that eliminates the current inconsistencies between different asset types and access patterns.

## Path Structure

All assets will follow this unified path structure:

```
assets/[type]/[book-slug]/[asset-name]
```

Where:

- `assets/` is the root prefix for all asset types
- `[type]` is the asset category (audio, text, image)
- `[book-slug]` is the book identifier
- `[asset-name]` is the specific asset file name

### Asset Types

| Type   | Description             | Example Path                             |
| ------ | ----------------------- | ---------------------------------------- |
| audio  | Audio files (MP3)       | `assets/audio/the-iliad/chapter-01.mp3`  |
| text   | Text content files      | `assets/text/the-odyssey/chapter-03.txt` |
| image  | Images (PNG, JPG, etc.) | `assets/image/hamlet/cover.jpg`          |
| shared | Shared assets           | `assets/shared/logos/publisher-logo.png` |
| site   | Site-wide assets        | `assets/site/icons/download-icon.svg`    |

### Naming Conventions

#### Audio Files

- Chapter audio: `chapter-[padded-number].mp3` (e.g., `chapter-01.mp3`, `chapter-02.mp3`)
- Full audiobook: `full-audiobook.mp3`

#### Text Files

- Brainrot text chapters: `brainrot-chapter-[padded-number].txt`
- Source text chapters: `source-chapter-[padded-number].txt`
- Full brainrot text: `brainrot-fulltext.txt`
- Full source text: `source-fulltext.txt`

#### Image Files

- Cover images: `cover.jpg`
- Chapter images: `chapter-[padded-number].[extension]`
- Thumbnails: `thumbnail.[extension]`

### Chapter Numbering

All chapter numbers will be padded with leading zeros to ensure consistent sorting:

- Single-digit chapters: `01`, `02`, ..., `09`
- Double-digit chapters: `10`, `11`, ..., `99`

## Migration Mapping

The following table shows how current paths will map to the new structure:

| Current Path Pattern                            | New Path Pattern                                            |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `books/${slug}/images/${filename}`              | `assets/image/${slug}/${filename}`                          |
| `books/${slug}/text/brainrot/${chapter}.txt`    | `assets/text/${slug}/brainrot-chapter-${paddedChapter}.txt` |
| `books/${slug}/text/brainrot/fulltext.txt`      | `assets/text/${slug}/brainrot-fulltext.txt`                 |
| `books/${slug}/text/source/${filename}`         | `assets/text/${slug}/source-${filename}`                    |
| `images/${filename}`                            | `assets/shared/${filename}`                                 |
| `site-assets/${filename}`                       | `assets/site/${filename}`                                   |
| `books/${slug}/audio/${chapter}.mp3`            | `assets/audio/${slug}/chapter-${paddedChapter}.mp3`         |
| `${slug}/audio/${chapter}.mp3` (legacy DO path) | `assets/audio/${slug}/chapter-${paddedChapter}.mp3`         |

## Path Resolution Rules

1. **No Leading Slashes**: Paths should never begin with a leading slash when stored or retrieved
2. **Consistent Casing**: All path segments should use kebab-case (lowercase with hyphens)
3. **Path Normalization**: Any path manipulation should normalize paths to follow these conventions

## Special Cases

### Shared Resources

Shared resources that aren't specific to a book will be stored in the `assets/shared/` directory:

```
assets/shared/[category]/[asset-name]
```

Example: `assets/shared/logos/publisher-logo.png`

### Site Assets

Assets related to the site UI rather than content will be stored in the `assets/site/` directory:

```
assets/site/[category]/[asset-name]
```

Example: `assets/site/icons/download-icon.svg`

## Implementation Notes

1. **Addressing the "books/" Prefix Inconsistency**:

   - The current inconsistency where some paths include a "books/" prefix while others don't will be resolved
   - All book-specific assets will now use the `assets/[type]/[book-slug]/` pattern without a "books/" prefix
   - The path service will handle conversion from legacy paths

2. **Migration Considerations**:
   - Assets will be migrated to the new path structure in batches by asset type
   - During migration, the system will check both old and new paths to ensure continuity
   - A mapping database or lookup mechanism will track old→new path relationships
3. **Performance Optimizations**:
   - Path segments will be joined using a library like `path-browserify` to ensure consistent path handling
   - Common path patterns will be cached to reduce string manipulation overhead

## Benefits

This unified path structure provides several benefits:

1. **Consistency**: All assets follow the same pattern, simplifying code and reducing errors
2. **Maintainability**: Clear structure makes it easier to add new asset types
3. **Debuggability**: Predictable paths make it easier to troubleshoot issues
4. **Performance**: Simplified path handling reduces processing overhead
5. **Scalability**: Structure supports future growth in asset types and books

## Implementation Timeline

The new path structure will be implemented as part of task T002 in the migration plan, followed by the creation of migration tools and updating of all related code to use the new structure.
