# Todo

## Core Interfaces & Errors

- [x] **T001 · Feature · P0: define shared interfaces and custom errors**
  - **Context:** PLAN.md > Detailed Build Steps > 1. Define Interfaces & Errors
  - **Action:**
    1. Create/update `types/dependencies.ts` defining and exporting `AssetUrlResolver`, `S3SignedUrlGenerator`, `AssetNotFoundError`, and `SigningError`.
    2. Add TSDoc comments explaining each interface and error class.
  - **Done‑when:**
    1. Interfaces and error classes are defined and exported in `types/dependencies.ts`.
    2. Code compiles successfully.
    3. TSDoc comments are present and accurate.
  - **Depends‑on:** none

## S3 Signed URL Generation

- [x] **T002 · Feature · P1: implement s3 signed url generator service**
  - **Context:** PLAN.md > Detailed Build Steps > 2. Create S3 Generator Service
  - **Action:**
    1. Create `services/s3SignedUrlGenerator.ts` implementing `S3SignedUrlGenerator`.
    2. Encapsulate AWS SDK v3 (`S3Client`, `getSignedUrl`) logic, loading credentials and config (bucket, region, endpoint, expiry) from `process.env`.
    3. Implement error handling, wrapping SDK errors in `SigningError`.
  - **Done‑when:**
    1. Service correctly implements the `S3SignedUrlGenerator` interface.
    2. Configuration is loaded securely via environment variables.
    3. Service generates signed URLs or throws `SigningError`.
  - **Depends‑on:** [T001]
- [x] **T003 · Test · P1: unit test s3 signed url generator**
  - **Context:** PLAN.md > Detailed Build Steps > 7. Write/Update Unit Tests (`s3SignedUrlGenerator.test.ts`)
  - **Action:**
    1. Create `__tests__/services/s3SignedUrlGenerator.test.ts`.
    2. Mock AWS SDK v3 client (`S3Client`) and `getSignedUrl` command interaction.
    3. Verify correct parameters (bucket, key, expiry) are passed to the SDK and `SigningError` is thrown on SDK failure.
  - **Done‑when:**
    1. Unit tests pass with >95% coverage for `s3SignedUrlGenerator.ts`.
    2. AWS SDK interactions are mocked and verified for success and failure paths.
  - **Depends‑on:** [T002]

## Download Service Logic

- [x] **T004 · Feature · P1: define download service class structure and constructor**
  - **Context:** PLAN.md > Detailed Build Steps > 3. Create Download Service & 4. Implement Service Constructor
  - **Action:**
    1. Create `services/downloadService.ts` defining `DownloadService` class and `DownloadRequestParams` type.
    2. Implement constructor accepting `AssetUrlResolver`, `S3SignedUrlGenerator`, and `s3Endpoint: string` via dependency injection.
  - **Done‑when:**
    1. `DownloadService` class structure and constructor are defined.
    2. Dependencies are correctly typed and accepted.
    3. Code compiles successfully.
  - **Depends‑on:** [T001]
- [x] **T005 · Feature · P1: implement download service core logic**
  - **Context:** PLAN.md > Detailed Build Steps > 5. Implement Service Logic
  - **Action:**
    1. Implement `async getDownloadUrl(params: DownloadRequestParams)`: construct `legacyPath`, call `assetUrlResolver.getAssetUrlWithFallback`.
    2. Compare resolved URL with `s3Endpoint`; if match, call `s3SignedUrlGenerator.createSignedS3Url`; handle potential `SigningError`.
    3. Handle `AssetNotFoundError` from resolver; return Blob URL or Signed S3 URL.
  - **Done‑when:**
    1. `getDownloadUrl` method correctly implements the orchestration logic.
    2. Handles Blob URL case, S3 signing case, asset not found case, and signing error case.
    3. Throws specified custom errors (`AssetNotFoundError`, `SigningError`).
  - **Depends‑on:** [T004, T002]
- [x] **T006 · Test · P1: unit test download service**
  - **Context:** PLAN.md > Detailed Build Steps > 7. Write/Update Unit Tests (`downloadService.test.ts`)
  - **Action:**
    1. Create `__tests__/services/downloadService.test.ts`.
    2. Create mock implementations for `AssetUrlResolver` and `S3SignedUrlGenerator`.
    3. Test all logic branches: Blob found, S3 path found & signed, asset not found, signing error. Verify correct URL return or error thrown.
  - **Done‑when:**
    1. Unit tests pass with >95% coverage for `downloadService.ts`.
    2. All logic paths specified in the plan are verified using mocked dependencies.
  - **Depends‑on:** [T005]

