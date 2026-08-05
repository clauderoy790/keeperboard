# KeeperBoard

Free, open-source leaderboard-as-a-service for indie game developers. Self-host your own leaderboard backend with a dashboard UI and REST API.

Works with **Phaser.js**, **Unity**, and any game that can make HTTP requests.

## Website

https://keeperboard.vercel.app/

## Features

- **Multi-game support** — One deployment handles unlimited games
- **Environment separation** — Separate API keys for dev, staging, prod
- **Time-based leaderboards** — Daily, weekly, monthly resets with version history
- **Anti-cheat protection** — HMAC signing, run tokens, elapsed time validation
- **TypeScript SDK** — Simple client for browser-based games
- **Admin dashboard** — Web UI for managing games, leaderboards, and scores
- **CSV/JSON import** — Migrate scores from any source
- **Free tier friendly** — Built on Supabase + Vercel free tiers

## Quick Start

### 1. Clone and install

```bash
git clone git@github.com:clauderoy790/keeperboard.git
cd keeperboard/keeperboard
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema files in order:
   - `keeperboard/supabase/schema.sql`
   - `keeperboard/supabase/rls-policies.sql`
3. Go to **Settings > API** and copy your keys

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're ready to go!

## Using the SDK

Install the SDK in your game project:

```bash
npm install keeperboard
```

Or copy the `sdk/src/` folder directly into your project.

### Basic usage

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard-';

const client = new KeeperBoardClient({
  apiUrl: 'https://keeperboard.vercel.app',
  apiKey: 'kb_prod_your_api_key',
});

const identity = new PlayerIdentity();

// Submit a score
const result = await client.submitScore(
  identity.getOrCreatePlayerGuid(),
  'PlayerName',
  1500,
);
console.log(`Rank: #${result.rank}`);

// Get current leaderboard
const leaderboard = await client.getLeaderboard({ limit: 10 });
leaderboard.entries.forEach((entry) => {
  console.log(`#${entry.rank} ${entry.player_name}: ${entry.score}`);
});

