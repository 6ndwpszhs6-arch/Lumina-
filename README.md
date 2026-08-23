# Lumina — Life Organizer

Offline-first life organizer for **iOS & Android** (PWA + Capacitor-ready).

## Features (MVP)

- **Today Dashboard** — greeting, quick stats, focus tasks, habits, pinned notes, goals
- **Tasks** — due dates, priorities, complete/toggle, offline storage
- **Habits** — streak tracking, one-tap complete
- **Notes** — markdown support (basic), pinned notes
- **Goals** — progress bars
- **Budget** — expense list (ready for more)
- **Tags / Projects / Areas** — data model ready (PARA-style)
- **Fully offline** via IndexedDB (Dexie)
- **Mobile-first** UI with bottom nav, safe areas, installable PWA

## Tech Stack

- Next.js + TypeScript + Tailwind CSS
- Dexie.js (IndexedDB)
- Lucide icons
- Ready for Capacitor (native iOS/Android wrappers)
- Grok API ready for AI features (next iteration)

## Getting Started

```bash
cd lumina
npm install
npm run dev
```

Open http://localhost:3000

On phone: open the URL in Safari/Chrome → “Add to Home Screen” for a native-like app experience on both iOS and Android.

## Next steps we can add

1. Add / Edit modals (tasks, habits, notes, expenses)
2. Full calendar + time-blocking
3. Natural-language AI input
4. Weekly review AI
5. Capacitor setup for App Store / Play Store
6. Cloud sync (optional)
7. Better streak logic + habit history
8. Themes & custom areas

Built for a calmer, more organized life.