## API Route Handler Refactoring

- [x] **T007 · Refactor · P1: refactor download api route handler dependencies**
  - **Context:** PLAN.md > Detailed Build Steps > 6. Refactor Route Handler (`route.ts`)
  - **Action:**
    1. Modify `app/api/download/route.ts`: remove inline S3 logic/imports, import `DownloadService`, real dependency implementations (`getAssetUrlWithFallback`, `RealS3SignedUrlGenerator`), and custom errors.
    2. Instantiate `DownloadService` with real dependencies and injected `s3Endpoint` from `process.env`.
  - **Done‑when:**
    1. Route handler imports and instantiates the new service and its dependencies.
    2. Old S3 logic and direct SDK usage are removed.
    3. Code compiles.
  - **Depends‑on:** [T005, T002]
- [x] **T008 · Refactor · P1: implement input validation in route handler**
  - **Context:** PLAN.md > Detailed Build Steps > 6. Refactor Route Handler (`route.ts`) & Security & Config
  - **Action:**
    1. In `app/api/download/route.ts` `GET` handler, implement strict validation for `slug`, `type`, and optional `chapter` query parameters.
    2. Return `NextResponse` with status 400 and informative error message if validation fails.
  - **Done‑when:**
    1. Handler validates query parameters before processing.
    2. Invalid requests result in a 400 response.
  - **Depends‑on:** [T007]
- [ ] **T009 · Refactor · P1: implement service call and error mapping in route handler**
  - **Context:** PLAN.md > Detailed Build Steps > 6. Refactor Route Handler (`route.ts`)
  - **Action:**
    1. In `app/api/download/route.ts` `GET` handler, wrap `downloadService.getDownloadUrl` call in a `try...catch`.
    2. On success, return `NextResponse.json({ url })` with status 200.
    3. In `catch`, map `AssetNotFoundError` -> 404, `SigningError` -> 500, other errors -> 500, returning appropriate `NextResponse`.
  - **Done‑when:**
    1. Handler correctly calls the service and returns 200 on success.
    2. Service errors (`AssetNotFoundError`, `SigningError`) are mapped to correct HTTP status codes (404, 500).
    3. Unexpected errors result in a generic 500 response.
  - **Verification:**
    1. Manually test with `curl` or similar: valid slug (Blob), valid slug (S3), invalid slug, slug causing signing error. Check status codes and bodies.
  - **Depends‑on:** [T008]

## Integration Testing

- [ ] **T010 · Test · P1: update download api integration tests**
  - **Context:** PLAN.md > Detailed Build Steps > 8. Update Integration Tests (`download.test.ts`)
  - **Action:**
    1. Modify `__tests__/api/download.test.ts`: remove mocks for internal collaborators (`DownloadService`, `getAssetUrlWithFallback`).
    2. Mock _only_ true external boundaries: AWS SDK interaction within `s3SignedUrlGenerator.ts` and Vercel Blob client calls within `utils/getBlobUrl.ts` (if applicable).
    3. Verify handler correctly parses requests, uses the real service, and maps service responses/errors (200 Blob, 200 Signed S3, 400, 404, 500) to the correct `NextResponse`.
  - **Done‑when:**
    1. Integration tests pass, verifying the handler's interaction with the real service.
    2. Mocks target only true external dependencies.
    3. All specified response/error scenarios (200, 400, 404, 500) are covered.
  - **Depends‑on:** [T009, T003, T006]

## Logging & Observability

- [ ] **T011 · Feature · P2: implement correlation id generation and propagation**
  - **Context:** PLAN.md > Logging & Observability > Correlation ID
  - **Action:**
    1. In `app/api/download/route.ts`, generate a unique correlation ID (e.g., `crypto.randomUUID()`) per request.
    2. Modify `DownloadService` (constructor or method) to accept the correlation ID.
    3. Pass the correlation ID from the route handler to the `DownloadService`.
  - **Done‑when:**
    1. Correlation ID is generated in the route handler and passed to the service.
    2. Service accepts and can potentially use the correlation ID.
  - **Depends‑on:** [T009, T005]
