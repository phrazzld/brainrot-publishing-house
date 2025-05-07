# BACKLOG

This backlog outlines planned work, balancing immediate needs, technical excellence, operational stability, and future innovation, guided by the provided development philosophy documents and codebase analysis.

## High Priority

### Infrastructure: CI/CD, Quality Gates & Automation

- **[Fix]**: Re-enable and Stabilize CI Quality Gates (Tests and Strict Linting)

  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: The CI pipeline currently bypasses mandatory quality checks (`lint:strict`, `npm test`). This violates fundamental quality gate principles and allows technical debt accumulation. Re-enabling is critical for code reliability and adherence to philosophy.
  - **Expected Outcome**: CI configuration (`.github/workflows/ci.yml`) updated to execute `npm run lint:strict` and `npm test`. Pipeline fails if these checks do not pass. Pre-existing issues preventing this are addressed by dependent items below.
  - **Dependencies**: [Fix]: Enforce Strict Linting in CI & Address Violations, [Fix]: Resolve Dependency Conflicts, [Refactor]: Eliminate Internal Service Mocking in Tests via Dependency Injection.

- **[Fix]**: Enforce Strict Linting in CI & Address Violations

  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: Running non-strict linting allows code quality issues to accumulate, violating mandatory coding standards. Enforcing `lint:strict` is essential for maintainability and technical excellence.
  - **Expected Outcome**: CI step changed from `npm run lint` to `npm run lint:strict`. All existing lint errors/warnings violating the strict configuration are fixed across the codebase. Pre-commit hooks updated accordingly.
  - **Dependencies**: [Fix]: Re-enable and Stabilize CI Quality Gates.

- **[Fix]**: Resolve Dependency Conflicts (Remove `--legacy-peer-deps`)

  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: Using `--legacy-peer-deps` masks underlying dependency incompatibilities, risking runtime errors and violating disciplined dependency management principles. Resolving conflicts ensures a stable and reliable build.
  - **Expected Outcome**: `npm ci` runs successfully without the `--legacy-peer-deps` flag. All peer dependency conflicts identified and resolved through dependency updates or necessary version adjustments.
  - **Dependencies**: None (requires investigation).

- **[Feature]**: Implement Basic GitHub Actions CI Workflow (Lint, Test, Build)

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Establishes the foundational automated quality gates required by the development philosophy, ensuring code consistency, reducing manual effort, and enabling reliable deployments. Foundational for technical excellence.
  - **Expected Outcome**: A functional `.github/workflows/ci.yml` triggering on push/PR to the main branch. Workflow installs dependencies (with caching), runs linters (`lint:strict`), executes tests (`npm test`), and verifies the application build (`npm run build`) completes successfully.
  - **Dependencies**: Linting, Testing, Build scripts defined in `package.json`.

- **[Feature]**: Setup Husky & Lint-Staged for Pre-commit Quality Checks

  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Provides immediate feedback to developers locally, enforcing code style (Prettier) and quality standards (ESLint strict) before commits reach the repository. Reduces CI failures and improves DX, as mandated by philosophy's automation principles.
  - **Expected Outcome**: Husky v9+ and lint-staged installed and configured. Pre-commit hook automatically runs Prettier formatter and ESLint (`lint:strict`) on staged files, preventing commits with violations. `prepare` script ensures hooks installation.
  - **Dependencies**: Prettier & ESLint configured.

- **[Feature]**: Setup Commitlint for Conventional Commits Enforcement

  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Enforces the mandatory Conventional Commits standard for consistent history, enabling automated changelog generation, semantic versioning, and clearer code evolution tracking per philosophy.
  - **Expected Outcome**: Commitlint installed and configured with a `commit-msg` Husky hook. Commits not adhering to the Conventional Commits standard are rejected.
  - **Dependencies**: Husky Setup.

- **[Feature]**: Configure Branch Protection Rules for Main Branch
  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Protects the primary branch (`master`/`main`) from direct pushes and ensures mandatory quality checks (CI, reviews) pass before merging. Enforces workflow standards and operational stability per philosophy.
  - **Expected Outcome**: Main branch requires Pull Requests, passing CI status checks (linting, tests, build), minimum number of reviewer approvals (e.g., 1), prevents force pushes, and requires linear history.
  - **Dependencies**: Basic CI Pipeline Setup.

