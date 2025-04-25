# Project Backlog

## Infrastructure
- [ ] Set up GitHub Actions CI
- [ ] Set up useful precommit hooks
  * Warn when files are over 500 lines
  * Error when files are over 1000 lines
  * Run tests
  * Run linter

## Current Tasks
- Move translation assets -- text and images -- somewhere like vercel blob
- Refactor aggressively for readability, maintainability, testability
- Improve translation generation pipeline
    - Should be able to search for and select a project gutenberg book and get a full translation created and published to the site
    - This will require improving the "chunking" logic that is currently used, because it often gets tripped up with odd and inconsistent formatting from project gutenberg (eg paradise lost, each "chapter" is called a "book" and has no double line breaks, which often breaks the context window of the request)
    - Need to catch context window breaks / response breaks early -- if we hit a break, the whole thing needs to stop
- Landing page / home page needs to be spruced up, stronger marketing / conversion structure / style