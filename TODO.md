# Todo

## Remove Translation Functionality

- [x] **T001 · Refactor · P0: remove `/api/translate` route implementation**

  - **Context:** Remove translation API endpoints
  - **Action:**
    1. Delete the file `app/api/translate/route.ts`.
    2. Remove the associated handlers in `app/api/translate/handlers/` directory.
    3. Remove any other files exclusively used by the translate API (e.g., services, utils).
  - **Done‑when:**
    1. All API route files associated with translation are removed.
    2. Server-side translation code is completely removed.
  - **Verification:**
    1. Make a request to `/api/translate` and verify it returns a 404.
  - **Depends‑on:** none

- [x] **T002 · Refactor · P1: remove translation frontend components**

  - **Context:** Remove client-side translation interface
  - **Action:**
    1. Delete `app/translate/page.tsx`.
    2. Remove components in `components/translate/` directory.
    3. Remove any supporting components exclusively used by the translation page.
  - **Done‑when:**
    1. All frontend translation components are removed.
  - **Verification:**
    1. Visit `/translate` and verify it returns a 404.
  - **Depends‑on:** [T001]

- [x] **T003 · Refactor · P1: remove translation hooks and utilities**

  - **Context:** Remove supporting client-side translation code
  - **Action:**
    1. Identify and remove translation-specific hooks (e.g., `useTranslationStream.ts`).
    2. Remove any utility functions/modules exclusively used for translation.
  - **Done‑when:**
    1. All translation-specific hooks and utilities are removed.
    2. No references to translation functionality remain in the codebase.
  - **Verification:**
    1. Run codebase search for "translation" and verify no remaining translation functionality.
  - **Depends‑on:** [T002]

- [x] **T004 · Test · P1: remove translation-specific tests**

  - **Context:** Remove tests that are no longer relevant
  - **Action:**
    1. Remove API tests for `/api/translate`.
    2. Remove component tests for translation UI components.
    3. Remove any E2E tests specific to translation functionality.
  - **Done‑when:**
    1. All translation-specific tests are removed.
    2. Test suite passes with no errors.
  - **Verification:**
    1. Run the test suite and verify no translation-related tests remain.
  - **Depends‑on:** [T001, T002, T003]

- [x] **T005 · Chore · P2: update navigation and documentation**

  - **Context:** Update documentation and navigation to reflect removal
  - **Action:**
    1. Remove any navigation links to the `/translate` page.
    2. Update documentation (READMEs, etc.) to remove references to translation functionality.
  - **Done‑when:**
    1. No UI navigation to translate page exists.
    2. Documentation is updated to remove translation references.
  - **Verification:**
    1. Check all navigation UI and verify no links to `/translate`.
    2. Review documentation and verify no outdated translation references.
  - **Depends‑on:** [T002]

- [ ] **T006 · Chore · P2: remove unused environment variables and configuration**

  - **Context:** Clean up translation-related configuration
  - **Action:**
    1. Remove translation-related environment variables from `.env.local.example`.
    2. Document the removal in a comment in relevant files.
    3. Remove any configuration specific to translation in other config files (if any).
  - **Done‑when:**
    1. No translation-related environment variables or configuration remain.
  - **Verification:**
    1. Review all configuration files and verify no translation settings remain.
  - **Depends‑on:** [T001]

- [ ] **T007 · Chore · P3: add changelog entry for translation removal**
  - **Context:** Document the removal of this feature
  - **Action:**
    1. Add an entry to `CHANGELOG.md` documenting the removal of the translation functionality.
    2. Include a brief explanation that this will be replaced by a separate admin tool in the future.
  - **Done‑when:**
    1. `CHANGELOG.md` includes an entry for the removed functionality.
  - **Depends‑on:** [T001, T002, T003]