### Infrastructure: Observability

- **[Enhancement]**: Implement Structured Logging (JSON) & Remove Console Statements

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Mandatory per philosophy's Logging Strategy for effective debugging, monitoring, and analysis in deployed environments. Replaces unreliable `console.log` with parseable, contextual logs. Foundational for operational excellence.
  - **Expected Outcome**: A standard structured logging library (e.g., Pino) integrated. All operational `console.*` calls replaced with logger calls. Logs output JSON with mandatory fields (timestamp, level, message, service_name, correlation_id) in relevant environments.
  - **Dependencies**: [Enhancement]: Implement Correlation ID Propagation.

- **[Enhancement]**: Implement Correlation ID Propagation
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Mandatory per philosophy's Logging Strategy for tracing requests across asynchronous operations, crucial for debugging complex flows and effective structured logging. Enables future distributed tracing.
  - **Expected Outcome**: A unique correlation ID generated for each incoming API request/job is reliably propagated (e.g., via `AsyncLocalStorage`) and included in all related structured log entries.
  - **Dependencies**: Structured Logging Implementation.

### Technical Excellence: Architecture & Refactoring

- **[Refactor]**: Eliminate Internal Service Mocking in API Tests via Dependency Injection

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: The current Download API test mocks an internal utility (`@/utils`), violating the **critical** philosophy rule against mocking internal collaborators. This creates brittle tests and requires immediate refactoring for reliable testing and adherence to Dependency Inversion.
  - **Expected Outcome**: The `GET` route handler (or its extracted service logic) accepts dependencies like `getAssetUrlWithFallback` via constructor/parameter injection. The test injects the real utility or a controlled fake implementation conforming to an interface. The direct mock of `@/utils` is removed.
  - **Dependencies**: Potentially [Refactor]: Refactor API Routes for Clear Separation of Concerns.

- **[Refactor]**: Refactor API Routes for Clear Separation of Concerns

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Improves maintainability, testability, and adheres to architectural principles (Separation of Concerns, Dependency Inversion) by decoupling business logic from framework-specific routing. Essential for testability without internal mocking.
  - **Expected Outcome**: Business logic extracted from API route handlers into dedicated, framework-agnostic, testable service functions/classes/modules. Route handlers become thin controllers responsible only for request/response mapping and calling services.
  - **Dependencies**: None.

- **[Enhancement]**: Enforce Strict TypeScript Configuration
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Maximizes type safety, catching potential errors at compile time and improving code quality and maintainability. Mandatory per TypeScript appendix philosophy (`strict: true`).
  - **Expected Outcome**: `tsconfig.json` configured with `strict: true` and other recommended strictness flags. All resulting TypeScript errors across the codebase are resolved.
  - **Dependencies**: None.

### UI & Component Architecture (Frontend Focus)

- **[Refactor]**: Implement Foundational Atomic Design Structure (Folders & Core Atoms)

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Establishes the mandatory Atomic Design component structure required by the frontend philosophy, promoting UI consistency, reusability, and maintainability. Foundational for scalable UI development.
  - **Expected Outcome**: `components` directory restructured into `atoms`, `molecules`, `organisms`. Foundational UI primitives (Button, Input, Text, Label, etc.) created/refactored as Atoms within `/atoms`, adhering to styling standards (Tailwind) and accessibility basics.
  - **Dependencies**: None.

- **[Feature]**: Setup Storybook & Create Stories for Core Atoms
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Enables the mandatory Storybook-First workflow defined in the frontend philosophy. Provides isolated component development, visual documentation, and testing capabilities for UI primitives. Improves DX.
  - **Expected Outcome**: Storybook installed, configured, and integrated. Stories (`*.stories.tsx`) demonstrating props, states, and variants created for all core Atom components. Storybook build potentially integrated into CI.
  - **Dependencies**: Foundational Atomic Design Structure (Core Atoms defined).

### Infrastructure: Storage

- **[Feature]**: Configure and Verify Vercel Blob Storage Setup

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides scalable cloud storage essential for storing application assets (e.g., book content). Foundational infrastructure for core features and operational stability.
  - **Expected Outcome**: Vercel Blob storage provisioned. `BLOB_READ_WRITE_TOKEN` secured via environment variables. Relevant setup/migration/verification scripts tested and functional. `docs/BLOB_STORAGE.md` updated.
  - **Dependencies**: Basic CI Pipeline Setup (for secrets management).

