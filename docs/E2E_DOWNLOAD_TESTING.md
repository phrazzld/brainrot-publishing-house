# End-to-End Download Testing Guide

This document provides information on how to use the end-to-end download testing tools to verify the download functionality across different environments.

## Overview

The E2E download tests verify that the download functionality works correctly across different environments after the migration from Digital Ocean to Vercel Blob. The tests cover:

1. Direct URL access to assets
2. API endpoint for URL generation
3. Proxy download functionality
4. Various file types and sizes
5. Error scenarios

## Running the Tests

### Prerequisites

- Node.js v22 or later
- npm or pnpm
- Access to the test environments

### Basic Usage

Run the tests in the local environment:

```bash
npm run test:e2e:downloads
```

Run the tests in production:

```bash
npm run test:e2e:downloads:production
```

### Advanced Options

You can specify any environment with the `--env` parameter:

```bash
# Run in development environment
npm run test:e2e:downloads -- --env=development

# Run in staging environment
npm run test:e2e:downloads -- --env=staging
```

## Test Configuration

The tests are configured in the `scripts/verify-end-to-end-downloads.ts` file. You can modify the following:

- `TEST_ENVIRONMENTS`: List of valid environments
- `BASE_URLS`: URLs for each environment
- `TEST_BOOKS`: Books to test, with their slug and chapter information

## Test Reports

After running the tests, two report files are generated in the `test-reports` directory:

1. HTML Report: Detailed visual report with success/failure information
2. JSON Report: Machine-readable data for CI/CD integration

Example:

```
test-reports/download-e2e-local-2023-10-15T12-34-56-789Z.html
test-reports/download-e2e-local-2023-10-15T12-34-56-789Z.json
```

## Test Coverage

The E2E tests cover:

### Direct URL Access

- Verifies that assets are accessible via direct URL
- Checks content-type and size
- Calculates checksums for integrity verification

### API Endpoint Tests

- Verifies that the `/api/download` endpoint correctly returns URLs
- Validates that returned URLs are accessible
- Tests both full audiobooks and individual chapters
- Confirms error handling for invalid parameters and missing assets

### Proxy Download Tests

- Verifies that the proxy download functionality works correctly
- Tests streaming functionality
- Validates content-type headers
- Checks that files download successfully

### Error Scenarios

- Tests non-existent assets
- Validates error responses
- Ensures error messages are user-friendly

## Troubleshooting

If tests fail, check:

1. Network connectivity to the specified environment
2. Asset existence in Vercel Blob
3. API endpoint configuration
4. Proxy functionality and timeouts

## Adding New Tests

To add new tests:

1. Update the `TEST_BOOKS` array in `verify-end-to-end-downloads.ts`
2. Add specific edge cases as needed
3. Run the tests to verify

## CI/CD Integration

The tests return non-zero exit codes on failure, making them suitable for CI/CD pipelines. The JSON reports can be parsed for detailed CI reporting.

Example GitHub Actions step:

```yaml
- name: Run E2E download tests
  run: npm run test:e2e:downloads
```

## Performance Considerations

The tests include performance metrics that can be used to establish baselines and detect regressions:

- Response time for URL generation
- Download duration for various file sizes
- Proxy processing overhead

These metrics are included in both HTML and JSON reports.
