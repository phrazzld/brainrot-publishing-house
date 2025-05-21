# Asset Migration Scripts

This directory contains scripts for migrating assets between storage systems or standardizing their paths.
These scripts help with:

- Moving assets from one storage system to another
- Standardizing asset naming and organization
- Creating placeholder assets
- Verifying asset migrations

## Usage

Most scripts can be run directly with:

```
npx tsx scripts/asset-migration/script-name.ts [arguments]
```

## Adding New Scripts

If you create a new asset migration script:

1. Place it in this directory
2. Add a comment at the top explaining its purpose
3. Document any required arguments or environment variables
4. Consider adding a corresponding test in `__tests__/scripts/`
