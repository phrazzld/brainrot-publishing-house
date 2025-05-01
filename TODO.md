# TODO

## High Priority Tasks

- [x] T224: Replace raw wavesurfer.js with @wavesurfer/react
      Action: Replace our current direct usage of wavesurfer.js with the official React integration package @wavesurfer/react to properly handle React lifecycle and prevent AbortError issues.
      Depends On: None
      AC Ref: None

## Chapter Navigation Bug Fix

- [x] T001: Add Refs for Last Updated Chapter Index and Timestamp
      Action: In `hooks/useChapterNavigation.ts`, introduce two new React refs: `lastUpdateChapterIndexRef` and `lastUpdateTimeValueRef`. These will track the chapter index and timestamp value associated with the last successful URL update. Initialize them appropriately (e.g., `null` or `-1`).
      Depends On: None
      AC Ref: None

- [x] T002: Refactor `updateUrlWithChapterAndTimestamp` Throttling Logic
      Action: Modify the `updateUrlWithChapterAndTimestamp` function in `useChapterNavigation.ts`. The revised logic must: 1. Check if the `newChapterIndex` parameter differs from `lastUpdateChapterIndexRef.current`. If it differs, update the URL immediately (bypass time throttling). 2. If the `newChapterIndex` is the _same_ as `lastUpdateChapterIndexRef.current`, apply the existing time-based throttling (e.g., check `lastUpdateTimestampRef`) only for changes in the `newTimestamp` parameter. 3. After any successful URL update (throttled or immediate), update `lastUpdateChapterIndexRef.current`, `lastUpdateTimeValueRef.current`, and `lastUpdateTimestampRef.current` with the new values and current time. 4. Optionally, add a check to prevent redundant URL pushes if neither the chapter index nor the timestamp has changed compared to the last updated values.
      Depends On: T001
      AC Ref: None

- [x] T003: Ensure Navigation Functions Trigger Immediate URL Update on Chapter Change
      Action: Review and update the functions within `useChapterNavigation.ts` that handle chapter changes (e.g., `handleChapterClick`, `goPrevChapter`, `goNextChapter`). Ensure these functions correctly call the refactored `updateUrlWithChapterAndTimestamp` immediately after updating the chapter state, forcing the URL update logic defined in T002 for chapter changes.
      Depends On: T002
      AC Ref: None

- [x] T004: Review and Update Hook Dependency Arrays
      Action: Examine all `useEffect` and `useCallback` dependency arrays within `useChapterNavigation.ts`. Ensure they accurately include all necessary dependencies, including any newly added refs or modified functions, to prevent stale closures or incorrect behavior.
      Depends On: T003
      AC Ref: None

- [x] T005: Add Debug Logging for Navigation Logic
      Action: Insert temporary `console.log` statements within `updateUrlWithChapterAndTimestamp` and related functions/effects in `useChapterNavigation.ts`. Logs should clearly indicate input parameters, comparison results against refs, whether throttling is applied, and when a URL update occurs.
      Depends On: T004
      AC Ref: None

- [x] T006: Test: Rapid Chapter Navigation
      Action: Manually test clicking chapter navigation controls (e.g., next/previous buttons, chapter list items) rapidly. Verify using browser dev tools and debug logs that the URL updates instantly for each chapter change, without being throttled.
      Depends On: T005
      AC Ref: None

- [x] T007: Test: Timestamp Throttling During Playback
      Action: Manually test by starting audio playback within a chapter. Observe the URL updates in the browser. Verify using debug logs that timestamp updates in the URL are throttled according to the defined interval (e.g., ~5 seconds) while playback progresses within the _same_ chapter.
      Depends On: T005
      AC Ref: None

- [x] T008: Test: Chapter Navigation During Playback
      Action: While audio is playing and timestamp updates are being throttled (as verified in T007), manually click a chapter navigation control. Verify using debug logs that the chapter change triggers an _immediate_ URL update, overriding the timestamp throttling.
      Depends On: T005, T007
      AC Ref: None

