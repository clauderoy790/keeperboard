# KeeperBoard - Phaser.js Adaptation Plan

> Adapted implementation plan. Replaces the original Unity-focused plan. Target: Phaser.js games with a JavaScript/TypeScript client SDK.

---

## Overview

### What Changed from Original Plan

- **Removed:** Unity package phases (11, 12), Unity test harness references
- **Removed:** UGS (Unity Gaming Services) direct import (Phase 15)
- **Added:** JavaScript/TypeScript client SDK for Phaser.js games
- **Kept:** Manual CSV/JSON import for general data migration
- **Resolved:** CSP validation passed — Unity Play accepts Vercel requests

### Phase Dependencies

```
Phase 1-4 (COMPLETED)
    │
    ▼
Phase 5 (Auth)
    │
    ▼
Phase 6 (Dashboard Layout)
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 7 (Games CRUD)     Phase 10 (JS Client SDK)
    │                          │
    ▼                          │
Phase 8 (Leaderboards)        │
    │                          │
    ▼                          │
Phase 9 (Full Public API) ◄───┘
    │
    ▼
Phase 11 (Scores UI)
    │
    ▼
Phase 12 (CSV/JSON Import)
    │
    ▼
Phase 13 (Integration Test & Polish)
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16+ (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + OAuth) |
| Styling | Tailwind CSS 4 |
| Hosting | Vercel |
| Game Client | Phaser.js + TypeScript SDK |

---

## Phase 1: Project Setup [COMPLETED]

**Status:** Done

Next.js project initialized with TypeScript, Tailwind CSS, ESLint, App Router. Dependencies installed (@supabase/supabase-js, @supabase/ssr). Folder structure created. API response utility at `src/lib/utils/api-response.ts`.

---

## Phase 2: Database Schema [COMPLETED]

**Status:** Done

All 5 tables created in Supabase (users, games, api_keys, leaderboards, scores). RLS policies configured. TypeScript types generated at `src/types/database.ts`. Three Supabase clients created (browser, server, admin). Schema SQL at `supabase/schema.sql`, RLS at `supabase/rls-policies.sql`.

---

## Phase 3: API Skeleton [COMPLETED]

**Status:** Done

Working endpoints: health, scores (POST), leaderboard (GET), player/[guid] (GET/PUT). All using hardcoded `TEST_LEADERBOARD_ID`. CORS configured at `src/lib/utils/cors.ts`. Claim endpoint returns 501 (not implemented). No API key auth yet.

---

## Phase 4: CSP Validation [COMPLETED]

**Status:** Done

Unity test harness built and deployed. Verified that Unity Play accepts requests to Vercel-hosted API. CSP issue resolved by Unity. Validation gate passed.

---

## Phase 5: Authentication System

**Goal:** Implement login/register with Supabase Auth and protect dashboard routes.

**Prerequisites:** Phase 4 completed

**Estimated Complexity:** Medium (5-6 files)

### Context

The project has three Supabase clients already created:
- `src/lib/supabase/client.ts` — Browser client (createBrowserClient from @supabase/ssr)
- `src/lib/supabase/server.ts` — Server client (createServerClient from @supabase/ssr, uses cookies)
- `src/lib/supabase/admin.ts` — Admin client (service role, bypasses RLS)

Auth should use `@supabase/ssr` patterns. The server client handles cookie-based sessions.

### Steps

1. **Create auth middleware**

   `src/middleware.ts`:
   - Refresh session on every request using server Supabase client
   - Protect all `/dashboard/*` routes — redirect unauthenticated to `/login`
   - Redirect authenticated users from `/login` and `/register` to `/dashboard`
   - Allow `/api/v1/*` without auth (public API uses API keys, not sessions)
   - Allow `/`, `/login`, `/register`, `/auth/callback` without auth

2. **Create login page**

   `src/app/(auth)/login/page.tsx` (replace existing stub):
   - Email/password form
   - Google OAuth button (optional, only if configured)
   - GitHub OAuth button (optional, only if configured)
   - Link to register page
   - Error/success message display
   - Use Supabase `signInWithPassword` and `signInWithOAuth`
   - Clean Tailwind styling — centered card layout

3. **Create register page**

   `src/app/(auth)/register/page.tsx` (replace existing stub):
   - Email/password form with confirmation
   - Link to login page
   - Success message about email verification
   - Use Supabase `signUp`

4. **Create auth layout**

   `src/app/(auth)/layout.tsx`:
   - Centered layout for auth pages
   - KeeperBoard branding/logo text

5. **Create auth callback route**

   `src/app/auth/callback/route.ts`:
   - Handle OAuth callback
   - Exchange code for session
   - Redirect to `/dashboard`

6. **Create logout action**

   `src/app/(auth)/actions.ts`:
   - Server action for `signOut`
   - Server action for `signInWithPassword`
   - Server action for `signUp`
   - Server action for OAuth sign-in

### Files Created/Modified
- `src/middleware.ts` (new)
- `src/app/(auth)/login/page.tsx` (replace stub)
- `src/app/(auth)/register/page.tsx` (replace stub)
- `src/app/(auth)/layout.tsx` (new)
- `src/app/auth/callback/route.ts` (new)
- `src/app/(auth)/actions.ts` (new)

### Manual Testing Checklist
- [ ] Visit `/dashboard` when logged out → redirects to `/login`
- [ ] Register with new email → success message shown
- [ ] Login with registered account → redirects to `/dashboard`
- [ ] Visit `/login` when logged in → redirects to `/dashboard`
- [ ] API endpoints (`/api/v1/health`) still work without auth
- [ ] `npm run build` completes without errors

---

## Phase 6: Dashboard Layout & Navigation

**Goal:** Create the dashboard shell with sidebar, header, and reusable UI components.

**Prerequisites:** Phase 5 completed

**Estimated Complexity:** Medium (6-7 files)

### Context

Auth is now working. Dashboard routes are protected by middleware. The `(dashboard)` route group exists with stub `layout.tsx` and `page.tsx`.

### Steps

1. **Create reusable UI components**

   `src/components/ui/Button.tsx`:
   - Variants: primary, secondary, danger, ghost
   - Sizes: sm, md, lg
   - Loading state with spinner

   `src/components/ui/Input.tsx`:
   - Label, error message, helper text
   - Standard form input styling

   `src/components/ui/Card.tsx`:
   - Container with optional title, description, footer
   - Clean bordered card styling

2. **Create sidebar component**

   `src/components/dashboard/Sidebar.tsx`:
   - KeeperBoard logo/text at top
   - Nav links: Dashboard (home icon), Games (gamepad icon)
   - Active state highlighting based on current route
   - User section at bottom with email display and logout button
   - Collapsible on mobile (hamburger menu)

3. **Create header component**

   `src/components/dashboard/Header.tsx`:
   - Page title (dynamic based on route)
   - Mobile menu toggle button
   - User avatar/initial

4. **Update dashboard layout**

   `src/app/(dashboard)/layout.tsx` (replace stub):
   - Fetch current user from Supabase server client
   - Sidebar + header + main content area
   - Responsive: sidebar collapses on mobile

5. **Create dashboard home page**

   `src/app/(dashboard)/page.tsx` (replace stub):
   - Welcome message with user's display name
   - Stats cards: Total Games, Total Leaderboards, Total Scores (fetched from DB)
   - "Create Your First Game" CTA if no games exist
   - Quick links to recent games

### Files Created/Modified
- `src/components/ui/Button.tsx` (new)
- `src/components/ui/Input.tsx` (new)
- `src/components/ui/Card.tsx` (new)
- `src/components/dashboard/Sidebar.tsx` (new)
- `src/components/dashboard/Header.tsx` (new)
- `src/app/(dashboard)/layout.tsx` (replace stub)
- `src/app/(dashboard)/page.tsx` (replace stub)

### Manual Testing Checklist
- [ ] Dashboard has sidebar with navigation links
- [ ] Dashboard has header with page title
- [ ] Sidebar highlights active page
- [ ] Logout button in sidebar works
- [ ] Dashboard home shows welcome message
- [ ] Stats cards display (zeros if no data)
- [ ] Responsive: sidebar collapses on mobile
- [ ] `npm run build` completes without errors

---

## Phase 7: Games Management

**Goal:** CRUD operations for games and API key generation.

**Prerequisites:** Phase 6 completed

**Estimated Complexity:** Medium (6-7 files)

### Context

Dashboard layout is working with sidebar/header. UI components (Button, Input, Card) are available. The `games` table exists in Supabase with RLS policies. The `api_keys` table exists with unique constraint on (game_id, environment).

API key format: `kb_{env}_{random48chars}` (e.g., `kb_dev_a1b2c3...`). Keys are hashed with SHA-256 before storage. Only the prefix (`kb_dev_` or `kb_prod_`) is stored in plain text.

### Steps

1. **Create games list page**

   `src/app/(dashboard)/games/page.tsx`:
   - Grid/list of user's games
   - Each card shows: game name, slug, leaderboard count, created date
   - "Create Game" button
   - Empty state if no games

2. **Create game form component**

   `src/components/forms/GameForm.tsx`:
   - Fields: name, slug (auto-generated from name), description
   - Slug validation (lowercase, hyphens only)
   - Used for both create and edit
   - Submit calls server action

3. **Create game detail page**

   `src/app/(dashboard)/games/[gameId]/page.tsx` (replace stub):
   - Game info section (name, slug, description) with edit capability
   - API Keys section:
     - Generate dev/prod keys
     - Show key ONCE after generation (modal or inline)
     - Display key prefix + last used date for existing keys
     - Regenerate/delete keys
   - Leaderboards section (placeholder — built in Phase 8)
   - Delete game button (with confirmation)

4. **Create dashboard API routes for games**

   `src/app/api/games/route.ts`:
   - GET: List user's games (with leaderboard count)
   - POST: Create new game

   `src/app/api/games/[gameId]/route.ts`:
   - GET: Game details
   - PUT: Update game
   - DELETE: Delete game

5. **Create dashboard API route for API keys**

   `src/app/api/games/[gameId]/api-keys/route.ts`:
   - POST: Generate new API key (returns plain key once, stores hash)
   - DELETE: Revoke API key

6. **Create API key display component**

   `src/components/dashboard/ApiKeysCard.tsx`:
   - Shows existing keys (prefix only + status)
   - Generate button per environment
   - Copy-to-clipboard for newly generated keys
   - Regenerate warning (old key stops working)

### Files Created/Modified
- `src/app/(dashboard)/games/page.tsx` (new)
- `src/app/(dashboard)/games/[gameId]/page.tsx` (replace stub)
- `src/components/forms/GameForm.tsx` (new)
- `src/components/dashboard/ApiKeysCard.tsx` (new)
- `src/app/api/games/route.ts` (new)
- `src/app/api/games/[gameId]/route.ts` (new)
- `src/app/api/games/[gameId]/api-keys/route.ts` (new)

### Manual Testing Checklist
- [ ] Create a game → appears in games list
- [ ] Game slug auto-generates from name
- [ ] View game detail page shows game info
- [ ] Edit game name/description works
- [ ] Generate dev API key → key shown once, can copy
- [ ] Generate prod API key → separate from dev
- [ ] Key prefix visible in keys list after generation
- [ ] Delete game works (with confirmation)
- [ ] `npm run build` completes without errors

---

## Phase 8: Leaderboards Management

**Goal:** CRUD for leaderboards within a game.

**Prerequisites:** Phase 7 completed

**Estimated Complexity:** Simple (4-5 files)

### Context

Games CRUD is working. Game detail page exists with a placeholder for leaderboards. The `leaderboards` table has fields: id, game_id, name, slug, sort_order (asc/desc). Unique constraint on (game_id, slug).

### Steps

1. **Create leaderboards list component**

   `src/components/dashboard/LeaderboardsList.tsx`:
   - List of leaderboards for a game
   - Each row: name, slug, sort order, score count, created date
   - "Create Leaderboard" button
   - Click to navigate to leaderboard detail

2. **Create leaderboard form**

   `src/components/forms/LeaderboardForm.tsx`:
   - Fields: name, slug (auto-generated), sort order (dropdown: "Highest First" / "Lowest First")
   - Used for create and edit

3. **Add leaderboard detail page**

   `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`:
   - Leaderboard info with edit capability
   - Scores table placeholder (built in Phase 11)
   - Delete leaderboard button

4. **Create dashboard API routes**

   `src/app/api/games/[gameId]/leaderboards/route.ts`:
   - GET: List leaderboards for game (with score counts)
   - POST: Create leaderboard

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/route.ts`:
   - GET: Leaderboard details
   - PUT: Update leaderboard
   - DELETE: Delete leaderboard

5. **Integrate into game detail page**

   Update `src/app/(dashboard)/games/[gameId]/page.tsx`:
   - Replace leaderboard placeholder with LeaderboardsList component

### Files Created/Modified
- `src/components/dashboard/LeaderboardsList.tsx` (new)
- `src/components/forms/LeaderboardForm.tsx` (new)
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx` (new)
- `src/app/api/games/[gameId]/leaderboards/route.ts` (new)
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/route.ts` (new)
- `src/app/(dashboard)/games/[gameId]/page.tsx` (modify)

### Manual Testing Checklist
- [ ] Create leaderboard within a game → appears in list
- [ ] Slug auto-generates from name
- [ ] Sort order dropdown works (Highest First / Lowest First)
- [ ] Edit leaderboard name/sort order works
- [ ] Leaderboard detail page loads
- [ ] Delete leaderboard works
- [ ] Leaderboards show in game detail page
- [ ] `npm run build` completes without errors

---

## Phase 9: Full Public API

**Goal:** Replace hardcoded skeleton API with proper API key authentication and dynamic leaderboard lookup.

**Prerequisites:** Phase 8 completed (games + leaderboards + API keys exist in dashboard)

**Estimated Complexity:** Medium (4-5 files)

### Context

Current API routes use `TEST_LEADERBOARD_ID = '00000000-0000-0000-0000-000000000002'` hardcoded. Need to:
1. Validate API key from `X-API-Key` header
2. Look up the game from the API key
3. Determine which leaderboard to use (from query param or default)
4. Replace all hardcoded IDs

Existing routes to update:
- `src/app/api/v1/scores/route.ts`
- `src/app/api/v1/leaderboard/route.ts`
- `src/app/api/v1/player/[guid]/route.ts`
- `src/app/api/v1/claim/route.ts`

The health endpoint stays public (no API key needed).

### Steps

1. **Implement API key validation**

   `src/lib/api/auth.ts` (replace stub):
   - `validateApiKey(request: Request)` function
   - Extract key from `X-API-Key` header
   - Hash with SHA-256
   - Look up in `api_keys` table by `key_hash`
   - Join to get `game_id` and game details
   - Update `last_used_at` timestamp
   - Return `{ gameId, environment }` or error

2. **Create leaderboard resolver**

   `src/lib/api/leaderboard.ts`:
   - `resolveLeaderboard(gameId: string, leaderboardSlug?: string)` function
   - If slug provided: look up specific leaderboard for game
   - If no slug: return the first/default leaderboard for game
   - Return leaderboard ID or 404 error

3. **Update scores endpoint**

   `src/app/api/v1/scores/route.ts`:
   - Add API key validation
   - Accept optional `leaderboard` query param (slug)
   - Use resolved leaderboard ID instead of hardcoded
   - Keep existing upsert logic (only update if higher score)

4. **Update leaderboard endpoint**

   `src/app/api/v1/leaderboard/route.ts`:
   - Add API key validation
   - Accept optional `leaderboard` query param (slug)
   - Use resolved leaderboard ID
   - Respect leaderboard's `sort_order` (asc vs desc)

5. **Update player endpoint**

   `src/app/api/v1/player/[guid]/route.ts`:
   - Add API key validation
   - Accept optional `leaderboard` query param
   - Use resolved leaderboard ID

6. **Implement claim endpoint**

   `src/app/api/v1/claim/route.ts` (replace 501 stub):
   - Add API key validation
   - Accept `{ player_guid, player_name }` body
   - Find migrated score (is_migrated=true, player_guid IS NULL) matching player_name
   - If found: set player_guid, return score + rank
   - If not found: return 404
   - If already claimed: return 409

### Files Created/Modified
- `src/lib/api/auth.ts` (replace stub)
- `src/lib/api/leaderboard.ts` (new)
- `src/app/api/v1/scores/route.ts` (modify)
- `src/app/api/v1/leaderboard/route.ts` (modify)
- `src/app/api/v1/player/[guid]/route.ts` (modify)
- `src/app/api/v1/claim/route.ts` (replace stub)

### Manual Testing Checklist

Test with curl using an API key generated from the dashboard:

```bash
# Should fail — no API key
curl http://localhost:3000/api/v1/leaderboard
# Expected: 401 INVALID_API_KEY

# Should fail — bad API key
curl -H "X-API-Key: kb_dev_fake" http://localhost:3000/api/v1/leaderboard
# Expected: 401 INVALID_API_KEY

# Should succeed — valid API key
curl -H "X-API-Key: kb_dev_YOUR_KEY" http://localhost:3000/api/v1/leaderboard
# Expected: 200 with leaderboard data

# Submit score with API key
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -H "X-API-Key: kb_dev_YOUR_KEY" \
  -d '{"player_guid":"test-123","player_name":"Tester","score":500}'

# Health check still works without key
curl http://localhost:3000/api/v1/health
# Expected: 200
```

- [ ] API calls without key → 401
- [ ] API calls with invalid key → 401
- [ ] API calls with valid key → success
- [ ] Leaderboard slug parameter works
- [ ] Default leaderboard used when no slug
- [ ] Sort order respected (asc vs desc)
- [ ] Claim endpoint works for migrated scores
- [ ] `npm run build` completes without errors

---

## Phase 10: JavaScript Client SDK

**Goal:** Create a lightweight TypeScript/JavaScript client SDK for Phaser.js (and any web game).

**Prerequisites:** Phase 9 completed (full public API working with API key auth)

**Estimated Complexity:** Medium (4-5 files)

### Context

The public API is fully working with API key auth. Now we need a client library that Phaser.js games can use. This should be a standalone TypeScript package that works in any browser environment — not tied to Phaser.js specifically.

The SDK lives inside this repo (not a separate npm package for now). Games import it as a module or copy the files.

### Steps

1. **Create SDK directory**

   `sdk/` at project root with its own `package.json` and `tsconfig.json`.

2. **Create client class**

   `sdk/src/KeeperBoardClient.ts`:
   - Constructor: `new KeeperBoardClient({ apiUrl, apiKey })`
   - Methods:
     - `submitScore(playerGuid, playerName, score, metadata?)` → POST /scores
     - `getLeaderboard(limit?, offset?, leaderboardSlug?)` → GET /leaderboard
     - `getPlayer(playerGuid, leaderboardSlug?)` → GET /player/:guid
     - `updatePlayerName(playerGuid, newName, leaderboardSlug?)` → PUT /player/:guid
     - `claimScore(playerGuid, playerName)` → POST /claim
     - `healthCheck()` → GET /health
   - Uses `fetch` API (works in all browsers)
   - Proper error handling with typed responses
   - Auto-sets `X-API-Key` header

3. **Create type definitions**

   `sdk/src/types.ts`:
   - `KeeperBoardConfig` — { apiUrl, apiKey }
   - `ScoreSubmission` — { player_guid, player_name, score, metadata? }
   - `ScoreResponse` — { id, player_guid, player_name, score, rank, is_new_high_score }
   - `LeaderboardResponse` — { entries: LeaderboardEntry[], total_count }
   - `LeaderboardEntry` — { rank, player_name, score, player_guid }
   - `PlayerResponse` — { player_guid, player_name, score, rank }
   - `ClaimResponse` — { claimed, score, rank }
   - `ApiResponse<T>` — { success: boolean, data?: T, error?: string, code?: string }

4. **Create player identity helper**

   `sdk/src/PlayerIdentity.ts`:
   - `getOrCreatePlayerGuid()` — generates UUID and stores in localStorage
   - `getPlayerGuid()` — returns stored GUID or null
   - `setPlayerName(name)` / `getPlayerName()`
   - Uses `localStorage` with configurable key prefix

5. **Create entry point and build config**

   `sdk/src/index.ts`:
   - Export KeeperBoardClient, PlayerIdentity, all types

   `sdk/package.json`:
   - Name: `keeperboard-sdk`
   - Main entry point
   - TypeScript compilation to ESM + CJS

   `sdk/tsconfig.json`:
   - Target ES2020+, module ESNext
   - Declaration files for type support

6. **Create usage example**

   `sdk/examples/phaser-example.ts`:
   - Show how to initialize in a Phaser game
   - Submit score on game over
   - Display leaderboard
   - Handle errors

### Files Created
- `sdk/package.json` (new)
- `sdk/tsconfig.json` (new)
- `sdk/src/index.ts` (new)
- `sdk/src/KeeperBoardClient.ts` (new)
- `sdk/src/types.ts` (new)
- `sdk/src/PlayerIdentity.ts` (new)
- `sdk/examples/phaser-example.ts` (new)

### Manual Testing Checklist
- [ ] SDK compiles without errors (`npx tsc --noEmit` in sdk/)
- [ ] Import SDK in a test script and call `healthCheck()`
- [ ] Submit a score via SDK → appears in dashboard
- [ ] Get leaderboard via SDK → returns correct data
- [ ] Get player via SDK → returns score and rank
- [ ] PlayerIdentity generates and persists GUID in localStorage
- [ ] Error handling works (invalid key returns typed error)

---

## Phase 11: Scores Management UI

**Goal:** View, search, and manage scores in the dashboard leaderboard detail page.

**Prerequisites:** Phase 8 completed (leaderboard detail page exists)

**Estimated Complexity:** Medium (4-5 files)

### Context

Leaderboard detail page exists from Phase 8 with a scores placeholder. Need to add a full scores table with search, pagination, edit, and delete.

### Steps

1. **Create scores table component**

   `src/components/dashboard/ScoresTable.tsx`:
   - Table with columns: Rank, Player Name, Player GUID, Score, Date, Actions
   - Pagination (10/25/50 per page)
   - Search by player name or GUID
   - Sort by score, date, name
   - Inline actions: edit, delete

2. **Create edit score modal**

   `src/components/dashboard/EditScoreModal.tsx`:
   - Edit player name and score
   - Save/cancel buttons

3. **Create dashboard API routes for scores**

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts`:
   - GET: List scores with pagination, search, sorting
   - DELETE: Delete a score by ID

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]/route.ts`:
   - PUT: Update score (name, score value)
   - DELETE: Delete score

4. **Integrate into leaderboard detail page**

   Update `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`:
   - Add ScoresTable component
   - Show total score count in header

### Files Created/Modified
- `src/components/dashboard/ScoresTable.tsx` (new)
- `src/components/dashboard/EditScoreModal.tsx` (new)
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts` (new)
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]/route.ts` (new)
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx` (modify)

### Manual Testing Checklist
- [ ] Scores table displays in leaderboard detail
- [ ] Pagination works (next/prev, page size)
- [ ] Search by player name filters results
- [ ] Edit score modal opens and saves changes
- [ ] Delete score removes it (with confirmation)
- [ ] Ranks recalculate after edit/delete
- [ ] Empty state shows when no scores
- [ ] `npm run build` completes without errors

---

## Phase 12: CSV/JSON Import

**Goal:** Allow importing scores via CSV or JSON paste/upload.

**Prerequisites:** Phase 11 completed

**Estimated Complexity:** Medium (4-5 files)

### Context

Scores management UI exists. Import should allow users to bring in scores from any source (not just UGS). Imported scores are marked with `is_migrated = true` and `migrated_from = 'csv'` or `'json'`.

### Steps

1. **Create import page**

   `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/import/page.tsx`:
   - Tab UI: CSV | JSON
   - Text area for paste or file upload button
   - Format instructions for each type

2. **Create import component**

   `src/components/dashboard/ImportWizard.tsx`:
   - Step 1: Paste/upload data
   - Step 2: Column mapping (which column is player_name, which is score)
   - Step 3: Preview table showing first 10 rows
   - Step 4: Import with progress indicator
   - Duplicate handling: skip or update existing

3. **Create import API route**

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts`:
   - POST: Accept array of `{ player_name, score, player_guid? }`
   - Batch insert/upsert
   - Mark as `is_migrated = true`, `migrated_from = 'csv'` or `'json'`
   - Return success count, skip count, error count

4. **Add import button to leaderboard detail**

   Update leaderboard detail page to include "Import Scores" button linking to import page.

### Files Created/Modified
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/import/page.tsx` (new)
- `src/components/dashboard/ImportWizard.tsx` (new)
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts` (new)
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx` (modify — add import button)

### Expected CSV Format
```csv
player_name,score
Champion,5000
Runner,4500
ThirdPlace,4000
```

### Expected JSON Format
```json
[
  { "player_name": "Champion", "score": 5000 },
  { "player_name": "Runner", "score": 4500 }
]
```

### Manual Testing Checklist
- [ ] CSV paste imports correctly
- [ ] JSON paste imports correctly
- [ ] File upload works (drag & drop or click)
- [ ] Column mapping UI works for non-standard CSV headers
- [ ] Preview shows correct data before import
- [ ] Duplicate handling: skip existing or update
- [ ] Imported scores show `is_migrated = true` in DB
- [ ] Import count summary shows after completion
- [ ] `npm run build` completes without errors

---

## Phase 13: Integration Testing & Polish

**Goal:** End-to-end testing with a Phaser.js game, UI polish, and production readiness.

**Prerequisites:** All previous phases completed

**Estimated Complexity:** Medium (5-6 files)

### Steps

1. **Create Phaser.js test game**

   `test-game/` at project root:
   - Minimal Phaser.js game (e.g., click counter or simple arcade)
   - Integrates KeeperBoard SDK
   - Submit score on game over
   - Show leaderboard in-game
   - Test all SDK methods

2. **Add rate limiting to public API**

   Update API routes or create middleware:
   - Rate limit by API key (e.g., 60 requests/minute)
   - Return 429 with `RATE_LIMITED` error code
   - Use in-memory store (simple Map with TTL) for MVP

3. **Polish dashboard UI**

   - Toast notifications for actions (create, delete, import)
   - Confirmation dialogs for destructive actions
   - Loading states on all data fetches
   - Error boundaries
   - Empty states with helpful CTAs

4. **Security review**

   - Verify all dashboard API routes check auth
   - Verify public API routes require API key (except health)
   - Input validation on all endpoints (length limits, type checks)
   - SQL injection prevention (already handled by Supabase SDK parameterized queries)

5. **Update homepage**

   `src/app/page.tsx`:
   - Landing page explaining KeeperBoard
   - "Get Started" button → register
   - Feature highlights
   - Simple, clean design

6. **Production deployment prep**

   - Verify all environment variables set in Vercel
   - Re-enable RLS if disabled for testing
   - Test OAuth callbacks with production URLs
   - Update CORS if needed for production domains

### Files Created/Modified
- `test-game/` directory (new — Phaser.js test game)
- `src/app/page.tsx` (replace default Next.js page)
- Various dashboard components (polish)
- API routes (rate limiting)

### Manual Testing Checklist
- [ ] Phaser.js test game submits scores via SDK
- [ ] Leaderboard displays correctly in test game
- [ ] Dashboard shows scores submitted from game
- [ ] Rate limiting triggers after threshold
- [ ] Toast notifications appear for all actions
- [ ] Confirmation dialog on delete game/leaderboard/score
- [ ] Loading spinners show during data fetches
- [ ] Homepage looks clean and links to register
- [ ] `npm run build` completes without errors
- [ ] Deploy to Vercel — all features work in production

---

## Quick Reference

### Phase Summary

| Phase | Name | Complexity | Status | Notes |
|-------|------|------------|--------|-------|
| 1 | Project Setup | Simple | ✅ Done | |
| 2 | Database Schema | Simple | ✅ Done | |
| 3 | API Skeleton | Simple | ✅ Done | Hardcoded IDs |
| 4 | CSP Validation | Simple | ✅ Done | Passed |
| 5 | Authentication | Medium | Pending | |
| 6 | Dashboard Layout | Medium | Pending | |
| 7 | Games Management | Medium | Pending | |
| 8 | Leaderboards Management | Simple | Pending | |
| 9 | Full Public API | Medium | Pending | Replace skeleton |
| 10 | JavaScript Client SDK | Medium | Pending | For Phaser.js |
| 11 | Scores Management UI | Medium | Pending | |
| 12 | CSV/JSON Import | Medium | Pending | |
| 13 | Integration Test & Polish | Medium | Pending | |

### Key File Locations

| File | Purpose |
|------|---------|
| `keeperboard/src/app/api/v1/` | Public API endpoints |
| `keeperboard/src/app/(dashboard)/` | Dashboard pages |
| `keeperboard/src/lib/supabase/` | Supabase clients (browser, server, admin) |
| `keeperboard/src/lib/api/auth.ts` | API key validation |
| `keeperboard/src/lib/utils/` | Response helpers, CORS |
| `keeperboard/src/types/database.ts` | Auto-generated DB types |
| `sdk/` | JavaScript/TypeScript client SDK |
| `supabase/schema.sql` | Database schema |
| `supabase/rls-policies.sql` | Row Level Security policies |

---

*Main design doc: `docs/plans/keeperboard.md`*
*Previous plan (superseded): `docs/plans/keeperboard-implementation.md`*
