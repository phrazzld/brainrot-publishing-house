# TODO: Brainrot Publishing House - Monorepo Migration & Publishing Pipeline

## Phase 1: Monorepo Structure Setup [Days 1-2]

### 1.1 Initialize Monorepo Root

- [x] Create new directory at `~/Development/brainrot` as monorepo root
- [ ] Initialize git repository with `git init` in monorepo root
- [ ] Create `package.json` with `"packageManager": "pnpm@8.15.1"` and `"private": true`
- [ ] Install Turborepo as dev dependency: `pnpm add -D turbo@^2.0.0`
- [ ] Create `pnpm-workspace.yaml` with packages array: `['apps/*', 'packages/*', 'content/*']`
- [ ] Create directory structure: `mkdir -p apps packages content scripts .github/workflows`

### 1.2 Configure Turborepo

- [ ] Create `turbo.json` with pipeline definitions for build, dev, test, lint, generate, publish tasks
- [ ] Configure globalDependencies to include `**/.env.*local` for proper env var handling
- [ ] Set up build task outputs: `[".next/**", "dist/**", "generated/**"]`
- [ ] Configure dev task with `"cache": false` and `"persistent": true` for watch mode
- [ ] Add environment variables to build task: `["NODE_ENV", "NEXT_PUBLIC_*", "BLOB_READ_WRITE_TOKEN"]`

### 1.3 Migrate Web App Repository

- [ ] Add web app as git remote: `git remote add web-origin ../brainrot-publishing-house`
- [ ] Fetch web app history: `git fetch web-origin`
- [ ] Merge web app with subtree preserving history: `git merge -s ours --no-commit --allow-unrelated-histories web-origin/master`
- [ ] Read web app tree into apps/web: `git read-tree --prefix=apps/web/ -u web-origin/master`
- [ ] Commit web app import: `git commit -m "Import web app with full git history"`
- [ ] Update `apps/web/package.json` name field to `"@brainrot/web"`

### 1.4 Migrate Translations Repository

- [ ] Add translations as git remote: `git remote add translations-origin ../brainrot-translations`
- [ ] Fetch translations history: `git fetch translations-origin`
- [ ] Merge translations with subtree: `git merge -s ours --no-commit --allow-unrelated-histories translations-origin/main`
- [ ] Read translations tree into content/translations: `git read-tree --prefix=content/translations/ -u translations-origin/main`
- [ ] Commit translations import: `git commit -m "Import translations with full git history"`
- [ ] Update `content/translations/package.json` name field to `"@brainrot/translations"`

### 1.5 Consolidate Duplicate Content

- [ ] Create organized books directory: `mkdir -p content/translations/books`
- [ ] Move Great Gatsby from web app: `mv apps/web/great-gatsby content/translations/books/great-gatsby`
- [ ] Remove duplicate Gatsby source: `rm -f apps/web/great-gatsby-source.txt`
- [ ] Reorganize existing translations to books/ structure from `content/translations/translations/*`
- [ ] Standardize book folder naming (kebab-case): `the-iliad`, `the-odyssey`, `the-aeneid`, etc.
- [ ] Commit consolidation: `git commit -m "Consolidate all translations to unified books directory"`

## Phase 2: Shared Packages Creation [Days 3-4]

### 2.1 Create @brainrot/types Package

- [ ] Create package directory: `mkdir -p packages/@brainrot/types/src`
- [ ] Create `packages/@brainrot/types/package.json` with main/types pointing to dist, TypeScript build script
- [ ] Create `packages/@brainrot/types/tsconfig.json` with composite: true and proper outDir
- [ ] Define `Book` interface with slug, title, author, translator, metadata, chapters fields
- [ ] Define `Chapter` interface with number, title, content fields
- [ ] Define `BookMetadata` interface with ISBN, publishDate, categories, keywords fields
- [ ] Define `Translation` interface matching existing web app structure
- [ ] Export all types from `packages/@brainrot/types/src/index.ts`
- [ ] Build package to verify TypeScript compilation: `cd packages/@brainrot/types && pnpm build`

