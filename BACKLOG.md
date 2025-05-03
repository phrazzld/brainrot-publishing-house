# BACKLOG

- migrate from jest to vitest

## High Priority

### Issues from Vulnerability Scanning Implementation Code Review

- **[Fix]**: Re-enable CI Quality Gates (Tests and Strict Linting)

  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: The CI pipeline, the supposed gatekeeper, is currently crippled by commenting out both the strict linting (`lint:strict`) and the test execution (`npm test`) steps. This renders the CI pipeline fundamentally useless for its core purpose.
  - **Expected Outcome**: The CI configuration re-enables `npm run lint:strict` and `npm test`. Pre-existing issues are fixed in separate PRs.
  - **Dependencies**: Fixing linting issues and addressing test configuration issues.

- **[Refactor]**: Fix Mocking of Internal Collaborator in Download API Tests

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: The test directly mocks `@/utils` (`getAssetUrlWithFallback`), an internal utility function, not an external boundary. This creates a brittle test and violates the explicit prohibition against mocking internal collaborators.
  - **Expected Outcome**: The `GET` route handler accepts `getAssetUrlWithFallback` (or an interface it implements) via Dependency Injection. Tests inject the real function or a controlled fake implementation.
  - **Dependencies**: None

- **[Fix]**: Resolve Dependency Conflicts Instead of Using `--legacy-peer-deps`

  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: Using `npm ci --legacy-peer-deps` explicitly ignores peer dependency conflicts. This is a band-aid that masks underlying version incompatibilities or outdated dependencies.
  - **Expected Outcome**: Peer dependency conflicts identified and resolved. The `--legacy-peer-deps` flag removed once dependencies install cleanly.
  - **Dependencies**: None

- **[Fix]**: Enforce Strict Linting in CI
  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: Running `npm run lint` instead of `npm run lint:strict` allows the build to pass despite potentially hundreds of documented lint warnings and errors. This actively permits the accumulation of technical debt.
  - **Expected Outcome**: CI step changed to use `npm run lint:strict`. Lint errors fixed to meet the strict checks.
  - **Dependencies**: None

### Infrastructure: CI/CD, Quality Gates & Automation

- **[Feature]**: Implement Basic GitHub Actions CI Workflow (Lint, Test, Build)

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Establishes automated quality gates, ensuring code consistency, reducing manual effort, and enabling reliable deployments. Foundational for technical excellence.
  - **Expected Outcome**: A functional `.github/workflows/ci.yml` triggering on push/PR to master. Workflow installs dependencies (with caching), runs linters, executes tests (unit/integration), and verifies the application build completes successfully.
  - **Dependencies**: Linting, Testing, Build scripts defined in `package.json`.

- **[Feature]**: Setup Husky & Lint-Staged for Pre-commit Quality Checks

  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Provides immediate feedback to developers, enforces code style and quality standards locally before commits reach the repository, reducing CI failures. Improves developer experience.
  - **Expected Outcome**: Husky v9 and lint-staged installed and configured. Pre-commit hook automatically runs linters (ESLint) and formatters (Prettier) on staged files, preventing commits with violations. `prepare` script ensures hooks installation.
  - **Dependencies**: Linters and formatters configured.

- **[Feature]**: Setup Commitlint for Conventional Commits Enforcement

  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Ensures consistent commit history, enabling automated changelog generation, semantic versioning, and clearer code evolution tracking. Aligns with development philosophy.
  - **Expected Outcome**: Commitlint installed and configured with a `commit-msg` Husky hook. Commits not adhering to the Conventional Commits standard are rejected.
  - **Dependencies**: Husky setup.

- **[Feature]**: Configure Branch Protection Rules for `master` Branch
  - **Type**: Feature
  - **Complexity**: Simple
  - **Rationale**: Protects the production branch from direct pushes and ensures quality checks (CI, reviews) pass before merging, enforcing workflow standards and operational stability.
  - **Expected Outcome**: `master` branch requires Pull Requests, passing CI status checks, minimum number of reviewer approvals, prevents force pushes, and potentially requires linear history.
  - **Dependencies**: Basic CI Pipeline Setup

### Infrastructure: Logging & Observability