- **[Feature]**: Create CDN URL Verification Tool ✅

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Helps diagnose download issues by testing CDN URL generation and accessibility across environments. Ensures URLs are correctly formatted and resolving properly, improving audio download reliability.
  - **Expected Outcome**: Script for testing CDN URL generation with HTTP accessibility checks, environment comparison functionality, and detailed reporting. Documentation in `docs/CDN_URL_VERIFICATION.md`.
  - **Status**: Completed with `verifyCdnUrls.ts` and `verifyAudioUrls.ts` scripts. Issues discovered and documented in `URL_VERIFICATION_REPORT.md` and `ENVIRONMENT_VARIABLE_ANALYSIS.md`.
  - **Dependencies**: None.

- **[Feature]**: Complete Digital Ocean Spaces Migration and Cleanup ✅
  - **Type**: Feature
  - **Complexity**: High
  - **Rationale**: Remove all dependencies on Digital Ocean Spaces after successful migration to Vercel Blob to simplify the codebase, reduce dependencies, and eliminate need for maintaining multiple storage providers. This is now a critical priority based on URL verification findings showing path inconsistencies.
  - **Expected Outcome**: All Digital Ocean assets migrated to Vercel Blob with consistent paths, unified asset service implementation, all Digital Ocean references removed from codebase, download service refactored to use only Vercel Blob, download API route handler simplified, all tests updated, comprehensive documentation created.
  - **Status**: In progress. Detailed 5-phase migration plan created in docs/MIGRATION_PLAN.md with comprehensive TODO list. Initial inventory script created.
  - **Dependencies**: None - this is now a top priority based on investigation findings.

### Core Application Features & Cleanup

- **[Refactor]**: Remove Deprecated Translation Functionality
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Cleans up codebase by removing the explicitly deprecated `/translate` functionality (API, UI, tests), reducing complexity, maintenance overhead, and potential security surface. Aligns with Simplicity First principle.
  - **Expected Outcome**: All code, tests, UI components, API routes, and documentation related to the `/translate` feature are completely removed from the repository.
  - **Dependencies**: None.

## Medium Priority

### Infrastructure & Operational Excellence

- **[Enhancement]**: Configure CodeQL Security Scanning in CI

  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Adds static analysis security testing (SAST) to automatically detect potential vulnerabilities, improving security posture per philosophy.
  - **Expected Outcome**: GitHub Actions workflow includes CodeQL analysis step. Findings trigger alerts or notifications.
  - **Dependencies**: Basic CI Pipeline Setup.

- **[Enhancement]**: Externalize All Environment-Specific Configuration

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Improves security, deployment flexibility, and adheres to Twelve-Factor App principles. Mandatory per Configuration Management philosophy section.
  - **Expected Outcome**: All configuration values loaded strictly from environment variables. `.env` files used for local development defaults, `.env.local` ignored. Strongly-typed config objects populated from environment variables.
  - **Dependencies**: None.

- **[Enhancement]**: Implement Robust Input Validation in API Routes

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Enhances security and system robustness by preventing invalid or malicious data entry. A core Security Consideration.
  - **Expected Outcome**: Input validation libraries (e.g., Zod) applied to all API route handlers or service layers. Schemas define expected types, formats, etc. Standardized validation errors returned.
  - **Dependencies**: [Enhancement]: Standardize API Error Handling and Responses.

- **[Enhancement]**: Standardize API Error Handling and Responses

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Provides consistent, predictable error communication, improving client-side handling and DX, per philosophy's Consistent Error Handling principle.
  - **Expected Outcome**: Centralized error handling mechanism catches errors, logs them (with correlation ID), and maps them to standardized JSON error responses with appropriate HTTP status codes.
  - **Dependencies**: Structured Logging, Correlation ID Propagation.

- **[Enhancement]**: Enforce Test Coverage Thresholds in CI
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Maintains code quality by ensuring adequate test coverage and preventing regressions. Mandatory per Testing Strategy in philosophy.
  - **Expected Outcome**: Test runner configured for coverage reports. CI pipeline fails if coverage drops below predefined thresholds (e.g., 85%).
  - **Dependencies**: Basic CI Pipeline Setup, Test suite implementation.

