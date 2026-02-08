# KeeperBoard

Free, open-source leaderboard-as-a-service for indie game developers. Self-host your own leaderboard backend with a dashboard UI and REST API.

Works with **Phaser.js**, **Unity**, and any game that can make HTTP requests.

## Features

- **Multi-game support** — One deployment handles unlimited games
- **Environment separation** — Separate API keys for dev, staging, prod
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
npm install keeperboard-sdk
```

Or copy the `sdk/src/` folder directly into your project.

### Basic usage

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard-sdk';

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

// Get leaderboard
const leaderboard = await client.getLeaderboard(10);
leaderboard.entries.forEach((entry) => {
  console.log(`#${entry.rank} ${entry.player_name}: ${entry.score}`);
});
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

| Endpoint               | Method | Description                 |
| ---------------------- | ------ | --------------------------- |
| `/api/v1/health`       | GET    | Health check (no auth)      |
| `/api/v1/scores`       | POST   | Submit a score              |
| `/api/v1/leaderboard`  | GET    | Get leaderboard entries     |
| `/api/v1/player/:guid` | GET    | Get player's score and rank |
| `/api/v1/player/:guid` | PUT    | Update player name          |
| `/api/v1/claim`        | POST   | Claim imported score        |

## Documentation

- [SDK Reference](sdk/README.md) — Full TypeScript SDK docs
- [Deployment Guide](docs/DEPLOYMENT.md) — Production setup
- [Security](docs/SECURITY.md) — Security architecture
- [API Collection](KeeperBoard_API.postman_collection.json) — Postman collection

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