### 2.2 Create @brainrot/converter Package

- [ ] Create package directory: `mkdir -p packages/@brainrot/converter/src`
- [ ] Install dependencies: `marked@^12.0.0`, `remove-markdown@^0.5.0`
- [ ] Implement `stripMarkdown()` function to convert MD to plain text preserving line breaks
- [ ] Implement `markdownToText()` with chapter title formatting for web display
- [ ] Implement `markdownToEpub()` function wrapping pandoc with proper metadata handling
- [ ] Implement `markdownToPdf()` function using pandoc with xelatex engine
- [ ] Implement `markdownToKindle()` function converting EPUB to KPF format
- [ ] Create batch converter for processing entire books at once
- [ ] Create comprehensive test suite for each conversion function
- [ ] Export all converters from `packages/@brainrot/converter/src/index.ts`

### 2.3 Create @brainrot/blob-client Package

- [ ] Create package directory: `mkdir -p packages/@brainrot/blob-client/src`
- [ ] Install `@vercel/blob@^0.23.0` as dependency
- [ ] Migrate existing `BlobService` class from web app to package
- [ ] Migrate existing `BlobPathService` class from web app to package
- [ ] Implement `uploadTextFile()` function with retry logic and progress reporting
- [ ] Implement `uploadBookAssets()` batch upload function for all book files
- [ ] Implement `deleteOldAssets()` for cleanup of deprecated paths
- [ ] Add checksum verification to avoid re-uploading unchanged files
- [ ] Create `BlobMigrationService` for one-time migration tasks
- [ ] Export client and utilities from index.ts

### 2.4 Create @brainrot/metadata Package

- [ ] Create package directory: `mkdir -p packages/@brainrot/metadata/src`
- [ ] Install `js-yaml@^4.1.0` for YAML parsing
- [ ] Implement `parseBookMetadata()` function to read and validate metadata.yaml files
- [ ] Implement `validateISBN()` function for ISBN-13 validation
- [ ] Implement `generateMetadata()` function for creating new book metadata
- [ ] Create JSON schema for metadata validation
- [ ] Implement `getBookList()` to scan and return all available books
- [ ] Add metadata inheritance for common fields across books
- [ ] Add unit tests for all validation functions

### 2.5 Create @brainrot/templates Package

- [ ] Create package directory: `mkdir -p packages/@brainrot/templates`
- [ ] Create `epub/brainrot.epub.template` with custom CSS and metadata placeholders
- [ ] Create `pdf/paperback.latex` template with 6x9 inch dimensions, 0.75" inner margins
- [ ] Create `pdf/hardcover.latex` template with 6x9 inch dimensions, 0.875" inner margins
- [ ] Create `kindle/kindle.template` optimized for reflowable Kindle formatting
- [ ] Add web fonts: Inter for body text, custom display font for titles
- [ ] Create cover template system with replaceable text/colors
- [ ] Document template customization points in README

## Phase 3: Web App Integration [Days 4-5]

### 3.1 Update Web App Dependencies

- [ ] Update `apps/web/package.json` to use workspace packages: `"@brainrot/types": "workspace:*"`
- [ ] Add `"@brainrot/blob-client": "workspace:*"` dependency
- [ ] Add `"@brainrot/converter": "workspace:*"` dependency
- [ ] Remove duplicate utilities that now live in packages
- [ ] Run `pnpm install` from monorepo root to link workspace packages
- [ ] Verify workspace linking with `pnpm list --depth=0`

### 3.2 Refactor Translation Imports

- [ ] Update `apps/web/translations/index.ts` to import from `content/translations/books/*`
- [ ] Create translation registry that auto-discovers books in content directory
- [ ] Update all import paths in React components to use new structure
- [ ] Update `getAssetUrl` calls to reference new standardized blob paths
- [ ] Remove old translation files from web app directory
- [ ] Test all book routes to ensure translations load correctly

