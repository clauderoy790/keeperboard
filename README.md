# KeeperBoard

> Free, open-source leaderboard service for indie games. Works with Phaser.js, Unity, and any game that can make HTTP requests.

## Status

🚧 **In Development** — Phase 11/13

## Features (Planned)

- **Multi-game support** - One deployment handles unlimited games
- **Dev/Prod separation** - Separate API keys per environment
- **JavaScript SDK** - TypeScript client for Phaser.js and web games
- **Admin dashboard** - Web UI for managing games, leaderboards, and scores
- **CSV/JSON import** - Bring in scores from any source
- **Free tier friendly** - Built on Supabase + Vercel free tiers

## Documentation

- [Architecture & API Design](docs/plans/keeperboard.md) - Schema, endpoints, auth
- [Implementation Plan](docs/plans/2_keeperboard-phaser.md) - Active phased build guide

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS 4 |
| Hosting | Vercel |
| Game Client | TypeScript SDK (fetch-based) |

## Development Plans

| Plan | Description | Created | Status |
|------|-------------|---------|--------|
| [Plan 1](docs/plans/keeperboard-implementation.md) | Original Unity-focused plan | Dec 2024 | Superseded |
| [Plan 2](docs/plans/2_keeperboard-phaser.md) | Phaser.js adaptation | Feb 2026 | Phase 10/13 (Feb 07) |
| [Plan 3](docs/plans/3_supabase-keep-alive.md) | Supabase keep-alive system | Feb 2026 | Not started |

**Active:** Plan 2 - KeeperBoard Phaser Adaptation (Phase 11 next)

## License

MIT
