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
keeperboard/
├── keeperboard/          # Next.js web app (dashboard + API)
│   └── src/
│       ├── app/api/v1/   # Public REST API
│       ├── app/(auth)/   # Login/register pages
│       ├── app/(dashboard)/ # Protected dashboard
│       ├── lib/supabase/ # DB clients (browser, server, admin)
│       └── types/        # Auto-generated DB types
├── sdk/                  # TypeScript client SDK (Phase 10)
├── supabase/             # Schema + RLS SQL files
└── docs/plans/           # Architecture + implementation plans
```

## Active Plan

**Plan 3:** [Time-Based Leaderboards](docs/plans/3_time-based-leaderboards.md)

- [x] Phase 1: Database Migration (Schema Changes)
- [x] Phase 2: Version Resolution Logic (Lazy Reset Engine)
- [ ] Phase 3: Public API Updates (Score Submission + Leaderboard Query)
- [ ] Phase 4: Dashboard API Updates (CRUD + Scores Management)
- [ ] Phase 5: Dashboard UI — Create/Edit Leaderboard Form
- [ ] Phase 6: Dashboard UI — Leaderboard Detail Page (Version Navigation)
- [ ] Phase 7: SDK Updates (TypeScript Client)
- [ ] Phase 8: Archive Cleanup + Retention
- [ ] Phase 9: Integration Testing & Polish

**Previous:** Plan 2 — KeeperBoard Phaser Adaptation (Completed)

*Note: Keep-alive pings are now managed centrally via [Claudium](https://github.com/clauderoy790/claudium).*

## Key Decisions

- Public API uses API key auth (`X-API-Key` header), not user sessions
- API keys hashed with SHA-256 before storage, shown to user only once
- One score per player per leaderboard (upsert: only update if higher)
- Admin client (service role) used for API routes to bypass RLS
- SDK is TypeScript, browser-native (fetch API), not Phaser-specific
- Custom environments per game (dev, staging, prod, etc.) — leaderboards + scores scoped by environment
- API key tied to an environment → game client's env is determined by which key it uses
