# KeeperBoard - Main Plan

> A free, open-source leaderboard service for indie games. Built as a UGS alternative with easy Unity integration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [API Design](#api-design)
6. [Admin Dashboard](#admin-dashboard)
7. [Unity Package](#unity-package)
8. [Authentication](#authentication)
9. [Migration Strategy](#migration-strategy)
10. [Future Considerations](#future-considerations)

---

## Project Overview

### What is KeeperBoard?

A free, self-hostable leaderboard service designed for indie game developers. It provides:

- **Multi-game support** - One deployment handles unlimited games
- **Dev/Prod separation** - Separate API keys per environment
- **Easy Unity integration** - UPM package with simple API
- **Admin dashboard** - Web UI for managing games, leaderboards, and scores
- **UGS migration** - Import existing scores from Unity Gaming Services
- **Player integrity** - Score claiming system prevents duplicates during migration

### Why KeeperBoard?

Unity Gaming Services (UGS) leaderboards don't work with Unity Play due to CSP header restrictions. KeeperBoard solves this by:

- Using standard REST APIs (no CSP issues)
- Being fully self-hosted (you control the infrastructure)
- Having no vendor lock-in (open source, standard PostgreSQL)

### Target Users

- Indie game developers
- Game jam participants
- Hobbyist developers
- Anyone who wants free, simple leaderboards

### Project Repositories

```
keeperboard/                    # Main service (Next.js + Supabase)
├── Admin Dashboard
├── Public API
└── Database schema

keeperboard-unity/              # Unity package (separate repo)
├── Runtime scripts
├── Editor tools
└── Documentation
```

---

## Tech Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Framework** | Next.js 14+ (App Router) | SSR, API routes, React ecosystem |
| **Database** | Supabase (PostgreSQL) | Free tier, managed, RLS support |
| **Authentication** | Supabase Auth | Email/password + OAuth (Google, GitHub) |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Hosting** | Vercel | Free tier, Next.js native |
| **Unity Client** | C# + UnityWebRequest | Native Unity, no dependencies |

### External Accounts Required

1. **Supabase Project** - Database, authentication
2. **Vercel Account** - Hosting (free tier)
3. **GitHub Account** - OAuth provider (optional)
4. **Google Cloud Console** - OAuth provider (optional)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KEEPERBOARD                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Admin Dashboard                             │   │
│  │              (Authenticated users only)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  • Login/Register (Email, Google, GitHub)                       │   │
│  │  • My Games (create, delete, manage)                            │   │
│  │  • API Keys (generate dev/prod per game)                        │   │
│  │  • Leaderboards (create per game, configure)                    │   │
│  │  • Scores (view, search, delete, edit)                          │   │
│  │  • Import Wizard (CSV/JSON, UGS direct import)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       Public API                                 │   │
│  │              (API key authentication)                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  POST /api/v1/scores           Submit a score                   │   │
│  │  GET  /api/v1/leaderboard      Get top N scores                 │   │
│  │  GET  /api/v1/player/:guid     Get player's score & rank        │   │
│  │  PUT  /api/v1/player/:guid     Update player name               │   │
│  │  POST /api/v1/claim            Claim a migrated score           │   │
│  │  GET  /api/v1/health           Health check                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐    │
│  │    Auth      │  │              Database                        │    │
│  ├──────────────┤  ├──────────────────────────────────────────────┤    │
│  │ Email/Pass   │  │  users (extends auth.users)                  │    │
│  │ Google OAuth │  │  games                                       │    │
│  │ GitHub OAuth │  │  api_keys                                    │    │
│  │              │  │  leaderboards                                │    │
│  │              │  │  scores                                      │    │
│  └──────────────┘  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (API Key auth)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         UNITY GAMES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ Graveyard       │  │ Future Game 1   │  │ Future Game 2   │         │
│  │ Groundskeeper   │  │                 │  │                 │         │
│  │                 │  │                 │  │                 │         │
│  │ KeeperBoard     │  │ KeeperBoard     │  │ KeeperBoard     │         │
│  │ Unity Package   │  │ Unity Package   │  │ Unity Package   │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### 1. `users` (extends Supabase auth.users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2. `games`

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,  -- URL-friendly identifier
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, slug)
);

CREATE INDEX idx_games_user ON games(user_id);
```

#### 3. `api_keys`

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'prod')),
  key_prefix TEXT NOT NULL,      -- First 8 chars for identification (e.g., "kb_dev_")
  key_hash TEXT NOT NULL,        -- SHA-256 hash of full key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, environment)   -- One key per environment per game
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_game ON api_keys(game_id);
```

#### 4. `leaderboards`

```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'High Scores',
  slug TEXT NOT NULL DEFAULT 'high-scores',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, slug)
);

CREATE INDEX idx_leaderboards_game ON leaderboards(game_id);
```

#### 5. `scores`

```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  player_guid TEXT,              -- NULL for migrated/unclaimed scores
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',   -- Optional extra data
  is_migrated BOOLEAN DEFAULT FALSE,  -- TRUE if imported from another system
  migrated_from TEXT,            -- Source system (e.g., 'ugs', 'csv')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One score per player per leaderboard (upsert pattern)
  UNIQUE(leaderboard_id, player_guid)
);

CREATE INDEX idx_scores_leaderboard ON scores(leaderboard_id);
CREATE INDEX idx_scores_leaderboard_score ON scores(leaderboard_id, score DESC);
CREATE INDEX idx_scores_player_guid ON scores(player_guid);
CREATE INDEX idx_scores_player_name ON scores(player_name);
```

### Row Level Security (RLS)

```sql
-- Users: can only see/edit own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Games: users can only see/manage their own games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own games" ON games
  FOR DELETE USING (auth.uid() = user_id);

-- API Keys: users can only see/manage keys for their games
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own api_keys" ON api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own api_keys" ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own api_keys" ON api_keys
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );

-- Leaderboards: users can only see/manage leaderboards for their games
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leaderboards" ON leaderboards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own leaderboards" ON leaderboards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );
CREATE POLICY "Users can update own leaderboards" ON leaderboards
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own leaderboards" ON leaderboards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );

-- Scores: users can view/manage scores for their leaderboards
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own scores" ON scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own scores" ON scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own scores" ON scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );
```

### Future: Limits Support (Not Implemented Yet)

When limits are needed, add a `plans` table and `user_limits` view:

```sql
-- Future: Plans table for tiered limits
CREATE TABLE plans (
  id TEXT PRIMARY KEY,  -- 'free', 'pro', etc.
  max_games INTEGER,
  max_leaderboards_per_game INTEGER,
  max_scores_per_leaderboard INTEGER
);

-- Future: Track usage
CREATE VIEW user_usage AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT g.id) as game_count,
  COUNT(DISTINCT l.id) as leaderboard_count,
  COUNT(DISTINCT s.id) as score_count
FROM users u
LEFT JOIN games g ON g.user_id = u.id
LEFT JOIN leaderboards l ON l.game_id = g.id
LEFT JOIN scores s ON s.leaderboard_id = l.id
GROUP BY u.id;
```

---

## API Design

### Authentication

Public API uses API key authentication via header:

```
X-API-Key: kb_dev_xxxxxxxxxxxxxxxx
```

Key format: `kb_{env}_{random32chars}`
- `kb_dev_` prefix for development keys
- `kb_prod_` prefix for production keys

### Endpoints

#### POST `/api/v1/scores`

Submit or update a player's score.

**Request:**
```json
{
  "player_guid": "550e8400-e29b-41d4-a716-446655440000",
  "player_name": "PlayerOne",
  "score": 1000,
  "metadata": {}  // Optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "player_guid": "550e8400-e29b-41d4-a716-446655440000",
    "player_name": "PlayerOne",
    "score": 1000,
    "rank": 5,
    "is_new_high_score": true
  }
}
```

**Behavior:**
- If player_guid exists → update score only if new score is higher
- If player_guid is new → insert new score
- Returns current rank after submission

---

#### GET `/api/v1/leaderboard`

Get top scores for the leaderboard.

**Query Parameters:**
- `limit` (optional, default: 10, max: 100)
- `offset` (optional, default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "player_name": "Champion",
        "score": 5000,
        "player_guid": "..."
      },
      {
        "rank": 2,
        "player_name": "Runner",
        "score": 4500,
        "player_guid": "..."
      }
    ],
    "total_count": 150
  }
}
```

---

#### GET `/api/v1/player/:guid`

Get a specific player's score and rank.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "player_guid": "550e8400-e29b-41d4-a716-446655440000",
    "player_name": "PlayerOne",
    "score": 1000,
    "rank": 42
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Player not found"
}
```

---

#### PUT `/api/v1/player/:guid`

Update a player's name.

**Request:**
```json
{
  "player_name": "NewName"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "player_guid": "...",
    "player_name": "NewName",
    "score": 1000,
    "rank": 42
  }
}
```

---

#### POST `/api/v1/claim`

Claim a migrated score by matching name.

**Request:**
```json
{
  "player_guid": "550e8400-e29b-41d4-a716-446655440000",
  "player_name": "ExistingPlayer"
}
```

**Behavior:**
1. Find migrated score with matching `player_name` and `player_guid IS NULL`
2. If found → set `player_guid` to the provided value
3. If not found → return 404
4. If already claimed → return 409 Conflict

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "claimed": true,
    "score": 1000,
    "rank": 5
  }
}
```

---

#### GET `/api/v1/health`

Health check endpoint (no auth required).

**Response (200 OK):**
```json
{
  "success": true,
  "service": "keeperboard",
  "version": "1.0.0"
}
```

---

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | Missing or invalid API key |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Admin Dashboard

### Pages

#### `/login`
- Email/password login
- Google OAuth button
- GitHub OAuth button
- Link to register

#### `/register`
- Email/password registration
- Google OAuth button
- GitHub OAuth button
- Email verification required

#### `/dashboard`
- Overview of all games
- Quick stats (total scores, API calls)
- Create new game button

#### `/games/[id]`
- Game details and settings
- API keys management (generate/revoke)
- List of leaderboards
- Create new leaderboard button

#### `/games/[id]/leaderboards/[leaderboardId]`
- Leaderboard settings
- Scores table with search/filter
- Delete individual scores
- Import scores wizard

#### `/games/[id]/import`
- Import wizard with tabs:
  - Manual (CSV/JSON paste)
  - UGS Import (enter credentials)
- Preview before import
- Mapping configuration

### UI Components

- Clean, minimal design (Tailwind)
- Dark/light mode support
- Responsive for mobile management
- Toast notifications for actions
- Confirmation dialogs for destructive actions

---

## Unity Package

### Repository Structure

```
keeperboard-unity/
├── package.json                 # UPM manifest
├── README.md
├── LICENSE
├── Runtime/
│   ├── KeeperBoard.asmdef
│   ├── KeeperBoardClient.cs     # Main API client
│   ├── KeeperBoardConfig.cs     # ScriptableObject config
│   ├── KeeperBoardTypes.cs      # Data types
│   ├── PlayerIdentity.cs        # GUID management
│   └── Internal/
│       └── WebRequestHelper.cs  # Async request handling
├── Editor/
│   ├── KeeperBoard.Editor.asmdef
│   ├── KeeperBoardConfigEditor.cs
│   └── KeeperBoardSetupWizard.cs
└── Samples~/
    └── BasicUsage/
        ├── ExampleLeaderboard.cs
        └── ExampleLeaderboard.unity
