# Debug Scripts

This directory contains scripts that are used for debugging and troubleshooting during development.
These scripts are not part of the production workflow but are useful for:

- Testing specific features in isolation
- Diagnosing issues with assets, URLs, or migrations
- Exploring the state of the blob storage
- One-off operations not needed in regular usage

## Usage

Most scripts can be run directly with:

```
npx tsx scripts/debug/script-name.ts [arguments]
```

## Adding New Scripts

If you create a new debugging script:

1. Place it in this directory
2. Add a comment at the top explaining its purpose
3. Document any required arguments or environment variables