- [ ] **T012 · Feature · P2: implement structured logging in route handler**
  - **Context:** PLAN.md > Logging & Observability > Route Handler (`route.ts`)
  - **Action:**
    1. Add structured logging (e.g., Pino/Winston) to `app/api/download/route.ts`.
    2. Log INFO for request received/success, WARN for 4xx errors, ERROR for 5xx errors, including correlation ID and key details.
  - **Done‑when:**
    1. Route handler logs events at specified levels in structured format (JSON).
    2. Logs include correlation ID and context as specified.
  - **Depends‑on:** [T009, T011]
- [ ] **T013 · Feature · P2: implement structured logging in download service**
  - **Context:** PLAN.md > Logging & Observability > Service (`downloadService.ts`)
  - **Action:**
    1. Add structured logging to `services/downloadService.ts`.
    2. Log DEBUG for entry/exit/key decisions, INFO for signing attempts, ERROR for thrown errors, including correlation ID.
    3. Ensure logger instance is available (e.g., passed via constructor or context).
  - **Done‑when:**
    1. Download service logs events at specified levels in structured format (JSON).
    2. Logs include correlation ID and context.
  - **Depends‑on:** [T005, T011]

## Security & Configuration

- [ ] **T014 · Chore · P1: verify secure configuration loading and usage**
  - **Context:** PLAN.md > Security & Config
  - **Action:**
    1. Verify AWS credentials and S3 config are loaded exclusively via `process.env` in `s3SignedUrlGenerator.ts` (per T002).
    2. Verify `s3Endpoint` is correctly loaded via `process.env` and injected into `DownloadService` in `route.ts` (per T007).
    3. Verify input validation is implemented in `route.ts` (per T008).
  - **Done‑when:**
    1. Code review confirms secure handling of secrets and configuration.
    2. Input validation logic is present and correct.
  - **Depends‑on:** [T002, T008]
- [ ] **T015 · Chore · P2: verify signed url expiry configuration**
  - **Context:** PLAN.md > Security & Config
  - **Action:**
    1. Confirm a reasonable signed URL expiry time (e.g., 5-15 minutes) is configured and loaded via `process.env` in `s3SignedUrlGenerator.ts`.
  - **Done‑when:**
    1. Signed URL expiry is configurable via environment variable and set to a reasonable default.
  - **Depends‑on:** [T002]

## Documentation & Cleanup

- [ ] **T016 · Chore · P2: add tsdoc comments to new/refactored code**
  - **Context:** PLAN.md > Documentation > Code Self-Doc
  - **Action:**
    1. Add/update TSDoc comments for all exported interfaces, classes, methods, and errors in `types/dependencies.ts`, `services/s3SignedUrlGenerator.ts`, `services/downloadService.ts`.
    2. Include `@param`, `@returns`, `@throws` clauses where applicable.
  - **Done‑when:**
    1. All new/modified public APIs have comprehensive TSDoc comments.
  - **Depends‑on:** [T001, T002, T005]
- [ ] **T017 · Chore · P2: perform final code cleanup**
  - **Context:** PLAN.md > Detailed Build Steps > 9. Code Cleanup
  - **Action:**
    1. Remove any unused imports, old mock functions, commented-out code related to the refactor.
    2. Run `npm run lint:strict -- --fix` or formatter (`prettier`) to ensure consistency.
  - **Done‑when:**
    1. Codebase is free of artifacts from the refactoring process.
    2. Linter and formatter checks pass.
  - **Depends‑on:** [T010]
- [ ] **T018 · Chore · P1: run final lint and test checks**
  - **Context:** PLAN.md > Detailed Build Steps > 10. Run Checks
  - **Action:**
    1. Execute `npm run lint:strict` and `npm test` locally.
    2. Fix any failures until both commands exit successfully.
  - **Done‑when:**
    1. All lint rules and tests (unit, integration, coverage) pass in local and CI environments.
  - **Depends‑on:** [T017, T010, T003, T006, T012, T013, T014, T015, T016]

---

### Clarifications & Assumptions

- [ ] **Issue:** Need confirmation on the exact behavior of `getAssetUrlWithFallback` regarding "not found" cases (e.g., does it throw, return null/undefined, or a specific value?).
  - **Context:** Error & Edge‑Case Strategy, Service (`downloadService.ts`) bullet 1. Affects T005, T006, T010.
  - **Blocking?:** yes
- [ ] **Issue:** Confirm if correlation ID should always be generated fresh per request, or if it should be read from incoming headers (e.g., `X-Request-ID`) if present.
  - **Context:** PLAN.md, Logging & Observability. Affects T011.
  - **Blocking?:** no