### Testing & Quality

- **[Feature]**: Setup Comprehensive E2E Testing Framework (e.g., Playwright/Cypress)

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides the tooling foundation for verifying critical user journeys end-to-end, building confidence in application behavior as required by the frontend testing strategy.
  - **Expected Outcome**: An E2E testing framework (e.g., Playwright) installed, configured, integrated into `package.json` scripts, and potentially runnable within CI. Basic setup structure established.
  - **Dependencies**: Basic CI Pipeline Setup, A deployable version of the application.

- **[Feature]**: Implement E2E Tests for Critical User Flows
  - **Type**: Feature
  - **Complexity**: Complex
  - **Rationale**: Verifies core application functionality from a user's perspective (e.g., search, select book, view content), ensuring key journeys work reliably. Fulfills mandatory E2E testing requirement.
  - **Expected Outcome**: Automated E2E tests covering primary user flows implemented using the chosen framework. Tests integrated into the CI pipeline and run against preview deployments or a test environment.
  - **Dependencies**: E2E Testing Framework Setup, Core Application Features (UI for selection, content view).

### UI & Component Architecture (Frontend Focus)

- **[Refactor]**: Refactor Existing Components into Atomic Molecules & Organisms

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Continues mandatory implementation of Atomic Design, organizing composite components for better structure, reuse, and testability per frontend philosophy.
  - **Expected Outcome**: Existing UI components refactored and organized into `molecules` and `organisms` directories, correctly composing lower-level atoms/molecules.
  - **Dependencies**: Foundational Atomic Design Structure (Core Atoms defined).

- **[Enhancement]**: Create Storybook Stories for Core Molecules & Organisms

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Expands Storybook coverage to composite UI components, enabling isolated development, testing, and documentation per mandatory Storybook-First frontend philosophy. Improves DX.
  - **Expected Outcome**: Storybook stories created for key Molecule and Organism components, demonstrating composition, props, various states, and interactions.
  - **Dependencies**: Storybook Setup, Refactor Components into Atomic Molecules & Organisms.

- **[Feature]**: Conduct Accessibility Audit (WCAG 2.1 AA) & Create Remediation Plan
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Ensures the application is usable by people with disabilities, meeting mandatory compliance requirements (WCAG 2.1 AA) and ethical standards per frontend philosophy.
  - **Expected Outcome**: Audit performed using automated tools and manual checks. A prioritized backlog of distinct, actionable accessibility issues created for remediation.
  - **Dependencies**: Basic UI implemented for core features.

### Core Application Features

- **[Feature]**: Develop UI for Book Selection & Content Display

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides the primary user interface for core application features: finding books and viewing content. Drives business value and user adoption.
  - **Expected Outcome**: Frontend components (built using Atomic Design) allowing users to search/browse/select a book and view its content fetched from storage. UI provides feedback for loading/error states.
  - **Dependencies**: Backend API for book data, Foundational Atomic Design components, Vercel Blob Storage Setup.

- **[Feature]**: Migrate Existing/Generated Content Assets to Vercel Blob
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Moves application content to scalable cloud storage, improving performance, reliability, and completing the Blob integration. Aligns with operational excellence.
  - **Expected Outcome**: All necessary content assets stored in Vercel Blob. Application reads assets from Blob storage URLs. Local asset storage removed. Migration scripts created if needed.
  - **Dependencies**: Vercel Blob Storage Setup, Content generation/acquisition process.

### Business & Value Delivery

- **[Feature]**: Redesign & Implement Landing Page for Marketing/Conversion
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Improves user acquisition and communicates the project's value proposition effectively. Addresses potential need to enhance the current landing page for clarity and engagement. Drives business value.
  - **Expected Outcome**: A new, implemented landing page with improved visual design, clearer messaging, stronger calls-to-action, adhering to accessibility and responsive design standards. Built using established Atomic Design components.
  - **Dependencies**: Foundational Atomic Design components.

### Developer Experience (DX) & Documentation

