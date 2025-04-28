# T104 Plan: Configure legacy peer-deps install in Vercel settings

## Task Description
In Vercel Project Settings → General → Install Command, set `npm install --legacy-peer-deps` as the install command (temporary workaround).

## Background
From T102 and T103, we identified that our project requires the `--legacy-peer-deps` flag for successful installation due to peer dependency conflicts between React 19.x and packages that require React 18.x. While we've documented this in the package.json and added a setup script, we also need to ensure that Vercel uses this flag during deployments.

## Implementation Plan

1. Check if this is a project where the user has access to Vercel settings
2. Document the necessary steps to access Vercel project settings and modify the install command
3. Provide clear instructions on what to set the install command to
4. If the user doesn't have direct access to Vercel, provide alternative solutions

## Expected Results
Vercel deployments will complete successfully without npm install errors by using the `--legacy-peer-deps` flag during the installation step.