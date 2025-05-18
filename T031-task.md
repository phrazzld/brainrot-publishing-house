# T031-task.md

## Task ID

T031

## Title

Fix explore page missing books and "coming soon" entries

## Original Ticket Text

- [ ] **T031: Fix explore page missing books and "coming soon" entries**
  - [ ] Investigate why Declaration of Independence is missing from explore page
  - [ ] The Declaration is commented out in translations/index.ts
  - [ ] Add The Declaration back to active translations
  - [ ] Consider adding "coming soon" entries for future books:
    - Pride and Prejudice (has some text already)
    - The Republic (has text already)
    - Paradise Lost
    - Meditations
    - Divine Comedy series
    - Bible sections
    - Quran
    - Shakespeare plays
    - Gilgamesh
    - Bhagavad Gita
  - [ ] Implement status: 'coming soon' handling in explore page
  - Dependencies: none

## Implementation Approach Analysis Prompt

Analyze this task following the principles from DEVELOPMENT_PHILOSOPHY.md:

### Current State Investigation

1. Investigate the structure of translations/index.ts to understand why Declaration of Independence is commented out
2. Examine the explore page to understand how it currently renders books
3. Identify the data structure used for translations and how it could support a "status" field

### Design Requirements

1. Define a simple, explicit way to represent book status (available vs coming soon)
2. Design the UI changes needed to display "coming soon" entries differently
3. Ensure backward compatibility with existing book entries
4. Follow the principle of simplicity and explicitness

### Implementation Approach

1. Add a status field to the translation type (optional for backward compatibility)
2. Update translations/index.ts to include Declaration of Independence
3. Add "coming soon" entries for future books with appropriate metadata
4. Modify the explore page to handle and display different statuses
5. Add tests to verify the new functionality

### Key Considerations

- Keep the solution simple and avoid over-engineering
- Make the status explicit in the data structure
- Ensure the explore page gracefully handles both old and new formats
- Write comprehensive tests for the new functionality
- Follow TypeScript strict typing requirements