- **[Enhancement]**: Implement Structured Logging (JSON) & Remove Console Statements

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Essential for effective debugging, monitoring, and analysis in deployed environments. Replaces unreliable `console.log` with parseable, contextual logs. Mandatory per philosophy.
  - **Expected Outcome**: A structured logging library (e.g., Pino) integrated. All operational `console.*` calls replaced. Logs output JSON with mandatory fields (timestamp, level, message, service_name, correlation_id) in relevant environments.
  - **Dependencies**: Correlation ID Propagation

- **[Enhancement]**: Implement Correlation ID Propagation
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Enables tracing requests across asynchronous operations and potentially distributed services, crucial for debugging complex flows. Mandatory per philosophy.
  - **Expected Outcome**: A unique correlation ID generated for each incoming API request/job is included in all related structured log entries. Mechanisms like `AsyncLocalStorage` or context passing implemented.
  - **Dependencies**: Structured Logging Implementation

### Infrastructure: Testing & Quality

- **[Feature]**: Setup Comprehensive E2E Testing Framework (e.g., Playwright/Cypress)

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides the tooling foundation for verifying critical user journeys end-to-end, building confidence in the application's behavior. Required by testing strategy.
  - **Expected Outcome**: An E2E testing framework is installed, configured, integrated into `package.json` scripts, and potentially runnable within the CI pipeline.
  - **Dependencies**: Basic CI Pipeline Setup

- **[Enhancement]**: Enforce Test Coverage Thresholds in CI
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Maintains code quality by ensuring adequate test coverage and preventing regressions. Mandatory per philosophy.
  - **Expected Outcome**: Test runner configured to generate coverage reports. CI pipeline fails if coverage drops below predefined thresholds (e.g., 85%).
  - **Dependencies**: Basic CI Pipeline Setup, Test suite implementation.

### Technical Excellence: Refactoring & Architecture

- **[Refactor]**: Refactor API Routes for Clear Separation of Concerns

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Improves maintainability, testability, and adheres to architectural principles by decoupling business logic from framework-specific routing.
  - **Expected Outcome**: Business logic extracted from API route handlers into dedicated, testable service functions/modules. Route handlers become thin controllers.
  - **Dependencies**: None

- **[Refactor]**: Eliminate Internal Service Mocking in Tests via Dependency Injection

  - **Type**: Refactor
  - **Complexity**: Complex
  - **Rationale**: Critical for reliable testing and adherence to philosophy (No Internal Mocking). Ensures tests verify actual integration and encourages better design (DI).
  - **Expected Outcome**: Tests refactored to use dependency injection. Mocks are only used for true external boundaries (e.g., DB client, external API client interfaces). Internal modules used directly in integration tests.
  - **Dependencies**: Refactor API Routes (likely exposes services needing DI)

- **[Refactor]**: Implement Foundational Atomic Design Structure (Folders & Core Atoms)
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Establishes the mandatory component structure (Atoms, Molecules, Organisms), promoting UI consistency, reusability, and maintainability per frontend philosophy.
  - **Expected Outcome**: `components` directory restructured. Foundational UI primitives (Button, Input, Text, etc.) created/refactored as Atoms with appropriate styling (e.g., Tailwind).
  - **Dependencies**: None

### Developer Experience (DX)

- **[Feature]**: Setup Storybook & Create Stories for Core Atoms
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Enables mandatory Storybook-First workflow, providing isolated component development, visual documentation, and testing capabilities for UI primitives.
  - **Expected Outcome**: Storybook installed and configured. Stories demonstrating props, states, and variants created for all core Atom components.
  - **Dependencies**: Foundational Atomic Design Structure

### Core Application Features

- **[Feature]**: Configure and Verify Vercel Blob Storage Setup

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides scalable cloud storage essential for storing assets (text, audio).
  - **Expected Outcome**: Vercel Blob storage provisioned. `BLOB_READ_WRITE_TOKEN` secured and configured locally (`.env.local`) and in CI. Migration/verification scripts (T113-T117) tested and functional. `docs/BLOB_STORAGE.md` updated.
  - **Dependencies**: Basic CI Pipeline Setup (for secrets)

## Medium Priority

### Infrastructure: CI/CD, Quality Gates & Automation

