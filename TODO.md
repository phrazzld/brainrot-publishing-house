# CI/CD and Precommit Hooks Implementation TODO

## Vercel Blob Migration and Cleanup Tasks
1. [x] Verify Blob storage configuration (T201)
   Action: Run `npx tsx scripts/test-blob-storage.ts` to confirm your Blob token and URL configuration are working properly.
   Depends On: None
   AC Ref: None

2. [ ] Migrate book cover images (T202)
   Action: Run `npx tsx scripts/migrateBookCoverImages.ts --dry-run` to verify, then `npx tsx scripts/migrateBookCoverImages.ts` to perform the migration.
   Depends On: [T201]
   AC Ref: None

3. [ ] Migrate book chapter images (T203)
   Action: Run `npx tsx scripts/migrateBookChapterImages.ts --dry-run` to verify, then `npx tsx scripts/migrateBookChapterImages.ts` to perform the migration.
   Depends On: [T202]
   AC Ref: None

4. [ ] Migrate brainrot text files (T204)
   Action: Run `npx tsx scripts/migrateBrainrotTextFiles.ts --dry-run` to verify, then `npx tsx scripts/migrateBrainrotTextFiles.ts` to perform the migration.
   Depends On: [T203]
   AC Ref: None

5. [ ] Migrate source text files (T205)
   Action: Run `npx tsx scripts/migrateSourceTextFiles.ts --dry-run` to verify, then `npx tsx scripts/migrateSourceTextFiles.ts` to perform the migration.
   Depends On: [T204]
   AC Ref: None

6. [ ] Run verification script (T206)
   Action: Run `npx tsx scripts/verifyBlobStorage.ts` to confirm all required assets were successfully migrated to Blob storage.
   Depends On: [T205]
   AC Ref: None

7. [ ] Manually test in browser (T207)
   Action: Visit the `/blob-verification` route in your browser and confirm all books have green status indicators.
   Depends On: [T206]
   AC Ref: None

8. [ ] Cleanup local assets - dry run (T208)
   Action: Run `npx tsx scripts/cleanupLocalAssets.ts` (without the --delete flag) to see what assets would be deleted.
   Depends On: [T207]
   AC Ref: None

9. [ ] Review cleanup report (T209)
   Action: Check the generated report to ensure only migrated assets will be deleted.
   Depends On: [T208]
   AC Ref: None

10. [ ] Perform actual cleanup (T210)
    Action: Run `npx tsx scripts/cleanupLocalAssets.ts --delete` to remove local assets that have been successfully migrated.
    Depends On: [T209]
    AC Ref: None

11. [ ] Final verification (T211)
    Action: Test the application thoroughly to confirm everything works correctly after migration and cleanup.
    Depends On: [T210]
    AC Ref: None

## Vercel Blob Migration
- [x] Install and configure @vercel/blob package
- [x] Create a BlobService utility class with upload/download/list operations
- [x] Create a Blob storage path structure plan that mirrors current organization
- [x] Write a script to inventory all existing assets (images and text files)
- [x] Create a migration script for book cover images
- [x] Create a migration script for book chapter images
- [x] Create a migration script for brainrot text files
- [x] Create a migration script for source text files
- [x] Update translations/index.ts references to use Blob URLs
- [x] Modify reading-room component to fetch text content from Blob
- [x] Create a function to generate public URL for Blob assets
- [x] Add Blob URL caching to improve performance
- [x] Create fallback mechanism for assets still being migrated
- [x] Write tests for Blob storage access
- [x] Update DownloadButton component to use Blob for file downloads
- [x] Update api/download route to use Blob instead of S3
- [x] Test all book rendering with Blob-stored content
- [x] Clean up local assets after successful migration

## Vercel Blob Configuration
- [ ] Inspect Vercel build logs for npm install error (T101)  
   Action: Access the Vercel build logs URL from the error message and identify the root cause of the `npm install` failure.  
   Depends On: None  
   AC Ref: None
- [ ] Reproduce the npm install error locally with matching Node version (T102)  
   Action: Use `nvm use <version>` to match Vercel's Node version, remove `node_modules` and `package-lock.json`, then run `npm install`.  
   Depends On: [T101]  
   AC Ref: None
- [ ] Resolve reported installation issues (T103)  
   Action: Update or add peer dependencies in `package.json`, align the `"engines".node` field with Vercel's Node version, regenerate `package-lock.json`, and commit changes.  
   Depends On: [T102]  
   AC Ref: None