### 3.3 Update Build Configuration

- [ ] Update `apps/web/next.config.mjs` to handle monorepo structure
- [ ] Configure module resolution for workspace packages in webpack config
- [ ] Update TypeScript paths in `apps/web/tsconfig.json` for @brainrot/\* packages
- [ ] Ensure public assets are correctly referenced from new locations
- [ ] Configure Turbopack for monorepo compatibility
- [ ] Test production build: `pnpm build --filter=@brainrot/web`

## Phase 4: Content Pipeline Implementation [Days 5-6]

### 4.1 Standardize Book Structure

- [ ] Create `content/translations/books/great-gatsby/metadata.yaml` with complete book information
- [ ] Add placeholder ISBNs using format: `979-8-XXXXXX-XX-X` for each format
- [ ] Define categories: ["Fiction / Classics", "Humor / Parody", "Young Adult / General"]
- [ ] Set keywords for SEO: ["great gatsby", "gen z translation", "brainrot", "classic literature"]
- [ ] Configure pricing: ebook $4.99, paperback $14.99, hardcover $24.99
- [ ] Set publishing flags: kdp: true, lulu: true, ingram: false
- [ ] Create similar metadata.yaml for all existing books in translations repo

### 4.2 Implement Format Generation Script

- [ ] Create `scripts/generate-formats.ts` with commander CLI interface
- [ ] Implement `convertMarkdownToText()` for Great Gatsby using @brainrot/converter
- [ ] Generate plain text files: `brainrot-introduction.txt` through `brainrot-chapter-9.txt`
- [ ] Implement `generateEpub()` function with metadata injection from YAML
- [ ] Implement `generatePdf()` function with paperback and hardcover variants
- [ ] Add progress indicators using ora spinner library for user feedback
- [ ] Implement parallel processing for multiple books with p-limit
- [ ] Add `--dry-run` flag for testing without file generation
- [ ] Create `generated/` directories for each book to store output

### 4.3 Implement Blob Storage Sync

- [ ] Create `scripts/sync-translations.ts` using @brainrot/blob-client package
- [ ] Implement `syncBook()` function to upload all generated text files for a book
- [ ] Upload Great Gatsby text files to `books/great-gatsby/text/` path in blob storage
- [ ] Add MD5 checksum verification to skip unchanged files
- [ ] Implement parallel uploads with concurrency limit of 5 using p-limit
- [ ] Add progress bar using cli-progress showing upload status
- [ ] Create `--force` flag to override checksum verification
- [ ] Implement `--delete` flag to remove orphaned files from blob storage
- [ ] Log all uploads to `sync-log.json` with timestamps and checksums

### 4.4 Process All Existing Books

- [ ] Run `pnpm generate:formats the-iliad` to create all output formats
- [ ] Run `pnpm generate:formats the-odyssey` to create all output formats
- [ ] Run `pnpm generate:formats the-aeneid` to create all output formats
- [ ] Process all other books from translations repo in batch
- [ ] Run `pnpm sync:blob --all` to upload all books to Vercel Blob
- [ ] Verify each book loads correctly in web app reading room
- [ ] Create inventory JSON file listing all processed books and their assets

## Phase 5: Publisher CLI Development [Week 2]

### 5.1 Create Publisher CLI Structure

- [ ] Create `apps/publisher` directory with src folder structure
- [ ] Set up `apps/publisher/package.json` with bin field pointing to dist/index.js
- [ ] Install commander@^12, chalk@^5, ora@^8, inquirer@^9 for CLI interface
- [ ] Create main entry point with command routing using commander
- [ ] Implement global flags: `--verbose`, `--quiet`, `--no-color` for output control
- [ ] Add `--config` flag for loading custom configuration files
- [ ] Create help text with examples for each command
- [ ] Set up TypeScript compilation with proper source maps

### 5.2 Implement Lulu API Integration