- **[Documentation]**: Create Comprehensive CONTRIBUTING.md

  - **Type**: Documentation
  - **Complexity**: Simple
  - **Rationale**: Provides clear guidelines for contributors, streamlining onboarding and ensuring consistency in development practices per philosophy. Improves DX.
  - **Expected Outcome**: A detailed `CONTRIBUTING.md` file covering project setup, development workflow (pre-commit hooks, Storybook), coding standards, testing strategy, commit conventions, PR process, and links to key resources.
  - **Dependencies**: Key processes (CI, Commitlint, Testing Strategy, Storybook) established.

- **[Refactor]**: Migrate from Jest to Vitest
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Vitest offers significantly faster test execution, improving developer feedback loops and CI times. This is a direct improvement to Developer Experience (DX) and Automation efficiency.
  - **Expected Outcome**: Jest removed, Vitest installed and configured. All existing tests pass using Vitest. CI pipeline updated.
  - **Dependencies**: Existing test suite.

## Low Priority

### Technical Debt & Maintenance

- **[Refactor]**: Avoid Broad Lint Rule Suppression for `require` Usage

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Disabling `no-require-imports` broadly hinders ES Module adoption and hides potential issues. Fixing this aligns with philosophy principles.
  - **Expected Outcome**: Global suppression removed. Targeted inline suppressions with justification used only where unavoidable. Code refactored to use `import` where possible.
  - **Dependencies**: None.

- **[Refactor]**: Improve Type Safety in API Test Mocks (`NextRequest`)

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Using `as NextRequest` for partial mocks bypasses TypeScript's checks, violating type diligence principles. Improving this increases test reliability.
  - **Expected Outcome**: Mocks used in API tests structurally match required parts of `NextRequest`, minimizing unsafe assertions.
  - **Dependencies**: None.

- **[Refactor]**: Simplify `NextResponse` Mocking in API Tests

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Mocking static methods like `NextResponse.json` couples tests to framework implementation details. Simplifying makes tests more robust.
  - **Expected Outcome**: Tests refactored to avoid mocking `NextResponse.json` directly. Assertions made on the properties of the returned instance.
  - **Dependencies**: None.

- **[Fix]**: Add Missing Newlines at End of Files

  - **Type**: Fix
  - **Complexity**: Simple
  - **Rationale**: Ensures consistency and compatibility with POSIX tools. Minor code quality fix.
  - **Expected Outcome**: All text files end with a single newline character. Enforced via Prettier/EditorConfig.
  - **Dependencies**: None.

- **[Enhancement]**: Add Tracking References (Ticket IDs) to TODO Comments

  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: TODOs without tracking are easily lost. Linking them to backlog items ensures visibility and accountability for technical debt.
  - **Expected Outcome**: Codebase scanned for TODO comments. Each valid TODO updated to include a corresponding backlog item ID.
  - **Dependencies**: Backlog established.

- **[Refactor]**: Audit and Minimize Project Dependencies

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Reduces bundle size, potential security vulnerabilities, build times, and maintenance overhead. Aligns with disciplined dependency management.
  - **Expected Outcome**: `package.json` reviewed using tools like `depcheck`. Unused dependencies removed. Report generated on potentially large dependencies.
  - **Dependencies**: Project features stabilizing.

- **[Enhancement]**: Automate Dependency Updates (Renovate/Dependabot)

  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Keeps dependencies current with security patches and bug fixes with minimal manual effort, reducing technical debt accumulation per philosophy.
  - **Expected Outcome**: Renovate Bot or Dependabot configured. Automatically creates PRs for dependency updates, verified by CI.
  - **Dependencies**: Basic CI Pipeline Setup (stable).

- **[Refactor]**: Refactor Migration Scripts for Testability and Modularity
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Improves the reliability and maintainability of setup or data migration scripts. Aligns with modularity and testability principles.
  - **Expected Outcome**: Complex script logic broken into smaller, testable functions. Enhanced logging and error handling. Dry-run modes implemented or improved. Tests added.
  - **Dependencies**: Vercel Blob Migration Complete (or scripts defined).

### UI & Component Architecture (Frontend Focus)

- **[Enhancement]**: Implement React Error Boundaries for Key UI Sections
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Improves UI resilience by catching rendering errors gracefully, preventing a full application crash for the user, enhancing UX.
  - **Expected Outcome**: React Error Boundary components implemented and wrapped around major UI layouts/sections. Fallback UI displayed on error. Errors captured and logged.
  - **Dependencies**: Stable UI Structure, Structured Logging.

