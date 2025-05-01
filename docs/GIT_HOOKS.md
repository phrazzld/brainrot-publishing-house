# Git Hooks

This project uses Git hooks to automate certain tasks during the Git workflow.

## Available Hooks

### Post-Commit Hook

The post-commit hook runs `glance ./` asynchronously after each commit.

#### Features:

- Runs non-blocking (asynchronously) so commit operations complete immediately
- Logs output to timestamped files in `~/.glance-logs/` to prevent terminal clutter
- Includes metadata (timestamp, repository path, commit hash)

## Setup

To set up the Git hooks, run:

```bash
npm run setup:hooks
```

This will create the necessary hooks in your local `.git/hooks/` directory and make them executable.

## How It Works

### Post-Commit Hook

The post-commit hook:

1. Runs after each successful commit
2. Creates a timestamped log file in `~/.glance-logs/`
3. Executes `glance ./` in the background
4. Redirects all output to the log file
5. Returns control to Git immediately

Log files follow this format: `~/.glance-logs/glance-[timestamp].log`

## Troubleshooting

If the hooks aren't working:

1. Make sure they are executable: `chmod +x .git/hooks/post-commit`
2. Verify the hook exists: `ls -la .git/hooks/`
3. Check the log files to see if the hook is running but encountering errors

## Manual Installation

If you prefer to set up the hooks manually:

1. Copy the hook scripts from `scripts/hooks/` to your `.git/hooks/` directory
2. Make them executable: `chmod +x .git/hooks/post-commit`

## Implementation Details

The post-commit hook is implemented as a shell script that:

1. Creates a timestamped log file
2. Logs the start time, repository path, and commit hash
3. Runs `glance ./` and captures its output
4. Logs the completion time
5. All of this happens in a subshell that runs in the background (`&`), so the Git operation isn't blocked

This approach ensures that the potentially time-consuming `glance` operation doesn't slow down your workflow while still providing valuable repository analysis after each commit.