- [ ] Configure legacy peer-deps install in Vercel settings if needed (T104)  
   Action: In Vercel Project Settings → General → Install Command, set `npm install --legacy-peer-deps` as the install command (temporary workaround).  
   Depends On: [T103]  
   AC Ref: None
- [ ] Declare blob storage in vercel.json (T105)  
   Action: Create or update `vercel.json` at project root to include a `"storage"` entry named `"blob"` with type `"blob"`, regions, `maxDuration`, and set `NEXT_PUBLIC_BLOB_BASE_URL` in `"env"`.  
   Depends On: [T103]  
   AC Ref: None
- [ ] Commit and push vercel.json changes (T106)  
   Action: Stage, commit, and push the updated `vercel.json` to the remote repository.  
   Depends On: [T105]  
   AC Ref: None
- [ ] Link local repo to Vercel via CLI (T107)  
   Action: Run `vercel login` (if not already logged in), then `vercel link` to associate the local directory with the Vercel project.  
   Depends On: [T106]  
   AC Ref: None
- [ ] Deploy to production to provision blob storage (T108)  
   Action: Execute `vercel deploy --prod` and wait for the build and deployment to succeed, triggering automatic blob bucket provisioning.  
   Depends On: [T107]  
   AC Ref: None
- [ ] Verify BLOB_READ_WRITE_TOKEN in Vercel Dashboard (T109)  
   Action: Go to Vercel Dashboard → Settings → Environment Variables and confirm `BLOB_READ_WRITE_TOKEN` exists and is marked secret.  
   Depends On: [T108]  
   AC Ref: None
- [ ] Pull environment variables locally into .env.local (T110)  
   Action: Run `vercel env pull .env.local` to fetch `BLOB_READ_WRITE_TOKEN` and `NEXT_PUBLIC_BLOB_BASE_URL` into your local file.  
   Depends On: [T109]  
   AC Ref: None
- [ ] Ensure .env.local is ignored by Git (T111)  
   Action: Add `.env.local` to `.gitignore` (if not present) and commit the update.  
   Depends On: [T110]  
   AC Ref: None
- [ ] (Optional) Create a local read/write token manually (T112)  
   Action: Run `vercel blob token create --rw`, copy the output, and append it to `.env.local` under `BLOB_READ_WRITE_TOKEN`.  
   Depends On: [T110]  
   AC Ref: None
- [ ] Execute migration scripts in dry-run mode (T113)  
   Action: Run `npx tsx scripts/migrateBookCoverImages.ts --dry-run` (and other migrate scripts) to simulate data migration.  
   Depends On: [T111]  
   AC Ref: None
- [ ] Execute migration scripts for real (T114)  
   Action: Run `npx tsx scripts/migrateBookCoverImages.ts` (and the other scripts) without `--dry-run` to perform actual uploads.  
   Depends On: [T113]  
   AC Ref: None
- [ ] Run verification script to confirm blob uploads (T115)  
   Action: Run `npx tsx scripts/verifyBlobStorage.ts` or `npm run verify:blob` and inspect the report or spot-check URLs.  
   Depends On: [T114]  
   AC Ref: None
- [ ] Run cleanup script in dry-run mode (T116)  
   Action: Run `npx tsx scripts/cleanupLocalAssets.ts --dry-run` to preview deletion of local asset copies.  
   Depends On: [T115]  
   AC Ref: None
- [ ] Run cleanup script to delete local assets (T117)  
   Action: Run `npx tsx scripts/cleanupLocalAssets.ts --delete` to remove local files after successful migration.  
   Depends On: [T116]  
   AC Ref: None
- [ ] Add BLOB_READ_WRITE_TOKEN as a protected secret in CI (T118)  
   Action: In your CI system (or Vercel Project → Environment Variables for CI workflows), add `BLOB_READ_WRITE_TOKEN` as a protected secret so migrations can run in CI.  
   Depends On: [T109]  
   AC Ref: None
- [ ] Update docs/BLOB_STORAGE.md with setup & migration steps (T119)  
   Action: Document the end-to-end process—vercel.json declaration, deploy, env pull, migration, verification, and cleanup—in `docs/BLOB_STORAGE.md`.  
   Depends On: [T118]  
   AC Ref: None
- [ ] Finalize Vercel Blob Configuration and mark tasks complete (T120)  
   Action: Review all above tasks, ensure they're done, and update TODO.md to indicate the Vercel Blob Configuration section is fully implemented.  
   Depends On: [T117, T119]  
   AC Ref: None

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