- [ ] Create `apps/publisher/src/services/lulu.ts` service class
- [ ] Implement OAuth2 authentication flow with API key/secret
- [ ] Implement `createProject()` function for new book creation
- [ ] Implement `uploadInteriorPdf()` with multipart upload for large files
- [ ] Implement `uploadCoverPdf()` with dimension validation
- [ ] Implement `setPricing()` with territory-specific pricing
- [ ] Implement `publishProject()` to make book available for sale
- [ ] Implement `checkJobStatus()` polling for async operations
- [ ] Add exponential backoff retry logic for API failures
- [ ] Create mock mode for testing without actual API calls

### 5.3 Implement KDP Automation

- [ ] Create `apps/publisher/src/services/kdp.ts` service class
- [ ] Install playwright@^1.40 for browser automation
- [ ] Implement secure credential storage using keytar or env vars
- [ ] Implement `login()` with 2FA handling via CLI prompt
- [ ] Implement `navigateToNewBook()` automation flow
- [ ] Implement `fillBookDetails()` for title, author, description fields
- [ ] Implement `uploadManuscript()` with wait for processing
- [ ] Implement `uploadCover()` with dimension validation
- [ ] Implement `setPricingAndRights()` for territories and royalties
- [ ] Implement `saveAsDraft()` and `publishBook()` functions
- [ ] Add screenshot capture on error for debugging
- [ ] Create headless and headed modes for debugging

### 5.4 Create Unified Publish Command

- [ ] Implement `apps/publisher/src/commands/publish-all.ts`
- [ ] Read metadata.yaml to determine target platforms and settings
- [ ] Create pre-flight checks: file existence, format validation, metadata completeness
- [ ] Execute platform-specific publishing in sequence with error handling
- [ ] Generate comprehensive publishing report with URLs, IDs, and status
- [ ] Save report to `publishing-reports/[date]-[book].json`
- [ ] Implement rollback capability if one platform fails
- [ ] Add dry-run mode that simulates without publishing
- [ ] Send completion notification via email or Slack webhook

## Phase 6: CI/CD Setup [Day 7]

### 6.1 Create GitHub Actions Workflows

- [ ] Create `.github/workflows/ci.yml` running tests on all PRs
- [ ] Configure matrix strategy for Node.js 20 and 22
- [ ] Create `.github/workflows/deploy-web.yml` for Vercel deployment on main branch
- [ ] Set up path filters to only deploy when apps/web changes
- [ ] Create `.github/workflows/publish-books.yml` triggered by content changes
- [ ] Implement change detection to only process modified books
- [ ] Create `.github/workflows/sync-content.yml` for daily blob storage sync
- [ ] Add workflow_dispatch for manual triggers with book selection
- [ ] Configure pnpm caching with actions/cache for faster builds
- [ ] Set up Turborepo remote caching with Vercel

### 6.2 Configure Vercel Deployment

- [ ] Set up new Vercel project pointing to monorepo
- [ ] Configure build command: `cd ../.. && pnpm build --filter=@brainrot/web`
- [ ] Set root directory to `apps/web` in Vercel settings
- [ ] Configure ignored build step: `git diff HEAD^ HEAD --quiet -- apps/web packages`
- [ ] Add all required environment variables in Vercel dashboard
- [ ] Set up preview deployments for pull requests
- [ ] Configure custom domains if applicable
- [ ] Test production deployment with manual trigger
- [ ] Set up deployment notifications in Discord/Slack

### 6.3 Set Up Secrets Management

- [ ] Generate new `BLOB_READ_WRITE_TOKEN` from Vercel dashboard
- [ ] Add token to GitHub Actions secrets and Vercel env vars
- [ ] Create Vercel token and add `VERCEL_TOKEN` to GitHub secrets
- [ ] Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from Vercel settings
- [ ] Generate Lulu API credentials and add as GitHub secrets
- [ ] Create `.env.example` with all required variables documented
- [ ] Create `.env.vault` for secure local secret sharing (using dotenv-vault)
- [ ] Document secret rotation procedure in `docs/SECRETS.md`
- [ ] Enable GitHub secret scanning to prevent leaks
- [ ] Set up monitoring for secret usage