```

### Installation

```
// In Unity Package Manager
Add package from git URL:
https://github.com/[username]/keeperboard-unity.git
```

### Configuration

1. Create config asset: `Assets > Create > KeeperBoard > Config`
2. Enter API URL and keys in inspector
3. Reference config from your scripts

```csharp
[CreateAssetMenu(fileName = "KeeperBoardConfig", menuName = "KeeperBoard/Config")]
public class KeeperBoardConfig : ScriptableObject
{
    [Header("API Settings")]
    public string apiUrl = "https://keeperboard.vercel.app/api/v1";

    [Header("API Keys")]
    public string devApiKey;
    public string prodApiKey;

    [Header("Behavior")]
    public bool useProductionInEditor = false;
    public int maxRetries = 3;
    public float retryDelaySeconds = 1f;

    public string ActiveApiKey =>
#if UNITY_EDITOR
        useProductionInEditor ? prodApiKey : devApiKey;
#elif DEVELOPMENT_BUILD
        devApiKey;
#else
        prodApiKey;
#endif
}
```

### Usage Example

```csharp
public class GameManager : MonoBehaviour
{
    [SerializeField] private KeeperBoardConfig config;
    private KeeperBoardClient leaderboard;

    private void Start()
    {
        leaderboard = new KeeperBoardClient(config);
    }

