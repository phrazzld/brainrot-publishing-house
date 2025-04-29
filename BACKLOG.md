# Project Backlog

## Infrastructure

### Testing Infrastructure
- [ ] Set up test scripts in package.json (T276)
- [ ] Configure test coverage reporting
- [ ] Create comprehensive test suite for all components

### Husky Pre-commit Hooks
- [ ] Install Husky v9 (latest version)
- [ ] Install lint-staged for running commands on staged files
- [ ] Initialize Husky with `npx husky init`
- [ ] Add husky install to package.json prepare script
- [ ] Create pre-commit hook to run lint-staged
- [ ] Configure lint-staged in package.json to run linters and formatters

### Commitlint for Conventional Commits
- [ ] Install commitlint and conventional commits config
- [ ] Create commitlint.config.js file
- [ ] Add commit-msg hook with Husky to validate commit messages
- [ ] Document commit message format requirements

### GitHub Actions CI Workflow
- [ ] Create `.github/workflows` directory
- [ ] Create basic `ci.yml` workflow file for push and PR events
- [ ] Configure Node.js environment and dependency caching
- [ ] Add lint job to run ESLint checks
- [ ] Add test job to run Jest tests
- [ ] Add build job to verify successful build
- [ ] Configure appropriate trigger events (push to main, PRs)
- [ ] Set up GitHub Actions CI

### Security Scanning
- [ ] Add dependency vulnerability scanning to CI workflow
- [ ] Configure CodeQL security scanning
- [ ] Add scheduled security scans for the repository
- [ ] Set up alert notifications for security issues

### Branch Protection Rules
- [ ] Configure branch protection for main branch
- [ ] Require CI checks to pass before merging
- [ ] Enforce pull request reviews (at least 1 approval)
- [ ] Prevent force pushes to protected branches
- [ ] Require linear history (no merge commits)

### Vercel Blob Configuration
- [ ] Deploy to production to provision blob storage (T108)
- [ ] Verify BLOB_READ_WRITE_TOKEN in Vercel Dashboard (T109)
- [ ] Pull environment variables locally into .env.local (T110)
- [ ] Ensure .env.local is ignored by Git (T111)
- [ ] (Optional) Create a local read/write token manually (T112)
- [ ] Execute migration scripts in dry-run mode (T113)
- [ ] Execute migration scripts for real (T114)
- [ ] Run verification script to confirm blob uploads (T115)
- [ ] Run cleanup script in dry-run mode (T116)
- [ ] Run cleanup script to delete local assets (T117)
- [ ] Add BLOB_READ_WRITE_TOKEN as a protected secret in CI (T118)
- [ ] Update docs/BLOB_STORAGE.md with setup & migration steps (T119)
- [ ] Finalize Vercel Blob Configuration and mark tasks complete (T120)

### Documentation
- [ ] Add CI badge to README.md
- [ ] Create CONTRIBUTING.md with development workflow details
- [ ] Document pre-commit hook installation process
- [ ] Add troubleshooting section for common issues
- [ ] Document the commit message convention

### Final Review and Testing
- [ ] Test the full pre-commit hook workflow with various violations
- [ ] Verify CI pipeline runs correctly on a test PR
- [ ] Ensure branch protection works as expected
- [ ] Review and adjust any overly strict rules
- [ ] Update team on new CI/CD process

## Application Features
- [ ] Move translation assets -- text and images -- somewhere like vercel blob
- [ ] Refactor aggressively for readability, maintainability, testability
- [ ] Improve translation generation pipeline
    - Should be able to search for and select a project gutenberg book and get a full translation created and published to the site
    - This will require improving the "chunking" logic that is currently used, because it often gets tripped up with odd and inconsistent formatting from project gutenberg (eg paradise lost, each "chapter" is called a "book" and has no double line breaks, which often breaks the context window of the request)
    - Need to catch context window breaks / response breaks early -- if we hit a break, the whole thing needs to stop
- [ ] Landing page / home page needs to be spruced up, stronger marketing / conversion structure / style