### Developer Experience (DX) & Documentation

- **[Documentation]**: Add TSDoc Documentation to Public APIs & Complex Logic

  - **Type**: Documentation
  - **Complexity**: Medium
  - **Rationale**: Improves code understanding, maintainability, and IDE support by documenting interfaces and complex implementations per documentation philosophy.
  - **Expected Outcome**: TSDoc comments added to all exported members and key complex internal functions/classes, explaining purpose, params, returns, etc.
  - **Dependencies**: Codebase structure stabilizing.

- **[Documentation]**: Add CI Badge and Finalize Workflow Documentation
  - **Type**: Documentation
  - **Complexity**: Simple
  - **Rationale**: Improves project visibility (CI status) and provides clear, finalized documentation for development processes.
  - **Expected Outcome**: CI status badge added to README.md. CONTRIBUTING.md updated with final details on CI/CD, pre-commit hooks, testing, Storybook, etc.
  - **Dependencies**: CI/CD setup complete, CONTRIBUTING.md drafted.

### Accessibility & User Experience

- **[Enhancement]**: Remediate Accessibility Issues from Audit (WCAG 2.1 AA)
  - **Type**: Enhancement
  - **Complexity**: Complex (effort depends on audit findings)
  - **Rationale**: Addresses identified accessibility barriers based on the audit, ensuring the application is inclusive and compliant with mandatory WCAG 2.1 AA standards per frontend philosophy.
  - **Expected Outcome**: Issues identified in the accessibility audit backlog are systematically resolved through code changes and verified via re-testing.
  - **Dependencies**: Accessibility Audit Completion and Remediation Plan.

## Future Considerations

Items valuable for the long-term vision but not prioritized for immediate development cycles.

### Innovation & Exploration

- **[Research]**: Explore Support for Additional Content Sources

  - **Type**: Research
  - **Complexity**: Medium
  - **Rationale**: Investigate feasibility of integrating content from sources beyond the initial scope to expand user appeal and application value. Informs future roadmap.
  - **Expected Outcome**: A feasibility study document outlining 1-2 potential new content sources, including technical challenges, legal/licensing considerations, effort estimates, and user value.

- **[Research]**: Investigate AI-Powered Features (Summarization, Analysis)
  - **Type**: Research
  - **Complexity**: Medium
  - **Rationale**: Explore the potential of integrating AI/LLM capabilities to offer value-added features around the core content. Drives innovation.
  - **Expected Outcome**: Research spike identifying potential AI features, evaluating models/APIs, assessing feasibility, cost, and UX benefits. PoC if warranted.

### Operational Excellence

- **[Enhancement]**: Implement Distributed Tracing (e.g., OpenTelemetry)

  - **Type**: Enhancement
  - **Complexity**: Complex
  - **Rationale**: Provides deep visibility into request flows across services (if architecture becomes distributed) for debugging performance bottlenecks and understanding system interactions. Aligns with advanced observability goals.
  - **Expected Outcome**: OpenTelemetry SDK integrated. Trace context propagated. Spans generated for key operations. Traces exportable to a compatible backend.
  - **Dependencies**: Correlation ID Propagation, Structured Logging. Decision on distributed architecture.

- **[Enhancement]**: Implement Real User Monitoring (RUM) & Enhanced Error Tracking (Sentry/LogRocket)
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Gain insights into real-world user performance (Core Web Vitals) and capture frontend errors with more context (session replay) than basic logging alone. Improves operational awareness.
  - **Expected Outcome**: RUM tool integrated to track Core Web Vitals. Enhanced error tracking service integrated to capture and aggregate frontend/backend errors with rich context.
  - **Dependencies**: Stable frontend application deployment.

### Product Expansion

- **[Feature]**: User Accounts & Reading History/Bookmarks
  - **Type**: Feature
  - **Complexity**: Complex
  - **Rationale**: Enable personalization, user retention, and cross-device synchronization. Significant business value potential through increased engagement.
  - **Expected Outcome**: Secure authentication system implemented. User profile management UI. Database schema extensions. Backend APIs for managing user data. UI integration for login/signup and accessing saved state.
  - **Dependencies**: Secure API Authentication (if applicable), Persistent Storage (Database).
