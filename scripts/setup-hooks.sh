#!/bin/bash

# Script to set up Git hooks for the project
# This allows the hooks to be version controlled

# Ensure the script is run from the project root
if [ ! -d ".git" ]; then
  echo "Error: This script must be run from the project root directory"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create post-commit hook
cat > .git/hooks/post-commit << 'EOF'
#!/bin/sh

# Run glance asynchronously after commit
# Output is redirected to a log file with timestamp to prevent terminal clutter
timestamp=$(date +%Y%m%d%H%M%S)
log_dir="$HOME/.glance-logs"
mkdir -p "$log_dir"
log_file="$log_dir/glance-$timestamp.log"

# Notify user that glance is running
echo "Running glance ./ asynchronously (log: $log_file)"

# Run glance asynchronously and redirect all output
(
  echo "Glance started at $(date)" > "$log_file"
  echo "Repository: $(pwd)" >> "$log_file"
  echo "Commit: $(git rev-parse HEAD)" >> "$log_file"
  echo "------------------------" >> "$log_file"
  glance ./ >> "$log_file" 2>&1
  echo "------------------------" >> "$log_file"
  echo "Glance completed at $(date)" >> "$log_file"
) &

# Exit immediately to allow Git to continue
exit 0
EOF

# Make hook executable
chmod +x .git/hooks/post-commit

echo "Git hooks set up successfully:"
echo "- post-commit hook: Runs 'glance ./' asynchronously after each commit"
echo "- Log files will be saved to: $HOME/.glance-logs/"