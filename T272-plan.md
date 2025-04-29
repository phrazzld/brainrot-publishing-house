# T272: Add Prettier npm script to package.json

## Task Description
Add npm scripts to package.json for running Prettier commands, including formatting check and automatic fixing.

## Implementation Approach
1. Examine the current package.json to understand existing scripts
2. Add the following npm scripts:
   - `prettier:check`: Run Prettier in check mode to identify formatting issues
   - `prettier:fix`: Run Prettier to automatically fix formatting issues
   - Consider adding `format` as an alias for `prettier:fix` 

## Expected Scripts
```json
"scripts": {
  "prettier:check": "prettier --check .",
  "prettier:fix": "prettier --write .",
  "format": "npm run prettier:fix",
}
```

## Implementation Steps
1. Read the current package.json file
2. Add the new scripts to the scripts section
3. Test the scripts to ensure they work correctly
4. Document any specific decisions or considerations