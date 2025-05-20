# Test Utility Scripts

This directory contains scripts that are used for testing and verification. 
These scripts help with:

- Running tests against specific features
- Verifying migrations were successful
- Integration testing with external services
- Test data generation or cleanup

## Usage

Most scripts can be run directly with:

```
npx tsx scripts/test-utils/script-name.ts [arguments]
```

## Adding New Scripts

If you create a new test utility script:

1. Place it in this directory
2. Add a comment at the top explaining its purpose
3. Document any required arguments or environment variables