- **[Enhancement]**: Configure CodeQL Security Scanning in CI
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Adds static analysis security testing (SAST) to automatically detect potential vulnerabilities in the application code itself.
  - **Expected Outcome**: GitHub Actions workflow includes CodeQL analysis step. Findings trigger alerts or notifications as configured.
  - **Dependencies**: Basic CI Pipeline Setup

### Infrastructure: Testing & Quality

- **[Feature]**: Implement E2E Tests for Critical User Flows
  - **Type**: Feature
  - **Complexity**: Complex
  - **Rationale**: Verifies core application functionality from a user's perspective (e.g., search, select book, view translation), ensuring key journeys work as expected. Builds confidence for releases.
  - **Expected Outcome**: Automated E2E tests covering primary user flows are implemented using the chosen framework and integrated into the CI pipeline.
  - **Dependencies**: E2E Testing Framework Setup, Core Application Features (UI for selection)

### Technical Excellence: Refactoring & Architecture

- **[Enhancement]**: Externalize All Environment-Specific Configuration

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Improves security, deployment flexibility, and adheres to Twelve-Factor App principles by removing hardcoded configuration. Mandatory per philosophy.
  - **Expected Outcome**: Codebase audited. All configuration values (API keys, feature flags, external URLs) loaded from environment variables. `.env` files used for local defaults, `.env.local` ignored.
  - **Dependencies**: None

- **[Enhancement]**: Implement Robust Input Validation in API Routes

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Enhances security and system robustness by preventing invalid or malicious data from entering API endpoints.
  - **Expected Outcome**: Input validation (e.g., using Zod schemas) applied to all API route handlers or service layers, checking types, formats, ranges, and required fields. Standardized errors returned for failures.
  - **Dependencies**: Standardized API Error Handling

- **[Enhancement]**: Standardize API Error Handling and Responses

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Provides consistent, predictable error communication from the API, improving client-side handling and developer experience.
  - **Expected Outcome**: Centralized error handling mechanism catches errors, logs them (with correlation ID), and maps them to standardized JSON error responses with appropriate HTTP status codes.
  - **Dependencies**: Structured Logging, Correlation ID Propagation

- **[Enhancement]**: Enforce Strict TypeScript Configuration
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Maximizes type safety, catching potential errors at compile time and improving code quality and maintainability. Mandatory per philosophy.
  - **Expected Outcome**: `tsconfig.json` configured with `strict: true` and other strictness flags. All resulting TypeScript errors resolved.
  - **Dependencies**: None

### UI & Component Architecture

- **[Refactor]**: Refactor Components into Atomic Molecules & Organisms

  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Continues implementation of Atomic Design, organizing composite components for better structure, reuse, and testability.
  - **Expected Outcome**: Existing UI components refactored and organized into `molecules` and `organisms` directories, composing lower-level atoms/molecules correctly.
  - **Dependencies**: Foundational Atomic Design Structure

- **[Enhancement]**: Create Storybook Stories for Core Molecules & Organisms

  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Expands Storybook coverage to composite UI components, enabling isolated development, testing, and documentation per frontend philosophy.
  - **Expected Outcome**: Storybook stories created for key Molecule and Organism components, demonstrating composition, props, states (loading/error), and interactions.
  - **Dependencies**: Storybook Setup, Refactor Components (Molecules/Organisms)

- **[Feature]**: Conduct Accessibility Audit (WCAG 2.1 AA) & Create Remediation Plan
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Ensures the application is usable by people with disabilities, meeting compliance requirements and ethical standards. Mandatory per philosophy.
  - **Expected Outcome**: Audit performed using automated tools and manual checks. A prioritized backlog of issues detailing WCAG 2.1 AA violations created for remediation.
  - **Dependencies**: Basic UI implemented.

### Core Application Features

- **[Feature]**: Develop UI for Book Selection & Translation Initiation

  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides the primary user interface for interacting with the core translation feature, enabling users to select content. Drives business value.
  - **Expected Outcome**: Frontend components allowing users to search/select a book and trigger the translation pipeline via the secure API. UI provides feedback on job status.
  - **Dependencies**: Secure API Authentication, Foundational Atomic Design components.

