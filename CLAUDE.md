# KeeperBoard

Free, open-source leaderboard-as-a-service for indie game developers. Built with Next.js + Supabase + Vercel.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Auth)
- **Styling:** Tailwind CSS 4
- **Hosting:** Vercel
- **Game Client:** Phaser.js + TypeScript SDK

## Project Structure

```
keeper-board/
├── keeperboard/          # Next.js web app (dashboard + API)
│   └── src/
│       ├── app/api/v1/   # Public REST API
│       ├── app/(auth)/   # Login/register pages
│       ├── app/(dashboard)/ # Protected dashboard
│       ├── lib/supabase/ # DB clients (browser, server, admin)
│       └── types/        # Auto-generated DB types
├── sdk/                  # JS/TS client SDK (Phase 10)
├── supabase/             # Schema + RLS SQL files
└── docs/plans/           # Architecture + implementation plans
```

## Active Plan

**Plan 2:** [KeeperBoard Phaser Adaptation](docs/plans/2_keeperboard-phaser.md)

### Phase Status

- [x] Phase 1: Project Setup
- [x] Phase 2: Database Schema
- [x] Phase 3: API Skeleton
- [x] Phase 4: CSP Validation
- [x] Phase 5: Authentication System
- [ ] Phase 6: Dashboard Layout & Navigation
- [ ] Phase 7: Games Management
- [ ] Phase 8: Leaderboards Management
- [ ] Phase 9: Full Public API
- [ ] Phase 10: JavaScript Client SDK
- [ ] Phase 11: Scores Management UI
- [ ] Phase 12: CSV/JSON Import
- [ ] Phase 13: Integration Testing & Polish

**Next phase:** Phase 6 — Dashboard Layout & Navigation

## Key Decisions

- Public API uses API key auth (`X-API-Key` header), not user sessions
- API keys hashed with SHA-256 before storage, shown to user only once
- One score per player per leaderboard (upsert: only update if higher)
- Admin client (service role) used for API routes to bypass RLS
- SDK is browser-native (fetch API), not Phaser-specific
