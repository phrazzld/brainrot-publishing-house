# T102 Environment Setup

## Current Environment
- Current Node.js version: v23.7.0 (non-LTS version)
- Vercel default Node.js version: 22.x (latest LTS)
- Other supported Vercel Node.js versions: 20.x, 18.x (retiring August 2025)

## Testing Plan
Based on Vercel's current Node.js support, we'll test with:

1. Node.js 22.x (Vercel's default) - Primary testing target
2. Node.js 20.x (Alternate supported version) - If needed for comparison

## Test Procedure for Each Version
1. Switch to the target Node.js version using asdf
2. Remove node_modules and package-lock.json
3. Run npm install and document any errors
4. If errors occur, try with --legacy-peer-deps flag
5. Document results for each scenario