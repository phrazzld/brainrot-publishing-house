# TODO

## ESLint Build Failure Fixes

- [x] T1: Setup Local Development Environment  
  Action: Clone the repo, install dependencies (`npm install`), and verify linting scripts locally (e.g., `npm run lint`). Confirm that the same ESLint errors observed in the CI pipeline appear locally.  
  Depends On: None  
  AC Ref: None

- [ ] T2: Fix `no-explicit-any` Violations
  Action: Search for all instances of the `any` type flagged by ESLint (`@typescript-eslint/no-explicit-any`) and replace them with precise types, `unknown` with guards, or proper interfaces. Ensure no `any` remains.
  Depends On: T1
  AC Ref: None

- [ ] T3: Remove Unused Variables and Imports
  Action: Identify all variables, function parameters, and imports flagged by `@typescript-eslint/no-unused-vars` and remove or rename (prefix with `_` if intentionally unused) so that no unused symbols remain.
  Depends On: T2
  AC Ref: None

- [ ] T4: Add Keyboard Event Handlers to Interactive Elements
  Action: For all clickable non-interactive elements (e.g., `<div onClick>`), either convert them to semantic `<button>` elements or add `role="button"`, `tabIndex={0}`, and appropriate `onKeyDown` handlers (handling Enter/Space).
  Depends On: T3
  AC Ref: None

- [ ] T5: Associate Form Labels with Controls
  Action: Update all `<label>` elements flagged by `jsx-a11y/label-has-associated-control` to use `htmlFor` with matching `id` attributes on inputs or to wrap the form control inside the label.
  Depends On: T4
  AC Ref: None

- [ ] T6: Refactor Long Functions to Reduce Length
  Action: Identify functions/components exceeding the `max-lines-per-function` threshold and extract logical sections into smaller helper functions or subcomponents so each function stays within the configured line limit.
  Depends On: T5
  AC Ref: None

- [ ] T7: Refactor Functions with Too Many Parameters
  Action: Locate functions violating `max-params` (e.g., `translateChunk`, API handlers) and refactor their signatures to accept a single options object or grouped parameters to reduce individual argument count.
  Depends On: T6
  AC Ref: None

- [ ] T8: Remove All `console.log` Statements
  Action: Search for and delete any `console.log`, `console.warn`, `console.error`, etc., replacing them with the project's structured logging API if runtime logging is required.
  Depends On: T7
  AC Ref: None

- [ ] T9: Apply Prettier Formatting Fixes
  Action: Run the Prettier formatter across the codebase (e.g., `npx prettier --write .`) or manually adjust files to satisfy formatting rules.
  Depends On: T8
  AC Ref: None

- [ ] T10: Implement Pre-commit Hooks for Linting and Formatting
  Action: Install and configure Husky and lint-staged to run `eslint --fix` and `prettier --write` on staged files before every commit, preventing future violations from being committed.
  Depends On: T9
  AC Ref: None

- [ ] T11: Verify Fix and CI Build
  Action: Run `npm run lint`, `npm run build`, and full test suite locally to confirm no ESLint errors or warnings remain and that the build succeeds. Push changes and ensure the Vercel CI pipeline passes without errors.
  Depends On: T10
  AC Ref: None
