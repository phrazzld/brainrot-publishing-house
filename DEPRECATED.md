# ⚠️ REPOSITORY DEPRECATED - MOVED TO MONOREPO ⚠️

## This repository has been archived and is no longer maintained.

### 📦 The project has been migrated to a monorepo structure

**New Repository:** https://github.com/phrazzld/brainrot

### What Changed?

This web application is now part of a unified monorepo that includes:

- **Web App**: The frontend you see here (now at `apps/web/`)
- **Translations**: All book content (now at `content/translations/`)
- **Publisher CLI**: Automated publishing tools (at `apps/publisher/`)
- **Shared Packages**: Reusable libraries (at `packages/`)

### For Developers

If you're looking to contribute or run the project:

```bash
# Clone the new monorepo
git clone https://github.com/phrazzld/brainrot.git
cd brainrot

# Install dependencies
pnpm install

# Run the web app
pnpm dev --filter=@brainrot/web

# Or run everything
pnpm dev
```

### For Users

The web application continues to run at the same URL. This change is purely organizational and brings:

- ✅ Better code organization
- ✅ Shared utilities across projects
- ✅ Unified CI/CD pipeline
- ✅ Single source of truth for all translations

### Migration Date

**Archived**: August 20, 2025  
**Final Commit**: See commit history  
**Migration Commit in New Repo**: [View Migration](https://github.com/phrazzld/brainrot/commits/master)

### Questions?

Please open issues in the new repository: https://github.com/phrazzld/brainrot/issues

---

_This repository is kept for historical reference only. All new development happens in the monorepo._
