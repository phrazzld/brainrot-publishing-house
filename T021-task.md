# T021: Create and implement standardized file naming convention

## Original Task Description

- Audit current file naming practices across ALL asset types (critical)
- Resolve inconsistencies between implementation ("chapter-XX.mp3") and tests ("book-XX.mp3")
- Define explicit rules for each asset type (audio, text, images)
- Create standardized rules for numeric components (padding, formatting)
- Update AssetPathService to enforce these standards
- Document migration plan for non-compliant legacy assets
- Create a path validator to catch non-compliant paths
- Update all tests to use standardized file naming
- Dependencies: T009, T010, T016

## Implementation Approach Analysis

### Context

I need to create and implement a standardized file naming convention for all asset types in the project. Currently, there are inconsistencies in how files are named across different parts of the codebase, which creates maintenance challenges and potential bugs.

### Goals

1. Establish clear, consistent rules for naming assets of all types
2. Implement these rules in the AssetPathService
3. Create validation to catch non-compliant paths
4. Document the conventions and create a migration plan
5. Update tests to conform to the new standards

### Technical Analysis

To effectively implement standardized file naming, I need to:

1. First audit the current naming patterns across:

   - Audio files (full audiobooks, chapters)
   - Text files (brainrot, source text, fulltext)
   - Image files (book covers, chapter images, shared assets)

2. Identify inconsistencies between:

   - Implementation code (e.g., "chapter-XX.mp3")
   - Test code (e.g., "book-XX.mp3")
   - Legacy paths and current paths
   - Different asset types

3. Create a comprehensive set of rules that address:

   - Prefixes for different asset types
   - Numeric formatting standards (padding, separators)
   - Casing conventions (kebab-case, camelCase, etc.)
   - File extension requirements

4. Implement these rules in the AssetPathService by:

   - Adding validation functions
   - Enforcing standards in path generation
   - Creating helpful error messages for non-compliance

5. Create a migration plan for existing assets

### Implementation Steps

1. Audit existing file naming patterns
2. Define the standardized naming conventions
3. Update AssetPathService to enforce standards
4. Create path validation functionality
5. Update tests to use standardized names
6. Document the conventions and migration plan

### Potential Challenges

- Discovering all edge cases in the existing naming patterns
- Balancing backward compatibility with clean standards
- Ensuring consistent application across the codebase
- Handling special cases for certain asset types

### Design Decisions Needed

- How strict should validation be?
- Should we enforce a migration or support both old and new patterns?
- Where should validation occur in the code?
- How should validation errors be handled?

### Testing Strategy

- Unit tests for path validation functions
- Tests for each asset type's naming convention
- Tests for migration/conversion between old and new formats
- End-to-end tests to verify the system works with the new conventions

### Documentation Needs

- Comprehensive naming convention documentation
- Migration guide for developers
- Update to existing asset service documentation
