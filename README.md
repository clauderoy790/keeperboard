# KeeperBoard

> Free, open-source leaderboard service for indie games. A UGS alternative that works everywhere.

## Status

🚧 **In Development** - See [Implementation Plan](docs/plans/keeperboard-implementation.md)

## Features (Planned)

- **Multi-game support** - One deployment handles unlimited games
- **Dev/Prod separation** - Separate API keys per environment
- **Easy Unity integration** - UPM package with simple API
- **Admin dashboard** - Web UI for managing everything
- **UGS migration** - Import existing scores from Unity Gaming Services
- **Free tier friendly** - Built on Supabase + Vercel free tiers

## Documentation

- [Main Plan](docs/plans/keeperboard.md) - Architecture, schema, API design
- [Implementation Phases](docs/plans/keeperboard-implementation.md) - Step-by-step build guide

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Unity Client | C# + UnityWebRequest |

## Related Repositories

- `keeper-board` - This repo (web service + dashboard)
- `keeper-board-unity` - Unity UPM package (to be created)

## License

MIT