- [x] T009: Test: Navigation Between Different Books/Items
      Action: Manually test navigating between different books or main items that use the `useChapterNavigation` hook. Verify that the hook initializes correctly and navigation functions as expected in different contexts.
      Depends On: T005
      AC Ref: None

- [x] T010: Remove Debug Logging
      Action: Rather than removing debug logs, we completely rewrote the hook with a radical simplification that cuts through the complexity.
      Depends On: T006, T007, T008, T009
      AC Ref: None

- [x] T011: Mark Original Navigation Bug Task as Completed
      Action: Navigation bug has been fixed by completely reimplementing the navigation logic with a much simpler approach.
      Depends On: T010
      AC Ref: None

## ESLint Build Failure Fixes

- [x] T1: Setup Local Development Environment  
       Action: Clone the repo, install dependencies (`npm install`), and verify linting scripts locally (e.g., `npm run lint`). Confirm that the same ESLint errors observed in the CI pipeline appear locally.  
       Depends On: None  
       AC Ref: None

- [x] T2: Fix `no-explicit-any` Violations
      Action: Search for all instances of the `any` type flagged by ESLint (`@typescript-eslint/no-explicit-any`) and replace them with precise types, `unknown` with guards, or proper interfaces. Ensure no `any` remains.
      Depends On: T1
      AC Ref: None

- [x] T3: Remove Unused Variables and Imports
      Action: Identify all variables, function parameters, and imports flagged by `@typescript-eslint/no-unused-vars` and remove or rename (prefix with `_` if intentionally unused) so that no unused symbols remain.
      Depends On: T2
      AC Ref: None

- [x] T4: Add Keyboard Event Handlers to Interactive Elements
      Action: For all clickable non-interactive elements (e.g., `<div onClick>`), either convert them to semantic `<button>` elements or add `role="button"`, `tabIndex={0}`, and appropriate `onKeyDown` handlers (handling Enter/Space).
      Depends On: T3
      AC Ref: None

- [x] T5: Associate Form Labels with Controls
      Action: Update all `<label>` elements flagged by `jsx-a11y/label-has-associated-control` to use `htmlFor` with matching `id` attributes on inputs or to wrap the form control inside the label.
      Depends On: T4
      AC Ref: None

- [x] T6: Refactor Long Functions to Reduce Length
      Action: Identify functions/components exceeding the `max-lines-per-function` threshold and extract logical sections into smaller helper functions or subcomponents so each function stays within the configured line limit.
      Depends On: T5
      AC Ref: None

- [x] T7: Refactor Functions with Too Many Parameters
      Action: Locate functions violating `max-params` (e.g., `translateChunk`, API handlers) and refactor their signatures to accept a single options object or grouped parameters to reduce individual argument count.
      Depends On: T6
      AC Ref: None

- [x] T8: Remove All `console.log` Statements
      Action: Search for and delete any `console.log`, `console.warn`, `console.error`, etc., replacing them with the project's structured logging API if runtime logging is required.
      Depends On: T7
      AC Ref: None

- [x] T9: Apply Prettier Formatting Fixes
      Action: Run the Prettier formatter across the codebase (e.g., `npx prettier --write .`) or manually adjust files to satisfy formatting rules.
      Depends On: T8
      AC Ref: None

- [x] T10: Implement Pre-commit Hooks for Linting and Formatting
      Action: Install and configure Husky and lint-staged to run `eslint --fix` and `prettier --write` on staged files before every commit, preventing future violations from being committed.
      Depends On: T9
      AC Ref: None

- [x] T11: Verify Fix and CI Build
      Action: Run `npm run lint`, `npm run build`, and full test suite locally to confirm no ESLint errors or warnings remain and that the build succeeds. Push changes and ensure the Vercel CI pipeline passes without errors.
      Depends On: T10
      AC Ref: None
