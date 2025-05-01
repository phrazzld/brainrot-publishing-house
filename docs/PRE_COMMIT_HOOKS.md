# Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality and consistency. These hooks run automatically when you commit code, helping to catch issues before they make it into the repository.

## What's Included

Our pre-commit hooks:

1. **Lint JavaScript/TypeScript Files** - Runs ESLint to fix fixable issues and report unfixable ones
2. **Format Code** - Runs Prettier to ensure consistent code formatting
3. **Prevent Commits with Issues** - Blocks commits if there are ESLint errors that can't be automatically fixed

## Technology

We use the following tools:

- **Husky** - Git hooks integration
- **lint-staged** - Run linters on files that are staged for commit

## Configuration

The pre-commit hooks are configured in:

- `.husky/pre-commit` - The pre-commit hook script
- `package.json` - The lint-staged configuration in the "lint-staged" field

Here's the current lint-staged configuration:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,css,md}": [
    "prettier --write"
  ]
}
```

## Bypassing Hooks

Bypassing hooks is discouraged, but in emergency situations, you can use the `--no-verify` flag with git:

```bash
git commit -m "Your message" --no-verify
```

**Note**: Using `--no-verify` is against our team policy as outlined in the Development Philosophy. Pre-commit hooks are in place to maintain code quality, and bypassing them should only be done in exceptional circumstances with team approval.

## Troubleshooting

If you encounter issues with the pre-commit hooks:

1. Make sure your local dependencies are up to date (`npm install`)
2. Check that Husky is properly installed (`npm run prepare`)
3. Ensure your changes comply with our linting and formatting rules
4. If the hooks fail, fix the reported issues and try again

## Adding or Modifying Hooks

To add or modify hooks:

1. Update the lint-staged configuration in package.json
2. For new Git hooks, create additional files in the `.husky` directory
3. Make sure new hook files are executable (`chmod +x .husky/your-hook-name`)
4. Test thoroughly to ensure the hooks work as expected