// For time-based leaderboards, query historical versions
if (leaderboard.version) {
  console.log(`Current version: ${leaderboard.version}`);
  console.log(`Next reset: ${leaderboard.next_reset}`);

  // Get previous version
  const historical = await client.getLeaderboard({
    limit: 10,
    version: leaderboard.version - 1
  });
}
```

See [sdk/README.md](sdk/README.md) for full API documentation.

## Deployment

Deploy to Vercel with one click, or see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### Vercel deployment

1. Fork this repo
2. Import to [Vercel](https://vercel.com)
3. Set root directory to `keeperboard`
4. Add environment variables
5. Deploy

## Tech Stack

| Component | Technology               |
| --------- | ------------------------ |
| Framework | Next.js 16 (App Router)  |
| Database  | Supabase (PostgreSQL)    |
| Auth      | Supabase Auth            |
| Styling   | Tailwind CSS 4           |
| Hosting   | Vercel                   |
| SDK       | TypeScript (fetch-based) |

## Project Structure

```
keeperboard/
├── keeperboard/          # Next.js web app
│   ├── src/app/api/v1/   # Public REST API
│   ├── src/app/(auth)/   # Login/register pages
│   └── src/app/(dashboard)/ # Admin dashboard
├── sdk/                  # TypeScript client SDK
├── docs/                 # Documentation
└── test-game/            # Example Phaser.js game
```

## API Overview

All endpoints require an API key via `X-API-Key` header (except health check).

| Endpoint               | Method | Description                 | Query Params |
| ---------------------- | ------ | --------------------------- | ------------ |
| `/api/v1/health`       | GET    | Health check (no auth)      | — |
| `/api/v1/scores`       | POST   | Submit a score              | — |
| `/api/v1/leaderboard`  | GET    | Get leaderboard entries     | `limit`, `offset`, `leaderboard_slug`, `version` |
| `/api/v1/player/:guid` | GET    | Get player's score and rank | `leaderboard_slug` |
| `/api/v1/player/:guid` | PUT    | Update player name          | `leaderboard_slug` |
| `/api/v1/claim`        | POST   | Claim imported score        | — |
| `/api/v1/runs/start`   | POST   | Start a game run (anti-cheat) | `leaderboard` |
| `/api/v1/runs/finish`  | POST   | Finish run and submit score | — |

**Time-based leaderboards:** Pass `?version=N` to query historical versions. Omit for current version.

## Documentation

- [SDK Reference](sdk/README.md) — Full TypeScript SDK docs (includes anti-cheat guide)
- [Deployment Guide](docs/DEPLOYMENT.md) — Production setup
- [Security](docs/SECURITY.md) — Security architecture
- [API Collection](KeeperBoard_API.postman_collection.json) — Postman collection

## Anti-Cheat Protection

KeeperBoard includes optional anti-cheat measures to prevent casual leaderboard hacking:

| Layer | Protection | Stops |
|-------|------------|-------|
| **HMAC Signing** | Cryptographic request signing | Request tampering, score modification |
| **Run Tokens** | Server-issued session tokens | Replay attacks, fake scores |
| **Elapsed Time** | Minimum game duration | Instant score submissions |
| **Score Cap** | Maximum allowed score | Impossibly high scores |
| **Obfuscation** | Client-side code obfuscation | Casual reverse-engineering |

Enable in the dashboard under **Game Settings > Anti-Cheat**. See [SDK docs](sdk/README.md#anti-cheat-protection) for integration guide.

**Security Model:** These measures stop casual cheaters (DevTools, simple replays). Determined attackers with reverse-engineering skills may still find ways around them — this is an acceptable tradeoff for most indie games.

## Testing

| Where | Command | What it covers |
|-------|---------|----------------|
| `keeperboard/` | `npm run test:run` | API route logic, signature validation, profanity filter, platform normalization. No database. |
| `sdk/` | `npm run test:unit` | SDK logic — cache, retry queue, validation, session. No database. |
| `sdk/` | `npm run test:integration` | **End-to-end against the real REST API and database.** |

### Integration tests

These are the ones that prove the whole stack works. Each file creates its own isolated
game, environment, leaderboard and API key with a random per-run suffix, exercises the API,
then deletes everything it made in `afterAll` — which runs even on failure, so a broken test
cannot orphan rows. Deletes are keyed to IDs created by that run, never to name patterns, so
existing leaderboards are never at risk.

```bash
cd sdk
cp .env.example .env      # fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
npm run test:integration
```

A dev server starts automatically on port 3099 and stops on teardown. Any test that touches
the database must be named `*.integration.test.ts` — that suffix is what separates it from
the unit suite.

Current integration coverage:

- `api.integration.test.ts` — score submission, leaderboards, player rank, name updates
- `anti-cheat.integration.test.ts` — run token replay, elapsed time, score caps, signatures
- `platform.integration.test.ts` — platform/country/version/source validation and storage

`afterAll` cannot run if the process is killed outright, so every integration run starts by
sweeping fixtures orphaned by earlier runs. Run it standalone with `npm run test:clean` from
`sdk/`. See [sdk/README.md](sdk/README.md#orphaned-fixtures) for the safety rules.

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## Development Plans

| Plan | Description | Created | Status |
|------|-------------|---------|--------|
| [Plan 1](docs/plans/keeperboard.md) | Initial Architecture | 2024-12-29 | Completed |
| [Plan 2](docs/plans/2_keeperboard-phaser.md) | KeeperBoard Phaser Adaptation | 2024-12-30 | Completed |
| [Plan 3](docs/plans/3_time-based-leaderboards.md) | Time-Based Leaderboards | 2026-02-08 | Completed |
| [Plan 4](docs/plans/4_sdk-v2.md) | SDK v2.0.0 - Developer Experience | 2026-02-10 | Completed |
| [Plan 5](docs/plans/5_random-player-names.md) | Auto-Generated Player Names | 2026-02-15 | Completed |
| [Plan 6](docs/plans/6_profanity-filter.md) | Profanity Filter for Player Names | 2026-03-07 | Completed |
| [Plan 23](docs/plans/23_anti-cheat-security.md) | Anti-Cheat Security System | 2026-03-11 | Completed |
| [Plan 24](docs/plans/24_platform-tracking-analytics.md) | Platform Tracking & Analytics | 2026-08-04 | Phase 2/10 (Aug 4) |

**Active:** Plan 24 - Platform Tracking & Analytics (Phase 3 next)

## License

[MIT](LICENSE)
