# Git Hooks

This project uses Git hooks to automate certain tasks during the Git workflow.

## Available Hooks

### Pre-Commit Hook

The pre-commit hook runs `glance ./` asynchronously during the commit process, alongside code quality checks.

#### Features:

- Runs non-blocking (asynchronously) so commit operations aren't delayed
- Executes alongside lint-staged for comprehensive pre-commit checks
- Generates updated documentation before code is committed
- Ensures documentation stays current with code changes

## Setup

The pre-commit hooks are automatically set up when you install dependencies:

```bash
npm install
```

This uses Husky to manage Git hooks and will configure the pre-commit hook automatically.

## How It Works

### Pre-Commit Hook

The pre-commit hook:

1. Runs before each commit is finalized
2. Starts `glance ./` asynchronously in the background
3. Executes lint-staged for code formatting and linting
4. Allows commit to proceed without waiting for glance to finish
5. Generates updated glance.md files based on current code state

The hook ensures documentation is regenerated on every commit while not blocking the commit process.

## Troubleshooting

If the hooks aren't working:

1. Verify Husky is installed: `npm list husky`
2. Check the hook exists: `ls -la .husky/pre-commit`
3. Make sure the hook is executable: `chmod +x .husky/pre-commit`
4. Verify glance is available: `which glance`
5. Test the hook manually: `.husky/pre-commit`

## Manual Hook Testing

To test the pre-commit hook manually:

```bash
# Test the entire pre-commit hook
.husky/pre-commit

# Test just the glance command
glance ./
```

## Implementation Details

The pre-commit hook is implemented as a shell script that:

1. Announces the start of pre-commit hooks
2. Starts `glance ./` asynchronously using `nohup` and `&`
3. Redirects glance output to `/dev/null` to avoid terminal clutter
4. Runs lint-staged for code quality checks
5. Allows the commit to proceed immediately without waiting for glance

This approach ensures that:

- Code quality checks are enforced before commit
- Documentation generation happens automatically but doesn't block commits
- The commit process remains fast and responsive
- Documentation stays synchronized with code changes
