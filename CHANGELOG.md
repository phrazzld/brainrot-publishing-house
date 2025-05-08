# Changelog

All notable changes to the brainrot publishing house project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Asset Management Guide** - Created comprehensive documentation for:

  - Path structure and naming conventions for all asset types
  - Instructions for adding new assets to the system
  - Complete Asset Service API reference with examples
  - Common asset operations with code samples
  - Error handling guidelines and best practices

- **Comprehensive Configuration Documentation** - Created detailed documentation for:

  - Vercel Blob setup and configuration
  - Environment variables required for the application
  - Troubleshooting guide for common issues
  - Links to official documentation and resources
  - Migration from Digital Ocean to Vercel Blob

- **Unified Asset Service** - Implemented a new unified asset service (T009) that:

  - Provides a single consistent interface for all asset operations
  - Only uses Vercel Blob as the storage backend
  - Includes comprehensive logging and error handling
  - Features automatic retry mechanism for transient failures
  - Comes with full test coverage

- **Refactored BlobPathService** (T010) - Improved path handling:

  - Delegated path generation to AssetPathService
  - Maintained backward compatibility for existing code
  - Added deprecation notices to encourage migration
  - Eliminated redundant path generation logic
  - Improved test coverage

- **Updated Download API Routes** (T011) - Enhanced download functionality:

  - Modified to use the new unified asset service for all asset operations
  - Implemented more robust error handling with proper status codes
  - Removed all Digital Ocean and fallback logic
  - Added comprehensive structured logging for troubleshooting
  - Updated tests to verify new functionality

- **Updated Proxy Download Handler** (T012) - Refactored file proxying:
  - Added new proxyAssetDownload function using the unified asset service
  - Simplified streaming logic by removing all Digital Ocean fallbacks
  - Enhanced error reporting with detailed asset context
  - Added comprehensive performance metrics and logging
  - Created a complete test suite for proxy functionality
  - Maintained backward compatibility with legacy download endpoint

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
