# CI/CD and Precommit Hooks Implementation TODO

## Vercel Blob Migration
- [x] Install and configure @vercel/blob package
- [x] Create a BlobService utility class with upload/download/list operations
- [ ] Create a Blob storage path structure plan that mirrors current organization
- [ ] Write a script to inventory all existing assets (images and text files)
- [ ] Create a migration script for book cover images
- [ ] Create a migration script for book chapter images
- [ ] Create a migration script for brainrot text files
- [ ] Create a migration script for source text files
- [ ] Update translations/index.ts references to use Blob URLs
- [ ] Modify reading-room component to fetch text content from Blob
- [ ] Create a function to generate public URL for Blob assets
- [ ] Add Blob URL caching to improve performance
- [ ] Create fallback mechanism for assets still being migrated
- [ ] Write tests for Blob storage access
- [ ] Update DownloadButton component to use Blob for file downloads
- [ ] Update api/download route to use Blob instead of S3
- [ ] Test all book rendering with Blob-stored content
- [ ] Clean up local assets after successful migration

## ESLint Configuration ✅
- [x] Install ESLint and necessary TypeScript plugins
- [x] Install eslint-plugin-react, eslint-plugin-react-hooks, and eslint-plugin-jsx-a11y
- [x] Create basic `.eslintrc.json` configuration with Next.js settings
- [x] Add TypeScript strict mode rules to ESLint config
- [x] Configure code quality rules (complexity, nesting, etc.)
- [x] Set up file size linting rules (warning at 500 lines)
- [x] Add max-lines-per-function limits
- [x] Create npm script for linting in package.json

## Prettier Configuration
- [ ] Install Prettier and ESLint Prettier integration
- [ ] Create `.prettierrc.js` with code formatting standards
- [ ] Create `.prettierignore` file for build artifacts and dependencies
- [ ] Add Prettier npm script to package.json
- [ ] Configure Prettier/ESLint integration to avoid conflicts

## Testing Infrastructure
- [ ] Install Jest and React Testing Library
- [ ] Configure Jest for TypeScript and Next.js
- [ ] Set up test scripts in package.json
- [ ] Create basic smoke test to verify the setup
- [ ] Configure test coverage reporting

## Husky Pre-commit Hooks
- [ ] Install Husky v9 (latest version)
- [ ] Install lint-staged for running commands on staged files
- [ ] Initialize Husky with `npx husky init`
- [ ] Add husky install to package.json prepare script
- [ ] Create pre-commit hook to run lint-staged
- [ ] Configure lint-staged in package.json to run linters and formatters

## Commitlint for Conventional Commits
- [ ] Install commitlint and conventional commits config
- [ ] Create commitlint.config.js file
- [ ] Add commit-msg hook with Husky to validate commit messages
- [ ] Document commit message format requirements

## GitHub Actions CI Workflow
- [ ] Create `.github/workflows` directory
- [ ] Create basic `ci.yml` workflow file for push and PR events
- [ ] Configure Node.js environment and dependency caching
- [ ] Add lint job to run ESLint checks
- [ ] Add test job to run Jest tests
- [ ] Add build job to verify successful build
- [ ] Configure appropriate trigger events (push to main, PRs)

## Security Scanning
- [ ] Add dependency vulnerability scanning to CI workflow
- [ ] Configure CodeQL security scanning
- [ ] Add scheduled security scans for the repository
- [ ] Set up alert notifications for security issues

## Branch Protection Rules
- [ ] Configure branch protection for main branch
- [ ] Require CI checks to pass before merging
- [ ] Enforce pull request reviews (at least 1 approval)
- [ ] Prevent force pushes to protected branches
- [ ] Require linear history (no merge commits)

## Documentation
- [ ] Add CI badge to README.md
- [ ] Create CONTRIBUTING.md with development workflow details
- [ ] Document pre-commit hook installation process
- [ ] Add troubleshooting section for common issues
- [ ] Document the commit message convention

## Final Review and Testing
- [ ] Test the full pre-commit hook workflow with various violations
- [ ] Verify CI pipeline runs correctly on a test PR
- [ ] Ensure branch protection works as expected
- [ ] Review and adjust any overly strict rules
- [ ] Update team on new CI/CD process