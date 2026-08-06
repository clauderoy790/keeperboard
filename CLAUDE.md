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

**Plan 24:** [Platform Tracking & Analytics](docs/plans/24_platform-tracking-analytics.md)

- [x] Phase 1: Database Migration
- [x] Phase 2: API — Accept & Validate
- [x] Phase 3: SDK 2.3.0
- [x] Phase 4: Publish SDK 2.3.0
- [x] Phase 5: Flight747 Integration
- [x] Phase 6: Analytics API
- [x] Phase 7: Analytics Dashboard (Layout B)
- [x] Phase 8: Scores Table Platform Column
- [ ] Phase 9: Store Releases
- [ ] Phase 10: Acquisition Rollout

## Completed Plans

**Plan 23:** [Anti-Cheat Security System](docs/plans/23_anti-cheat-security.md) — ✅ Completed

- [x] Phase 1: Database Schema & Game Settings
- [x] Phase 2: Run Token Endpoints
- [x] Phase 3: HMAC Signature Validation (Server)
- [x] Phase 4: Dashboard - Anti-Cheat Settings & Elapsed Time UI
- [x] Phase 5: SDK - Run Token Support
- [x] Phase 6: SDK - Multi-Step HMAC Signing
- [x] Phase 7: SDK Build - Obfuscation
- [x] Phase 8: Flight747 Integration
- [x] Phase 9: Security Testing & Cleanup

**Plan 6:** [Profanity Filter for Player Names](docs/plans/6_profanity-filter.md) — ✅ Completed

- [x] Phase 1: Database Migration
- [x] Phase 2: Profanity Filter Utility
- [x] Phase 3: API Integration
- [x] Phase 4: Dashboard UI
- [x] Phase 5: Unit Tests
- [x] Phase 6: SDK Update
- [x] Phase 7: Game Integration (flight747)

**Plan 5:** [Auto-Generated Random Player Names](docs/plans/5_random-player-names.md) — ✅ Completed

- [x] Phase 1: Name Generator
- [x] Phase 2: PlayerIdentity Updates
- [x] Phase 3: Session & Types
- [x] Phase 4: Tests
- [x] Phase 5: Docs & Examples

**Plan 4:** [SDK v2.0.0 - Developer Experience Overhaul](docs/plans/4_sdk-v2.md) — ✅ Completed

- [x] Phase 1: camelCase Types & Client Modernization
- [x] Phase 2: Name Validation Utility
- [x] Phase 3: KeeperBoardSession — Identity & Core API
- [x] Phase 4: Cache Layer
- [x] Phase 5: Retry Queue & Submission Guard
- [x] Phase 6: Documentation & Examples
- [x] Phase 7: Package Release & test-game Update

**Plan 3:** [Time-Based Leaderboards](docs/plans/3_time-based-leaderboards.md) — ✅ Completed

**Plan 2:** KeeperBoard Phaser Adaptation — ✅ Completed

**Plan 1:** Initial Architecture — ✅ Completed

*Note: Keep-alive pings are now managed centrally via [Claudium](https://github.com/clauderoy790/claudium).*

## Key Decisions

- Public API uses API key auth (`X-API-Key` header), not user sessions
- API keys hashed with SHA-256 before storage, shown to user only once
- One score per player per leaderboard (upsert: only update if higher)
- Admin client (service role) used for API routes to bypass RLS
- SDK is TypeScript, browser-native (fetch API), not Phaser-specific
- Custom environments per game (dev, staging, prod, etc.) — leaderboards + scores scoped by environment
- API key tied to an environment → game client's env is determined by which key it uses