- **[Feature]**: Migrate Existing/Generated Translation Assets to Vercel Blob
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Moves translation data to scalable cloud storage, improving performance and reliability. Completes the Vercel Blob integration.
  - **Expected Outcome**: All necessary translation assets (text, potentially audio/images later) stored in Vercel Blob. Application reads assets from Blob storage. Local asset cleanup performed (T116, T117).
  - **Dependencies**: Vercel Blob Storage Setup, Translation Pipeline generates assets.

### Business & Value Delivery

- **[Feature]**: Redesign & Implement Landing Page for Marketing/Conversion
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Improves user acquisition and communicates the project's value proposition effectively. Addresses identified need to enhance the current landing page.
  - **Expected Outcome**: A new, implemented landing page with improved visual design, clearer messaging, stronger calls-to-action, adhering to accessibility and responsive design standards.
  - **Dependencies**: Foundational Atomic Design components.

### Developer Experience (DX) & Documentation

- **[Documentation]**: Create Comprehensive CONTRIBUTING.md
  - **Type**: Documentation
  - **Complexity**: Simple
  - **Rationale**: Provides clear guidelines for contributors, streamlining onboarding and ensuring consistency in development practices.
  - **Expected Outcome**: A detailed `CONTRIBUTING.md` file covering project setup, development workflow, coding standards, testing strategy, commit conventions, PR process, and links to key resources.
  - **Dependencies**: Key processes (CI, Commitlint, Testing) established.

## Low Priority

### Technical Debt & Maintenance

- **[Refactor]**: Avoid Broad Lint Rule Suppression for Require Usage

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Disabling the `no-require-imports` rule across all test and mock files is overly broad. It prevents the linter from flagging CommonJS `require` usage, hindering the adoption of standard ES Modules.
  - **Expected Outcome**: The rule is re-enabled. Where `require` is absolutely necessary, targeted inline `eslint-disable-next-line` comments are used with justifications, or more specific file patterns in the override applied only for unavoidable cases.
  - **Dependencies**: None

- **[Refactor]**: Improve Type Safety in API Tests

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Casting partial mock objects to the full type using `as NextRequest` bypasses TypeScript's structural type checking, potentially leading to false positives or unexpected failures.
  - **Expected Outcome**: The `MockNextRequest` interface is enhanced to include all properties of `NextRequest` actually accessed by the handler. Type assertions are minimized to ensure the mock structurally matches the required parts of the real type.
  - **Dependencies**: None

- **[Refactor]**: Simplify NextResponse Mocking in API Tests

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: The current mock for `next/server` includes a detailed implementation for `NextResponse.json` that couples the test to internal implementation details of `NextResponse`, making it brittle if Next.js changes.
  - **Expected Outcome**: The mock is simplified. Tests assert properties on the returned `NextResponse` instance instead of mocking the `NextResponse.json` static method itself.
  - **Dependencies**: None

- **[Refactor]**: Remove Redundant Partial Mock Interface

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: The `MockNextRequest` interface defining only `{ url: string; }` adds verbosity without significant type safety benefit, especially since type assertion is used anyway.
  - **Expected Outcome**: The interface is removed and mock objects are defined inline before casting.
  - **Dependencies**: None

- **[Fix]**: Add Missing Newlines at End of Files

  - **Type**: Fix
  - **Complexity**: Simple
  - **Rationale**: Missing newlines at the end of files can cause issues with some POSIX tools and creates inconsistency in the codebase.
  - **Expected Outcome**: Trailing newline characters added to all affected files.
  - **Dependencies**: None

- **[Enhancement]**: Add Tracking References to TODO Comments

  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: TODO comments without links to backlog items or issue trackers are easily lost and lack accountability.
  - **Expected Outcome**: TODO comments updated to include specific ticket numbers for tracking and accountability.
  - **Dependencies**: None

- **[Refactor]**: Audit and Minimize Project Dependencies

  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Reduces bundle size, potential security vulnerabilities, and maintenance overhead by removing unused or evaluating heavy dependencies.
  - **Expected Outcome**: `package.json` reviewed. Unused dependencies removed. Report on potential replacements for large/unmaintained libraries.
  - **Dependencies**: Project features stabilizing.

