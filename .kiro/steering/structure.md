# Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout — fonts, dark mode inline script, global CSS
│   ├── page.tsx                # Home page — orchard list/selector
│   ├── globals.css             # Global styles (Tailwind base)
│   └── orchard/
│       ├── layout.tsx          # Orchard section layout (disables static caching)
│       └── [orchardId]/
│           └── page.tsx        # Orchard detail — care records, transactions, menu tabs
└── lib/
    ├── firebase.ts             # Firestore client, all data types, all CRUD functions
    ├── useTheme.ts             # Dark/light mode hook (reads/writes localStorage + html class)
    └── storage.ts              # Legacy localStorage layer — do not use for new features
```

## Conventions

### Pages
- All pages use `'use client'` — this is a fully client-rendered static export
- Pages own their own data fetching via `useEffect` + async functions from `firebase.ts`
- Loading and error states are handled inline within the page component

### Data Layer (`src/lib/firebase.ts`)
- All Firestore types are exported from here: `Orchard`, `CareRecord`, `Transaction`, `TreeProfile`, `FertilizerProfile`
- All CRUD functions are async and exported from here
- New collections and types should be added to this file
- Client-side filtering is used for `orchardId` scoping (not Firestore `where` queries) — be aware of performance implications at scale

### Styling
- Tailwind utility classes only — no CSS modules, no styled-components
- Dark mode uses the `dark:` variant (class strategy via `dark` on `<html>`)
- Rounded cards: `rounded-2xl` or `rounded-xl`
- Inputs: `bg-slate-50 dark:bg-slate-700 border-none rounded-xl outline-none focus:ring-2`
- Primary action buttons: full-width, `rounded-xl font-bold`, colored per section

### Component Organization
- No `components/` directory yet — UI is colocated in page files
- When extracting components, place them in `src/components/` and import via `@/components/`

### Routing
- `/` — orchard selector (home)
- `/orchard/[orchardId]` — orchard detail with tabbed menu

### Adding New Features
1. Define the TypeScript type in `src/lib/firebase.ts`
2. Add Firestore CRUD functions in `src/lib/firebase.ts`
3. Implement the UI in the relevant page (currently `[orchardId]/page.tsx` for orchard-scoped features)
4. Menu tabs are defined in the `MENU_ITEMS` array in `[orchardId]/page.tsx`
