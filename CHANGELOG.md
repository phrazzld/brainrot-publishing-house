# Changelog

All notable changes to the brainrot publishing house project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Unified Asset Service** - Implemented a new unified asset service (T009) that:
  - Provides a single consistent interface for all asset operations
  - Only uses Vercel Blob as the storage backend
  - Includes comprehensive logging and error handling
  - Features automatic retry mechanism for transient failures
  - Comes with full test coverage

### Removed

- **Translation functionality** - Removed the translation feature from the application. This includes:

  - Translation API endpoints in `/api/translate`
  - Frontend components in `/app/translate` and `/components/translate`
  - Translation-specific hooks (e.g., `useTranslationStream`)
  - Translation-related utilities and services

  This functionality will be replaced by a separate admin tool in the future.

## [0.1.0] - Project Start

### Added

- Initial reading room functionality
- Audio playback with wavesurfer visualization
- Chapter navigation system
- Timestamp sharing capability
- Blob storage integration for assets