    public async void SubmitScore(int score)
    {
        var result = await leaderboard.SubmitScore(score);
        if (result.success)
        {
            Debug.Log($"Score submitted! Rank: {result.data.rank}");
        }
    }

    public async void ShowLeaderboard()
    {
        var result = await leaderboard.GetTopScores(10);
        if (result.success)
        {
            foreach (var entry in result.data.entries)
            {
                Debug.Log($"{entry.rank}. {entry.player_name}: {entry.score}");
            }
        }
    }
}
```

---

## Authentication

### Dashboard Authentication (Supabase Auth)

**Email/Password:**
- Standard email + password
- Email verification required
- Password reset flow

**OAuth Providers:**
- Google (requires Google Cloud Console setup)
- GitHub (requires GitHub OAuth App setup)

### API Authentication (API Keys)

- Keys are generated in dashboard
- Keys are hashed before storage (SHA-256)
- Only the prefix is stored in plain text (for identification)
- Keys can be revoked (deleted)
- One key per environment per game

### Key Generation

```typescript
function generateApiKey(environment: 'dev' | 'prod'): string {
  const prefix = `kb_${environment}_`;
  const random = crypto.randomBytes(24).toString('hex'); // 48 chars
  return prefix + random;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

---

## Migration Strategy

### From UGS (Unity Gaming Services)

#### Manual Export/Import
1. User views scores in UGS Dashboard
2. Copies data manually (or exports if available)
3. Pastes into KeeperBoard import wizard
4. Maps columns (name, score)
5. Imports with `is_migrated = true`, `migrated_from = 'ugs'`

#### Direct UGS Import (Phase 2 Feature)
1. User enters UGS Project ID
2. User enters UGS Service Account credentials
3. KeeperBoard calls UGS API to fetch all scores
4. Scores imported automatically

**UGS API for fetching scores:**
```
GET https://services.api.unity.com/leaderboards/v1/projects/{projectId}/leaderboards/{leaderboardId}/scores
Headers:
  Authorization: Basic {base64(keyId:secretKey)}
```

### Score Claiming

When migrated scores exist (`player_guid IS NULL`):

1. Player launches game with KeeperBoard
2. If `PPrefs.PlayerName` exists (from UGS era):
   - Call `/api/v1/claim` with name
   - If match found → player now owns that score
   - If no match → player starts fresh
3. Future scores use their `player_guid`

---

## Future Considerations

### Potential Features (Not in v1)

1. **Tiered Plans** - Free/Pro with different limits
2. **Webhooks** - Notify external services on new high scores
3. **Analytics** - Score distribution, active players, trends
4. **Achievements** - Beyond leaderboards
5. **Teams/Clans** - Group leaderboards
6. **Tournaments** - Time-limited competitions
7. **Anti-cheat** - Score validation, rate limiting
8. **Custom domains** - White-label support

### Scalability Notes

- Supabase free tier: 500MB database, 5GB bandwidth
- For typical indie games: handles 100k+ scores easily
- If limits approached: upgrade Supabase plan or self-host
- API stateless: horizontal scaling via Vercel

### Security Considerations

- API keys should never be committed to repos
- Use environment variables in Unity
- Rate limiting prevents abuse
- Input validation on all endpoints
- SQL injection prevented by parameterized queries

---

## Summary

KeeperBoard is a straightforward leaderboard service:

- **One Supabase project** handles all games for all users
- **Admin dashboard** for managing everything via web UI
- **Public API** for games to submit/fetch scores
- **Unity package** for easy integration
- **UGS migration** preserves existing player data

The system prioritizes simplicity and indie-friendliness while maintaining proper security and data integrity.

---

*Implementation phases in: `2_keeperboard-implementation.md`*
