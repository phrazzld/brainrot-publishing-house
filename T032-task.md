# T032 Task File

## Task ID

T032

## Title

Standardize text file naming and paths

## Original Ticket Text

- [ ] **T032: Standardize text file naming and paths**
  - [ ] Fix naming inconsistencies:
    - Huck Finn: "the-adventures-of-huckleberry-finn" vs "huckleberry-finn"
    - Chapters: Roman numerals (chapter-i.txt) vs Arabic (chapter-01.txt)
    - Different patterns: act-{number}.txt vs chapter-{number}.txt
  - [ ] Create migration script to copy text files to standardized locations
  - [ ] Update text loading logic to handle both old and new paths during transition
  - Dependencies: T021, T029

## Implementation Approach Analysis Prompt

As an expert software architect, analyze the following task and provide a comprehensive implementation approach:

### Context:

- Project: Brainrot Publishing House - A Next.js app for reading/audio platform
- Tech stack: Next.js, React, TypeScript, Vercel Blob storage
- Current issue: Text file naming and path inconsistencies across different books
- Examples of inconsistencies:
  - Book names: "the-adventures-of-huckleberry-finn" vs "huckleberry-finn"
  - Chapter numbering: Roman numerals (chapter-i.txt) vs Arabic (chapter-01.txt)
  - Different patterns: act-{number}.txt vs chapter-{number}.txt

### Task Requirements:

1. Fix naming inconsistencies across all text files
2. Create migration script to copy text files to standardized locations
3. Update text loading logic to handle both old and new paths during transition
4. Ensure backward compatibility during migration

### Analysis Required:

1. Current State Assessment:

   - Analyze existing text file naming patterns
   - Document all inconsistencies
   - Identify path structure variations

2. Standard Definition:

   - Define clear naming conventions for:
     - Book slugs
     - Chapter/Act/Part numbering
     - File extensions
   - Ensure consistency with existing AssetPathService standards

3. Migration Strategy:

   - Design script for copying files to standardized locations
   - Handle edge cases and special naming
   - Provide rollback capability if needed

4. Compatibility Implementation:

   - Update text loading logic to:
     - Try standardized path first
     - Fall back to legacy path if not found
     - Log deprecation warnings for legacy paths
   - Ensure zero downtime during migration

5. Testing Approach:
   - Unit tests for migration logic
   - Integration tests for backward compatibility
   - End-to-end tests for text loading

### Constraints:

- Must maintain backward compatibility
- Follow TypeScript strict mode (no `any`)
- Adhere to development philosophy (simplicity, modularity, testability)
- Use existing AssetPathService patterns where applicable
- Ensure all changes are reversible

### Expected Deliverables:

1. Migration script that handles all text file standardization
2. Updated text loading logic with fallback mechanism
3. Comprehensive test suite
4. Documentation of naming conventions
5. Clear migration plan with rollback strategy

Please provide a detailed implementation approach covering all aspects above, with specific attention to:

- Error handling and edge cases
- Performance implications
- Monitoring and verification
- Progressive rollout strategy
