# T271: Create `.prettierignore` file for build artifacts and dependencies

## Task Description
Create a `.prettierignore` file that excludes build artifacts, dependencies, and other files that don't need to be formatted by Prettier.

## Implementation Approach
1. Research standard `.prettierignore` patterns for Next.js projects
2. Check the existing `.gitignore` for patterns that should also be in `.prettierignore`
3. Create a well-documented `.prettierignore` file
4. Test the configuration by running Prettier manually

## Expected Patterns to Include
- Node modules and package directories
- Build outputs (.next, out, dist, build)
- Generated files (coverage, .vercel)
- Cache directories
- Environment files (.env*)
- Large or binary files (public assets)

## Implementation Steps
1. Examine the current `.gitignore` for relevant patterns
2. Create `.prettierignore` file with appropriate patterns
3. Test the configuration with a sample file
4. Document any specific decisions or patterns