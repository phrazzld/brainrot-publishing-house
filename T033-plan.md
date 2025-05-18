# T033 Implementation Plan: Run Text Standardization Migration in Production

## Overview
This plan outlines the execution of the text file standardization migration (T032) in the production environment. The task involves deploying code changes, running the standardization script, verifying results, and monitoring for issues during the transition period.

## Scope Analysis

### Deliverables
1. Production deployment of text standardization code changes
2. Execution of the standardization migration script with proper logging
3. Verification of standardized text paths accessibility
4. Monitoring and issue resolution during transition
5. Eventual cleanup of legacy paths (deferred to a future task)

### Technical Boundaries
- Changes are limited to production deployment and execution
- No modification to the existing standardization script (`standardizeTextFilesBlob.ts`)
- Leverage existing verification scripts and monitoring tools
- Maintain backward compatibility with fallback mechanism

## Technical Design

### Architecture Overview
1. **Standardization Script**: `scripts/standardizeTextFilesBlob.ts`
   - Discovers text files from migration JSONs and translations
   - Maps legacy paths to standardized paths
   - Copies files to new locations in Vercel Blob (when BLOB_READ_WRITE_TOKEN configured)
   - Generates detailed logs and reports

2. **Verification Script**: `scripts/verifyTextMigration.ts` 
   - Samples standardized paths from migration JSONs
   - Tests accessibility via Vercel Blob API
   - Generates verification reports with success rates

3. **Fallback Mechanism**: Already implemented in application code
   - Tries standardized path first
   - Falls back to legacy path if not found
   - Logs deprecation warnings for legacy paths

### Key Dependencies
- Vercel Blob environment configuration (BLOB_READ_WRITE_TOKEN)
- AssetPathService for path standardization logic
- VercelBlobAssetService for Blob interactions
- Existing migration JSON files for tracking changes

## Detailed Implementation Steps

### 1. Pre-Migration Preparation
**Time: 30 minutes**

1. Verify environment readiness:
   ```bash
   # Check production environment variables
   vercel env pull production
   grep BLOB_READ_WRITE_TOKEN .env.production.local
   ```

2. Document current state:
   - Capture current error rates from monitoring
   - Note any existing text loading issues
   - Create migration checklist

3. Communication:
   - Notify stakeholders of migration window
   - Create incident response plan
   - Prepare rollback strategy

### 2. Code Deployment
**Time: 15 minutes**

1. Deploy latest codebase to production:
   ```bash
   git checkout main
   git pull origin main
   vercel --prod
   ```

2. Verify deployment success:
   - Check deployment logs
   - Confirm new code is running
   - Test basic functionality

### 3. Initial Dry Run
**Time: 20 minutes**

1. Execute dry-run to preview changes:
   ```bash
   npm run standardize:text:blob -- --dry-run --log-file=text-standardization-production-dryrun.log
   ```

2. Review dry-run results:
   - Analyze `migration-logs/text-standardization-production-dryrun.log`
   - Verify expected files are discovered
   - Check standardized paths are correct
   - Identify any unexpected patterns

3. Decision point:
   - If issues found, halt and remediate
   - If successful, proceed to actual migration

### 4. Production Migration Execution
**Time: 30-60 minutes (depending on file count)**

1. Execute migration:
   ```bash
   npm run standardize:text:blob -- --log-file=text-standardization-production.log
   ```

2. Monitor real-time progress:
   - Watch console output for errors
   - Monitor memory/CPU usage
   - Check application error rates in parallel

3. Handle any errors:
   - Document failure patterns
   - Use --concurrency flag if rate limits hit
   - Restart with specific --books flag if needed

### 5. Initial Verification
**Time: 30 minutes**

1. Run verification script:
   ```bash
   npx tsx scripts/verifyTextMigration.ts --sample-size=50
   ```

2. Check verification report:
   - Review `migration-logs/text-verification-{timestamp}.json`
   - Ensure success rate > 95%
   - Investigate any failures

3. Manual spot checks:
   - Test key books (Hamlet, Iliad, Huck Finn)
   - Verify both new and legacy paths work
   - Check application logs for errors

### 6. Monitoring Phase
**Time: 48-72 hours**

1. Continuous monitoring:
   - Watch error rates every 4 hours
   - Monitor text loading performance
   - Track fallback usage patterns

2. Issue response:
   - Document any user reports
   - Debug specific path failures
   - Add targeted fixes as needed

3. Metrics to track:
   - Text loading success rate
   - Fallback mechanism usage
   - Response times for text APIs
   - Error rates by book/chapter

### 7. Legacy Cleanup Planning
**Time: Deferred to future task**

1. Collect usage metrics:
   - Measure legacy path access frequency
   - Identify when fallbacks stop being used

2. Plan cleanup task:
   - Create new ticket for legacy removal
   - Document dependencies
   - Schedule after transition period

## Testing Strategy

### Pre-migration Tests
- Verify standardization script works in staging
- Test fallback mechanism thoroughly
- Confirm verification scripts are accurate

### Post-migration Tests
1. Automated verification:
   - Run `verifyTextMigration.ts` with increasing sample sizes
   - Execute E2E tests for text loading

2. Manual verification:
   - Test critical user flows
   - Verify each book has accessible text
   - Check performance metrics

3. Edge case testing:
   - Test books with special naming (acts vs chapters)
   - Verify Roman numeral handling
   - Check hyphenated book names

## Error Handling & Rollback

### Potential Issues
1. Missing BLOB_READ_WRITE_TOKEN
   - Solution: Verify environment configuration
   - Fallback: Use existing legacy paths

2. Rate limiting during migration
   - Solution: Reduce concurrency
   - Alternative: Run in batches by book

3. Partial migration failure
   - Solution: Resume from failure point
   - Fallback: Legacy paths remain available

### Rollback Strategy
1. Code is already backward compatible
2. No need to revert deployment
3. Legacy paths remain accessible
4. Can re-run migration after fixes

## Performance Considerations

1. Concurrency optimization:
   - Default: 5 concurrent operations
   - Adjust based on rate limits
   - Monitor Blob API response times

2. Batch processing:
   - Process by book if needed
   - Use --books flag for targeted runs

3. Caching implications:
   - CDN may cache old paths
   - Consider cache invalidation if needed

## Monitoring & Verification

### Success Metrics
- 100% of text files copied to standardized locations
- 95%+ verification success rate
- No increase in text loading errors
- Successful fallback for legacy paths

### Monitoring Dashboard
- Text loading success rates
- Fallback usage frequency
- API response times
- Error rates by path type

### Alerts
- Text loading failures > baseline
- Verification script failures
- Unusual fallback patterns

## Communication Plan

1. Pre-migration:
   - Announce maintenance window
   - Document rollback process
   - Share incident contacts

2. During migration:
   - Post progress updates
   - Report any issues immediately
   - Maintain incident channel

3. Post-migration:
   - Confirm completion
   - Share verification results
   - Plan legacy cleanup

## Summary

This production migration follows a careful, staged approach with multiple verification points and robust monitoring. The existing fallback mechanism ensures zero downtime, while comprehensive logging enables quick issue resolution. The plan prioritizes safety and observability while maintaining simplicity in execution.