## Phase 7: Migration Execution [Week 2]

### 7.1 Pre-Migration Backup

- [ ] Create full backup: `git clone --mirror brainrot-publishing-house backup-web`
- [ ] Create full backup: `git clone --mirror brainrot-translations backup-translations`
- [ ] Export GitHub issues to JSON using GitHub CLI
- [ ] Export GitHub Actions secrets list (not values) for reference
- [ ] Document current Vercel configuration and environment variables
- [ ] Save all local .env files to secure password manager
- [ ] Create migration rollback plan document

### 7.2 Execute Migration

- [ ] Run all Phase 1 migration scripts in sequence
- [ ] Verify git history preserved: `git log --oneline --graph --all`
- [ ] Run `pnpm install` from monorepo root
- [ ] Run `pnpm build` to verify all packages compile
- [ ] Run `pnpm test` to ensure all tests pass
- [ ] Run `pnpm lint` to check for code quality issues
- [ ] Generate formats for all books to test pipeline
- [ ] Deploy to Vercel preview environment for testing

### 7.3 Update Remote Repository

- [ ] Create new GitHub repository named `brainrot`
- [ ] Add new remote: `git remote add origin git@github.com:[username]/brainrot.git`
- [ ] Push all branches: `git push -u origin --all`
- [ ] Push all tags: `git push -u origin --tags`
- [ ] Set up branch protection for main branch
- [ ] Configure required status checks for PRs
- [ ] Set up CODEOWNERS file for review requirements
- [ ] Configure GitHub Actions secrets from backup list
- [ ] Enable Dependabot for dependency updates

### 7.4 Post-Migration Cleanup

- [ ] Update Vercel to deploy from new monorepo
- [ ] Verify production deployment succeeds
- [ ] Archive old repositories with deprecation notice
- [ ] Update README.md with monorepo structure and commands
- [ ] Create CONTRIBUTING.md with development workflow
- [ ] Document publishing pipeline in `docs/PUBLISHING.md`
- [ ] Create architecture diagram using mermaid
- [ ] Update both CLAUDE.md files with new structure
- [ ] Schedule old repo deletion for 30 days

## Phase 8: Continuous Improvement [Ongoing]

### 8.1 Monitoring and Optimization

- [ ] Set up Vercel Analytics for web app performance monitoring
- [ ] Implement build time tracking in CI/CD pipelines
- [ ] Create dashboard for publishing success rates
- [ ] Set up error tracking with Sentry
- [ ] Monitor blob storage usage and costs
- [ ] Implement automated performance regression tests

### 8.2 Future Enhancements

- [ ] Create `apps/studio` for web-based translation editor
- [ ] Implement AI-assisted translation suggestions
- [ ] Add `packages/@brainrot/ai-translator` for automation
- [ ] Create public API for translations access
- [ ] Implement subscription system for premium content
- [ ] Add analytics for most popular translations
- [ ] Create mobile app for reading translations

## Success Metrics & Acceptance Criteria

- [ ] Monorepo build completes in < 60 seconds
- [ ] Web app deployment completes in < 3 minutes
- [ ] Format generation processes book in < 30 seconds
- [ ] Blob sync uploads book in < 10 seconds
- [ ] Zero data loss during migration (verified by git diff)
- [ ] All existing web app features functioning correctly
- [ ] Git history fully preserved and accessible
- [ ] Great Gatsby loads without errors in reading room
- [ ] All books from translations repo accessible in web app
- [ ] Publishing pipeline successfully publishes to Lulu sandbox

## Notes

- Each task is designed to be atomic and completable in < 2 hours
- Test thoroughly after each phase before proceeding to next
- Keep backup of old repositories for minimum 30 days
- Document any deviations from plan in decision log
- Use `--dry-run` flags whenever available for safety
- Run in verbose mode during initial executions for debugging
- Consider pair programming for complex migration steps
