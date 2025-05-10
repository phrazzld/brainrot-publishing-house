# Asset Naming Conventions

This document outlines the standardized naming conventions for all assets used in the Brainrot Publishing House platform. Following these conventions ensures consistency across the codebase and simplifies maintenance.

## General Guidelines

1. **Case**: Use lowercase with hyphens (kebab-case) for all asset names
2. **Numeric Components**: All numeric components (like chapter numbers) should be zero-padded to two digits (e.g., `01`, `02`, ... `10`)
3. **Path Structure**: Follow the unified path structure from [UNIFIED_BLOB_PATH_STRUCTURE.md](./UNIFIED_BLOB_PATH_STRUCTURE.md)

## Audio Assets

| Asset Type     | Format               | Example                                     |
| -------------- | -------------------- | ------------------------------------------- |
| Full Audiobook | `full-audiobook.mp3` | `assets/audio/the-iliad/full-audiobook.mp3` |
| Chapter Audio  | `chapter-XX.mp3`     | `assets/audio/the-iliad/chapter-01.mp3`     |

**Legacy Formats** (automatically converted):

- Simple numbers: `1.mp3` → `chapter-01.mp3`
- Book prefix: `book-1.mp3` → `chapter-01.mp3`
- Slug based: `the-iliad-chapter-3.mp3` → `chapter-03.mp3`

## Text Assets

### Brainrot Text

| Asset Type   | Format                    | Example                                      |
| ------------ | ------------------------- | -------------------------------------------- |
| Full Text    | `brainrot-fulltext.txt`   | `assets/text/hamlet/brainrot-fulltext.txt`   |
| Chapter Text | `brainrot-chapter-XX.txt` | `assets/text/hamlet/brainrot-chapter-01.txt` |

**Legacy Formats** (automatically converted):

- Directory format: `brainrot/1.txt` → `brainrot-chapter-01.txt`
- Directory format: `brainrot/fulltext.txt` → `brainrot-fulltext.txt`

### Source Text

| Asset Type    | Format                  | Example                                      |
| ------------- | ----------------------- | -------------------------------------------- |
| Full Text     | `source-fulltext.txt`   | `assets/text/hamlet/source-fulltext.txt`     |
| Chapter Text  | `source-chapter-XX.txt` | `assets/text/hamlet/source-chapter-01.txt`   |
| Custom Source | `source-{name}.txt`     | `assets/text/hamlet/source-introduction.txt` |

**Legacy Formats** (automatically converted):

- Directory format: `source/1.txt` → `source-chapter-01.txt`
- Directory format: `source/introduction.txt` → `source-introduction.txt`

### Plain Text

| Asset Type   | Format           | Example                             |
| ------------ | ---------------- | ----------------------------------- |
| Full Text    | `fulltext.txt`   | `assets/text/hamlet/fulltext.txt`   |
| Chapter Text | `chapter-XX.txt` | `assets/text/hamlet/chapter-01.txt` |

## Image Assets

| Asset Type    | Format                | Example                                |
| ------------- | --------------------- | -------------------------------------- |
| Cover Image   | `cover.{ext}`         | `assets/image/hamlet/cover.jpg`        |
| Thumbnail     | `thumbnail.{ext}`     | `assets/image/hamlet/thumbnail.jpg`    |
| Chapter Image | `chapter-XX.{ext}`    | `assets/image/hamlet/chapter-01.jpg`   |
| Custom Image  | `{custom-name}.{ext}` | `assets/image/hamlet/frontispiece.jpg` |

**Supported Extensions**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`

**Legacy Formats** (automatically converted):

- Simple numbers: `1.jpg` → `chapter-01.jpg`

## Shared Assets

Shared assets (not book-specific) follow a more flexible naming convention:

```
assets/shared/[category]/[filename]
```

Example: `assets/shared/logos/publisher-logo.png`

## Site Assets

Site-wide assets follow a similar flexible convention:

```
assets/site/[category]/[filename]
```

Example: `assets/site/icons/download-icon.svg`

## Validation and Enforcement

The `AssetNameValidator` class ensures that all asset names comply with these conventions. When non-compliant names are encountered, they are automatically converted to the standardized format when possible, or an error is thrown if conversion is not possible.

## Path Structure

These naming conventions are part of the larger unified asset path structure documented in [UNIFIED_BLOB_PATH_STRUCTURE.md](./UNIFIED_BLOB_PATH_STRUCTURE.md).

## Migration Strategy

For legacy asset names:

1. The system attempts to automatically convert legacy formats to standardized ones
2. If conversion fails, a warning is logged, and the asset is still accessible
3. New assets must follow the standardized naming conventions

## Implementation

The naming conventions are enforced throughout the codebase via:

1. The `AssetNameValidator` class which validates and normalizes asset names
2. The `AssetPathService` which generates standardized paths
3. Unit tests that verify naming conventions are followed
