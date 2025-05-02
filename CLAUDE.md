# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` (uses turbopack)
- **Build**: `npm run build`
- **Lint**: `npm run lint` or `npm run lint:strict` (zero warnings)
- **Format**: `npm run prettier:fix` or `npm run format`
- **Test**: `npm run test`
- **Test Single File**: `npm run test -- __tests__/path/to/file.test.ts`
- **Test with Coverage**: `npm run test:coverage`
- **Watch Tests**: `npm run test:watch`

## Code Style & Standards

- **Formatting**: Prettier with strict config, enforced via pre-commit hooks
- **Linting**: ESLint with Next.js, React, and TypeScript plugins
- **TypeScript**: Strict mode with no `any` allowed
- **Imports**: Organized by @trivago/prettier-plugin-sort-imports in this order:
  1. React/Next.js
  2. Third-party modules
  3. Local aliases (@/\*)
  4. Relative imports
- **Error Handling**: Use structured error objects, handle Promise rejections
- **Testing**: Use React Testing Library, avoid mocking internal modules
- **Naming**: Use clear, descriptive names following React/TypeScript conventions
- **Components**: Prefer functional components with hooks
- **Commits**: Conventional Commits format required

Always adhere to the DEVELOPMENT_PHILOSOPHY.md in the docs folder.
