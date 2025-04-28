# T102 Plan: Reproduce npm install error locally with matching Node version

## Task Description
Use `nvm use <version>` to match Vercel's Node version, remove `node_modules` and `package-lock.json`, then run `npm install` to reproduce the npm install error identified in T101.

## Background
In T101, we identified several potential issues that could be causing npm install failures in Vercel deployments:
1. Very recent package versions (React 19, Next.js 15.1.3) potentially causing compatibility issues
2. Missing Node.js engine specification
3. ES Modules configuration with `"type": "module"` in package.json
4. Potential peer dependency conflicts, particularly with React 19

We now need to verify these issues by reproducing them locally with the same Node.js version used in Vercel.

## Implementation Steps

1. **Determine Vercel's Node.js Version**
   - Based on T101 findings, we don't yet know the exact Node version used in Vercel
   - Vercel typically uses Node.js 18 LTS for production deployments by default
   - We'll test with Node.js 18.x (latest LTS) and optionally Node.js 16.x (previous LTS) if needed

2. **Set Up Testing Environment**
   - Use asdf to switch to the appropriate Node.js version
   - Create a backup of package.json and package-lock.json
   - Remove node_modules and package-lock.json for a clean slate

3. **Attempt Installation and Document Errors**
   - Run `npm install` and capture any errors
   - Try different installation flags if the initial attempt fails:
     - `npm install --legacy-peer-deps`
     - `npm install --force`
   - Document each approach and the resulting errors

4. **Analyze Results**
   - Confirm which of the potential issues from T101 are causing problems
   - Determine if the errors match what was seen in Vercel logs
   - Identify specific packages causing conflicts

5. **Create Summary of Findings**
   - Document the exact errors encountered
   - Note successful workarounds if any
   - Provide recommendations for T103 implementation

## Expected Outcome
A clear understanding of:
- The specific npm install errors when using the same Node.js version as Vercel
- Whether --legacy-peer-deps or other flags resolve the issues
- The specific package incompatibilities or conflicts that need to be addressed
- Concrete recommendations for implementation in T103

## Risk Assessment
- Low risk as we're working in a controlled local environment
- Will create backups of important files before modification
- Testing multiple Node.js versions may take some time but is straightforward