- **[Enhancement]**: Automate Dependency Updates (Renovate/Dependabot)

  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Keeps dependencies current with security patches and bug fixes with minimal manual effort. Reduces technical debt accumulation.
  - **Expected Outcome**: Renovate or Dependabot configured to automatically create PRs for dependency updates, verified by CI pipeline.
  - **Dependencies**: Basic CI Pipeline Setup

- **[Refactor]**: Refactor Migration Scripts for Testability and Modularity
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Improves the reliability and maintainability of setup or data migration scripts (e.g., Vercel Blob migration).
  - **Expected Outcome**: Complex script logic broken into smaller, testable functions. Dry-run modes enhanced.
  - **Dependencies**: Vercel Blob Migration Complete.

### UI & Component Architecture

- **[Enhancement]**: Implement React Error Boundaries for Key UI Sections
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Improves UI resilience by catching rendering errors gracefully, preventing a full application crash for the user.
  - **Expected Outcome**: React Error Boundary components wrap major UI layouts/sections, displaying a fallback UI and logging the error.
  - **Dependencies**: Stable UI Structure, Structured Logging.

### Developer Experience (DX) & Documentation

- **[Documentation]**: Add TSDoc Documentation to Public APIs & Complex Logic

  - **Type**: Documentation
  - **Complexity**: Medium
  - **Rationale**: Improves code understanding, maintainability, and IDE support by documenting interfaces and complex implementations.
  - **Expected Outcome**: TSDoc comments added to exported functions, classes, types, and complex internal algorithms, explaining purpose, params, returns, and potential errors.
  - **Dependencies**: Codebase structure stabilizing.

- **[Documentation]**: Add CI Badge and Finalize Workflow Documentation
  - **Type**: Documentation
  - **Complexity**: Simple
  - **Rationale**: Improves project visibility and provides clear documentation for development processes.
  - **Expected Outcome**: CI status badge added to README.md. CONTRIBUTING.md updated with final details on CI/CD, pre-commit hooks, testing, etc.
  - **Dependencies**: CI/CD setup complete, CONTRIBUTING.md drafted.

### Accessibility & User Experience

- **[Enhancement]**: Remediate Accessibility Issues from Audit
  - **Type**: Enhancement
  - **Complexity**: Complex
  - **Rationale**: Addresses identified accessibility barriers, ensuring the application is inclusive and compliant with WCAG 2.1 AA standards.
  - **Expected Outcome**: Issues identified in the accessibility audit are resolved through code changes and verified via re-testing.
  - **Dependencies**: Accessibility Audit Completion.

## Future Considerations

### Innovation & Exploration

- **[Research]**: Explore Support for Additional Content Sources
  - **Type**: Research
  - **Complexity**: Medium
  - **Rationale**: Investigate feasibility of integrating content from sources beyond Project Gutenberg (e.g., fanfiction sites, other public domain libraries) to expand user appeal.
  - **Expected Outcome**: Feasibility study on 1-2 potential sources, covering technical challenges, legal/ethical considerations, and estimated effort.

### Operational Excellence

- **[Enhancement]**: Implement Distributed Tracing (e.g., OpenTelemetry)

  - **Type**: Enhancement
  - **Complexity**: Complex
  - **Rationale**: Provides deep visibility into request flows for debugging performance bottlenecks, especially if the system grows in complexity.
  - **Expected Outcome**: OpenTelemetry SDK integrated. Trace context propagated. Spans generated for key operations. Traces exportable to a backend.
  - **Dependencies**: Correlation ID Propagation.

- **[Enhancement]**: Implement Real User Monitoring (RUM) & Enhanced Error Tracking (Sentry/LogRocket)
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Gain insights into real-world user performance and capture frontend errors more effectively than basic logging.
  - **Expected Outcome**: RUM tool integrated to track Core Web Vitals and user interactions. Enhanced error tracking service captures and aggregates frontend/backend errors.

### Product Expansion

- **[Feature]**: User Accounts & Reading History
  - **Type**: Feature
  - **Complexity**: Complex
  - **Rationale**: Enable personalization, user retention, and potentially community features by allowing users to register, log in, and save their reading history.
  - **Expected Outcome**: Secure authentication system implemented. User profiles and database schema for storing user data and reading history. UI for login/signup and managing saved items.
