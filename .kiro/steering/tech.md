# Tech Stack

## Core

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| React | React 19 |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Database | Firebase Firestore (v12) |
| Hosting | Firebase Hosting (static export) |

## Build Output

Next.js is configured for **static export** (`output: 'export'`). This means:
- No server-side rendering or API routes
- All pages must be client-renderable
- Output goes to the `out/` directory
- `trailingSlash: true` is enabled
- Image optimization is disabled (`unoptimized: true`)

## Firebase

- Firestore is the sole data store — no REST API, no local-only storage in production
- `src/lib/storage.ts` is a legacy localStorage implementation — **do not use it for new features**, use `src/lib/firebase.ts` instead
- Firebase config is hardcoded in `src/lib/firebase.ts` (public web config, not a secret)
- Firestore rules currently allow open read/write — not production-safe

## Path Alias

`@/*` maps to `src/*`. Always use this alias for imports within `src/`.

## Common Commands

```bash
# Development server (run manually in terminal)
npm run dev

# Production build (outputs to /out)
npm run build

# Serve production build locally
npm run start

# Lint
npm run lint

# Deploy to Firebase Hosting (after build)
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Notes

- No test framework is currently set up
- ESLint uses the Next.js flat config (`eslint-config-next`)
- Fonts: Geist Sans and Geist Mono loaded via `next/font/google`
