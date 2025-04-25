# brainrot publishing house

this nextjs app is a total vibe: a reading + audio platform that merges sweet waveforms, text highlighting, chapter/timestamp sharing, and a spool of dope expansions on the horizon. behold:

## features

- **reading room**: pick your translation, pick your chapter, listen to synced audio. your eyeballs read as your ears feast.
- **timestamp sharing**: copy a share link that auto-seeks to a precise chapter/time. no more scrubbing or guesswork.
- **wavesurfer**: we use wavesurfer.js to visualize the audio waveform and handle playback.

## architecture

- **app/reading-room/[slug]**: main reading component. fetches your text, loads audio, manages chapters/timestamps.
- **hooks & components**: reusable building blocks to handle reading progress, theme toggles, etc.
- **vercel blob storage**: assets are stored in Vercel Blob using a standardized path structure.
- **env**: `.env.local` holds your secrets (stripe key, blob credentials, etc.). config them on vercel for deploy.

## documentation

- [BLOB_STORAGE.md](docs/BLOB_STORAGE.md): details about Blob storage configuration
- [BLOB_PATH_STRUCTURE.md](docs/BLOB_PATH_STRUCTURE.md): path structure for assets in Blob storage
- [ASSET_CLEANUP.md](docs/ASSET_CLEANUP.md): guide for cleaning up local assets after migration

## stack

- **nextjs** (app router) for zero-config routing & serverless endpoints.
- **react** for the core ui.
- **wavesurfer** for audio waveforms and playback.
- **vercel blob storage**: high-performance asset storage that replaces DigitalOcean Spaces.
- **tailwindcss** for speed-coded styling.

## running locally

1. clone the repo
2. `npm install`
3. set up `.env.local`
4. npm run dev
5. open localhost:3000
6. test the reading room: try reading-room/the-iliad?c=1&t=30.
7. explore /checkout to place a pseudo preorder (test mode).

## vision

this is just the beginning:
- line-by-line audio sync & highlight
- buy physical copies with stripe or bitcoin
- dynamic user accounts, profiles, reading stats
- more translations

if you vibe with this or see a next-level improvement, fork it and submit a pr.
zero warranties, maximum fun. stay stoked.
