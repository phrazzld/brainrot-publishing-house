# Plan for Fallback Mechanism for Assets Still Being Migrated

## Current Understanding

In our application, we're in the process of migrating assets from local storage to Vercel Blob storage. During this transition period, we need a robust fallback mechanism that:

1. Attempts to load assets from Blob storage first
2. Falls back to local/original paths if the Blob asset is not found
3. Does this seamlessly without requiring code changes as assets are migrated
4. Handles errors gracefully with appropriate logging

## Current Implementation Analysis

- We already have a function `getAssetUrl` in `utils/getBlobUrl.ts` that can toggle between Blob and local paths
- We already have `assetExistsInBlobStorage` to check if an asset exists in Blob
- The reading-room component already has a basic fallback mechanism in its text loading
- Our BlobService and caching utilities are in place

However, we need to:
1. Enhance the existing functions to automatically fall back rather than requiring a toggle parameter
2. Make the fallback mechanism work across different asset types (text, images, etc.)
3. Handle the fallback consistently across the application
4. Add proper error logging and telemetry

## Implementation Approach

### 1. Enhancing the URL Generation Function

Update `getBlobUrl.ts` to add a new `getAssetUrlWithFallback` function that:
- Takes a legacy path
- Tries to get the asset from Blob storage
- Falls back to the local path if the asset doesn't exist in Blob storage
- Caches the result to avoid repeated fallback checks for the same asset

### 2. Testing the Fallback Mechanism

Create comprehensive tests for the fallback mechanism:
- Test when Blob storage has the asset (primary path)
- Test when Blob storage doesn't have the asset (fallback path)
- Test caching behavior to ensure we don't repeatedly check for the same asset
- Test error handling

### 3. Implement in Key Components

Update key components that load assets to use the new fallback mechanism:
- Image components/tags
- Text loading in reading-room
- Any other places that load assets directly

### 4. Add Telemetry

Add logging to track fallback occurrences to help monitor the migration progress:
- Log when fallbacks happen
- Optionally add metrics collection

## Implementation Steps

1. Create the enhanced fallback function in `utils/getBlobUrl.ts`
2. Create tests for the fallback mechanism
3. Update key components to use the fallback mechanism
4. Add logging for fallback events