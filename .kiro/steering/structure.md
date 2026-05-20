# Project Structure

```
d:\Gaedenmaster\
│
├── .env                    # Environment variables (gitignored)
├── .env.local              # Local env overrides (gitignored)
├── .gitignore
├── firebase.json           # Firebase Hosting + Firestore config
├── firestore.indexes.json  # Firestore indexes
├── firestore.rules         # Firestore security rules
├── next.config.ts          # Next.js config (static export)
├── package.json            # Dependencies + scripts
├── package-lock.json
├── postcss.config.mjs      # PostCSS (Tailwind)
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── eslint.config.mjs       # ESLint flat config
│
├── .kiro/steering/         # Kiro steering files
│   ├── product.md          # Product overview
│   ├── structure.md        # This file
│   └── tech.md             # Tech stack details
│
├── doc/                    # Documentation
│   ├── PROJECT_SUMMARY.md  # Full project summary
│   ├── ปรับปรุง.md          # Improvement notes
│   ├── ผังต้นทุเรียน.md     # Farm map spec
│   └── ui-mockups/         # UI design reference
│       ├── index.html      # Mockup gallery
│       └── 08-mobile-bottom-nav.html  # Selected design
│
└── src/                    # Source code
    ├── app/                # Next.js App Router
    │   ├── layout.tsx      # Root layout (fonts, dark mode script)
    │   ├── page.tsx        # Home — orchard list (Mobile-first UI)
    │   ├── globals.css     # Global styles (Tailwind base)
    │   │
    │   ├── _components/    # Shared components (home-level)
    │   │   ├── BottomNav.tsx       # Mobile bottom navigation bar
    │   │   └── SettingsModal.tsx   # Settings + user management modal
    │   │
    │   ├── login/          # Login page
    │   │   ├── page.tsx
    │   │   └── LoginClient.tsx
    │   │
    │   └── orchard/        # Orchard section
    │       ├── page.tsx              # Wrapper (Suspense)
    │       ├── layout.tsx            # Orchard layout
    │       ├── OrchardDetailClient.tsx  # Menu cards (normal orchards)
    │       │                            # Redirects to farm-map for ทุเรียนหลังบ้าน
    │       │
    │       ├── _components/          # Shared orchard components
    │       │   ├── SubMenuTabs.tsx       # Tab bar (ทุเรียนหลังบ้าน)
    │       │   ├── SubPageHeader.tsx     # Header + Home/Back buttons
    │       │   └── ComingSoonClient.tsx  # "Coming soon" placeholder
    │       │
    │       ├── care/         # 🌿 การดูแล
    │       │   ├── page.tsx
    │       │   └── CareClient.tsx
    │       │
    │       ├── expense/      # 📊 รายจ่ายทั่วไป
    │       │   ├── page.tsx
    │       │   └── ExpenseClient.tsx
    │       │
    │       ├── farm-map/     # 📍 ผังสวน (เฉพาะทุเรียนหลังบ้าน)
    │       │   ├── page.tsx
    │       │   └── FarmMapClient.tsx
    │       │
    │       ├── upgrade/      # 🔧 ค่าปรับปรุง (Coming Soon)
    │       │   └── page.tsx
    │       │
    │       ├── sales/        # 🛒 การซื้อขาย (Coming Soon)
    │       │   └── page.tsx
    │       │
    │       └── hospital/     # 🏥 ห้องพยาบาล (Coming Soon)
    │           └── page.tsx
    │
    └── lib/                # Shared utilities
        ├── firebase.ts     # Firestore client, types, all CRUD + auth functions
        ├── useAuth.ts      # Auth session hook (localStorage)
        └── useTheme.ts     # Dark/light mode hook
```

## Conventions

### Pages
- All pages use `'use client'` — fully client-rendered static export
- Pages fetch data via `useEffect` + async functions from `firebase.ts`
- Loading and error states handled inline

### Data Layer (`src/lib/firebase.ts`)
- All Firestore types exported: `Orchard`, `CareRecord`, `Transaction`, `TreeProfile`, `AppUser`
- All CRUD + auth functions are async and exported
- New collections/types should be added to this file

### Styling
- Tailwind utility classes only
- Dark mode via `dark:` variant (class strategy)
- Rounded cards: `rounded-2xl`
- Inputs: `bg-slate-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2`

### Component Organization
- `src/app/_components/` — shared across all pages (BottomNav, SettingsModal)
- `src/app/orchard/_components/` — shared within orchard section

### Routing
- `/` — home (orchard list)
- `/login` — login page
- `/orchard?id=xxx` — orchard menu (or redirect to farm-map)
- `/orchard/care?id=xxx` — care records
- `/orchard/expense?id=xxx` — expenses
- `/orchard/farm-map?id=xxx` — farm map (ทุเรียนหลังบ้าน only)
- `/orchard/upgrade?id=xxx` — coming soon
- `/orchard/sales?id=xxx` — coming soon
- `/orchard/hospital?id=xxx` — coming soon

### Adding New Features
1. Define TypeScript type in `src/lib/firebase.ts`
2. Add Firestore CRUD functions in `src/lib/firebase.ts`
3. Create page folder under `src/app/orchard/` with `page.tsx` + `Client.tsx`
4. Add to `SubMenuTabs.tsx` if it's a sub-menu for ทุเรียนหลังบ้าน
5. Add to `OrchardDetailClient.tsx` MENU_ITEMS if it's for all orchards
