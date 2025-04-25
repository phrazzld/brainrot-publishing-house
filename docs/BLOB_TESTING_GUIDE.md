# Blob Storage Testing Guide

This document provides instructions for verifying that all book content renders correctly from Blob storage.

## Testing Tools

We provide two main tools for testing Blob storage functionality:

1. **Verification Page:** Navigate to `/blob-verification` in the application to see real-time status of all books and their assets.
2. **Command-line Verification:** Run `npm run verify:blob` to generate a detailed report of all assets and their migration status.

## Manual Testing Checklist

For a thorough verification, follow this checklist for each book:

### Reading Room Test

- [ ] Navigate to `/reading-room/[book-slug]`
- [ ] Verify book cover image loads correctly 
- [ ] Verify text content loads properly
- [ ] Test chapter navigation (if multiple chapters)
- [ ] Test audio playback (if available)
- [ ] Use browser devtools to confirm URLs are Blob URLs

### Download Functionality

- [ ] Test the download button for audio content
- [ ] Verify the downloaded file opens correctly

### Edge Cases

- [ ] Test with browser cache cleared
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test with network throttling enabled in devtools
- [ ] Clear the application's URL cache using the "Clear Cache" button on the verification page

## Test Report Template

```markdown
# Blob Storage Migration Test Report

Date: [TEST DATE]
Tester: [YOUR NAME]

## Automated Verification Results
- Total Books: [X]
- Books with Cover Image in Blob: [X]
- Books with All Content in Blob: [X] 
- Total Assets: [X]
- Migrated Assets: [X]
- Missing Assets: [X]

## Book-by-Book Testing Results

### [Book Title]
- Cover Image: [✓/✗]
- Text Content: [✓/✗]
- Audio Content: [✓/✗/N/A]
- Download Function: [✓/✗/N/A]
- Notes: [Any issues or observations]

### [Book Title]
...

## Browser Compatibility 
- Chrome: [✓/✗]
- Firefox: [✓/✗]
- Safari: [✓/✗]

## Network Conditions
- Normal: [✓/✗]
- Throttled (Slow 3G): [✓/✗]

## Issues Found
1. [Issue description, steps to reproduce, and affected books/features]
2. ...

## Recommendations
1. [Recommendation for fixing issues or improving the migration]
2. ...
```

## Troubleshooting Common Issues

### Images Not Loading from Blob

1. Check if the image has been migrated using the verification page
2. Verify the image path in the translations file
3. Check browser network tab for 404 errors
4. Try clearing the URL cache

### Text Content Not Loading

1. Check if text files have been migrated
2. Look for errors in the browser console
3. Verify the text path in the translations file

### Audio Playback Issues

1. Confirm audio has been migrated to Blob storage
2. Check browser support for audio format
3. Verify audio URL in network tab

## Next Steps After Testing

1. Report any issues found during testing
2. For any missing assets, run the appropriate migration script
3. Fix any rendering issues in the application code
4. When all tests pass, update the README with migration status