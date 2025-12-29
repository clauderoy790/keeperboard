# KeeperBoard - Implementation Phases

> Step-by-step implementation guide. Each phase is designed to be completable in one AI conversation and testable independently.

---

## Overview

### Phase Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Database)
    │
    ├─────────────────────────────────────────┐
    ▼                                         ▼
Phase 3 (Auth)                           Phase 8 (Unity Package)
    │                                         │
    ▼                                         ▼
Phase 4 (Dashboard Layout)               Phase 9 (Unity UPM)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Phase 5       Phase 6         Phase 7
(Games)      (Leaderboards)  (Public API)
    │              │              │
    └──────┬───────┴──────────────┘
           │
           ▼
    Phase 10 (Scores UI)
           │
           ▼
    Phase 11 (Import - Manual)
           │
           ▼
    Phase 12 (Import - UGS)
           │
           ▼
    Phase 13 (Integration Test)
           │
           ▼
    Phase 14 (Polish & Deploy)
```

### Parallel Opportunities

**Parallel Group A (after Phase 2):**
- Phase 3 (Auth) + Phase 8 (Unity Package core)

**Parallel Group B (after Phase 4):**
- Phase 5 (Games) + Phase 6 (Leaderboards) + Phase 7 (Public API)

---

## Phase 1: Project Setup

**Goal:** Initialize Next.js project with dependencies and folder structure.

**Prerequisites:** None

**Estimated AI Complexity:** Simple

### Steps

1. **Create new Next.js project**
   ```bash
   npx create-next-app@latest keeperboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   cd keeperboard
   ```

2. **Install dependencies**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm install -D @types/node
   ```

3. **Create folder structure**
   ```
   src/
   ├── app/
   │   ├── (auth)/
   │   │   ├── login/page.tsx
   │   │   └── register/page.tsx
   │   ├── (dashboard)/
   │   │   ├── layout.tsx
   │   │   ├── page.tsx                    # Dashboard home
   │   │   └── games/
   │   │       ├── page.tsx                # Games list
   │   │       └── [gameId]/
   │   │           ├── page.tsx            # Game detail
   │   │           ├── leaderboards/
   │   │           │   └── [leaderboardId]/page.tsx
   │   │           └── import/page.tsx
   │   ├── api/
   │   │   └── v1/
   │   │       ├── scores/route.ts
   │   │       ├── leaderboard/route.ts
   │   │       ├── player/[guid]/route.ts
   │   │       ├── claim/route.ts
   │   │       └── health/route.ts
   │   ├── layout.tsx
   │   └── page.tsx                        # Landing/redirect
   ├── components/
   │   ├── ui/                             # Reusable UI
   │   ├── dashboard/                      # Dashboard components
   │   └── forms/                          # Form components
   ├── lib/
   │   ├── supabase/
   │   │   ├── client.ts
   │   │   ├── server.ts
   │   │   └── admin.ts                    # Service role client
   │   ├── api/
   │   │   └── auth.ts                     # API key validation
   │   └── utils/
   │       └── api-response.ts
   └── types/
       └── database.ts
   ```

4. **Create environment files**

   `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

   `.env.example`:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Configure Tailwind**

   Add to `tailwind.config.ts`:
   ```typescript
   theme: {
     extend: {
       colors: {
         'kb-primary': '#6366f1',    // Indigo
         'kb-secondary': '#8b5cf6',  // Purple
         'kb-accent': '#f59e0b',     // Amber
       },
     },
   },
   ```

6. **Create API response utility**

   `src/lib/utils/api-response.ts`:
   ```typescript
   export function successResponse<T>(data: T, status = 200) {
     return Response.json({ success: true, data }, { status });
   }

   export function errorResponse(error: string, code: string, status = 400) {
     return Response.json({ success: false, error, code }, { status });
   }
   ```

7. **Update .gitignore**
   ```
   .env.local
   .env.*.local
   ```

### Files Created
- `package.json`
- `tailwind.config.ts`
- `.env.local`, `.env.example`
- Folder structure (empty files ok)
- `src/lib/utils/api-response.ts`

### Manual Testing Checklist
- [ ] `npm run dev` starts without errors
- [ ] Visit http://localhost:3000 - page loads
- [ ] All folders exist as specified
- [ ] `.env.local` exists with placeholders
- [ ] `npm run build` completes without errors

### AI Prompt

```markdown
# Task: KeeperBoard Phase 1 - Project Setup

Create a new Next.js 14+ project called "keeperboard" with:
- TypeScript, Tailwind CSS, ESLint
- App Router with src directory
- Import alias "@/*"

Install dependencies:
- @supabase/supabase-js, @supabase/ssr

Create the folder structure as specified in the plan (see Files Created section).

Create:
1. Environment files (.env.local, .env.example) with Supabase placeholders
2. API response utility at src/lib/utils/api-response.ts
3. Tailwind config with custom colors (kb-primary: indigo, kb-secondary: purple, kb-accent: amber)

DO NOT implement any actual functionality yet - just structure and configuration.
```

---

## Phase 2: Database Schema

**Goal:** Create all tables and RLS policies in Supabase.

**Prerequisites:**
- Phase 1 completed
- Supabase project created manually

**Estimated AI Complexity:** Simple

### Steps

1. **Create Supabase project** (manual)
   - Go to supabase.com
   - Create new project
   - Note URL and keys

2. **Run schema SQL**

   In Supabase SQL Editor, run the complete schema from `2_keeperboard.md`:
   - `users` table with auto-create trigger
   - `games` table
   - `api_keys` table
   - `leaderboards` table
   - `scores` table
   - All indexes

3. **Run RLS policies SQL**

   Run all RLS policies from `2_keeperboard.md`.

4. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
   ```

5. **Create Supabase clients**

   `src/lib/supabase/client.ts` - Browser client
   `src/lib/supabase/server.ts` - Server client
   `src/lib/supabase/admin.ts` - Service role client (for API routes)

6. **Update .env.local** with real credentials

### Files Created/Modified
- `src/types/database.ts` (generated)
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`
- `.env.local` (credentials added)

### Manual Testing Checklist
- [ ] Supabase dashboard shows all 5 tables
- [ ] Each table has RLS enabled (lock icon)
- [ ] Test query in SQL Editor: `SELECT * FROM users;` returns empty
- [ ] TypeScript types file generated with table types
- [ ] Import Supabase client in a test file - no errors

### AI Prompt

```markdown
# Task: KeeperBoard Phase 2 - Database Schema

I have a Supabase project created. I need to:

1. Create SQL file with complete schema from the main plan including:
   - users table (extends auth.users with trigger)
   - games table
   - api_keys table
   - leaderboards table
   - scores table
   - All indexes

2. Create SQL file with all RLS policies from the main plan

3. Create three Supabase client files:
   - src/lib/supabase/client.ts (browser client using @supabase/ssr)
   - src/lib/supabase/server.ts (server client for server components)
   - src/lib/supabase/admin.ts (service role client for API routes, bypasses RLS)

Follow the exact schema from the main plan document.
Generate TypeScript types using: npx supabase gen types typescript --project-id PROJECT_ID

Reference: See 2_keeperboard.md Database Schema section for exact SQL.
```

---

## Phase 3: Authentication System

**Goal:** Implement login/register with email and OAuth providers.

**Prerequisites:** Phase 2 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Create auth middleware**

   `src/middleware.ts`:
   - Protect dashboard routes
   - Redirect unauthenticated to login
   - Redirect authenticated from login to dashboard

2. **Create auth hooks**

   `src/lib/hooks/useAuth.ts`:
   - Get current user
   - Get user profile
   - Sign out function

3. **Create login page**

   `src/app/(auth)/login/page.tsx`:
   - Email/password form
   - Google OAuth button
   - GitHub OAuth button
   - Link to register
   - Error handling

4. **Create register page**

   `src/app/(auth)/register/page.tsx`:
   - Email/password form
   - Google OAuth button
   - GitHub OAuth button
   - Link to login
   - Success message (check email)

5. **Create auth callback route**

   `src/app/auth/callback/route.ts`:
   - Handle OAuth callbacks
   - Exchange code for session

6. **Configure OAuth in Supabase** (manual)
   - Enable Google provider (requires Google Cloud Console setup)
   - Enable GitHub provider (requires GitHub OAuth App setup)
   - Add redirect URLs

### Files Created
- `src/middleware.ts`
- `src/lib/hooks/useAuth.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/auth/callback/route.ts`

### Manual Testing Checklist
- [ ] Visit /dashboard when logged out → redirects to /login
- [ ] Login page renders with email form and OAuth buttons
- [ ] Register with new email → success message appears
- [ ] Check email for verification link (Supabase sends it)
- [ ] Login with verified account → redirects to dashboard
- [ ] OAuth login works (if configured)
- [ ] Logout → redirects to login

### AI Prompt

```markdown
# Task: KeeperBoard Phase 3 - Authentication System

Implement Supabase Auth for the dashboard with:

1. Middleware (src/middleware.ts):
   - Protect all /dashboard/* routes
   - Redirect unauthenticated users to /login
   - Redirect authenticated users from /login to /dashboard

2. Auth hook (src/lib/hooks/useAuth.ts):
   - useAuth() hook returning { user, profile, loading, signOut }
   - Fetch profile from users table

3. Login page (src/app/(auth)/login/page.tsx):
   - Email/password form
   - Google OAuth button
   - GitHub OAuth button
   - Error message display
   - Link to register page
   - Clean Tailwind styling

4. Register page (src/app/(auth)/register/page.tsx):
   - Email/password form
   - OAuth buttons
   - Success message after registration
   - Link to login page

5. OAuth callback route (src/app/auth/callback/route.ts):
   - Handle code exchange
   - Redirect to dashboard

Use @supabase/ssr patterns for auth. Make forms accessible and styled with Tailwind.
```

---

## Phase 4: Dashboard Layout & Home

**Goal:** Create the dashboard shell with navigation and home page.

**Prerequisites:** Phase 3 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Create dashboard layout**

   `src/app/(dashboard)/layout.tsx`:
   - Sidebar navigation
   - Header with user info
   - Main content area
   - Responsive design

2. **Create navigation component**

   `src/components/dashboard/Sidebar.tsx`:
   - Logo/brand
   - Navigation links (Dashboard, Games)
   - User section at bottom
   - Logout button

3. **Create header component**

   `src/components/dashboard/Header.tsx`:
   - Page title
   - User avatar/dropdown
   - Mobile menu toggle

4. **Create dashboard home page**

   `src/app/(dashboard)/page.tsx`:
   - Welcome message
   - Quick stats (games count, total scores)
   - Recent activity (optional)
   - "Create Game" CTA

5. **Create reusable UI components**

   `src/components/ui/`:
   - Button.tsx
   - Input.tsx
   - Card.tsx
   - Badge.tsx

### Files Created
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/Header.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`

### Manual Testing Checklist
- [ ] Dashboard has sidebar and header
- [ ] Navigation links highlight active page
- [ ] User name displays in header/sidebar
- [ ] Logout button works
- [ ] Responsive on mobile (sidebar collapses)
- [ ] Dashboard home shows welcome message
- [ ] UI components render correctly

### AI Prompt

```markdown
# Task: KeeperBoard Phase 4 - Dashboard Layout & Home

Create the dashboard shell with:

1. Dashboard layout (src/app/(dashboard)/layout.tsx):
   - Left sidebar (collapsible on mobile)
   - Top header
   - Main content area
   - Auth check (redirect if not logged in)

2. Sidebar component (src/components/dashboard/Sidebar.tsx):
   - KeeperBoard logo/text
   - Nav links: Dashboard (home icon), Games (gamepad icon)
   - User section at bottom with email and logout

3. Header component (src/components/dashboard/Header.tsx):
   - Dynamic page title
   - User avatar dropdown
   - Mobile menu button

4. Dashboard home (src/app/(dashboard)/page.tsx):
   - "Welcome back, {name}" heading
   - Stats cards: Total Games, Total Scores
   - "Create Your First Game" CTA button

5. Reusable UI components in src/components/ui/:
   - Button (variants: primary, secondary, ghost, danger)
   - Input (with label, error state)
   - Card (with header, content sections)
   - Badge (for status indicators)

Style with Tailwind. Use the kb-primary color for brand elements.
Make it clean and professional looking.
```

---

## Phase 5: Games Management

**Goal:** CRUD operations for games and API key management.

**Prerequisites:** Phase 4 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Create games list page**

   `src/app/(dashboard)/games/page.tsx`:
   - List user's games
   - Create game button
   - Empty state if no games

2. **Create game form component**

   `src/components/forms/GameForm.tsx`:
   - Name input
   - Description textarea
   - Slug auto-generation
   - Submit handling

3. **Create game modal/dialog**

   `src/components/dashboard/CreateGameModal.tsx`:
   - Modal wrapper
   - GameForm inside
   - Success/error handling

4. **Create game detail page**

   `src/app/(dashboard)/games/[gameId]/page.tsx`:
   - Game info card
   - API keys section
   - Leaderboards list
   - Delete game button

5. **Create API keys component**

   `src/components/dashboard/ApiKeysCard.tsx`:
   - Show dev key (generate if missing)
   - Show prod key (generate if missing)
   - Copy to clipboard
   - Regenerate button (with confirm)

6. **Create API routes for games**

   `src/app/api/games/route.ts` - GET (list), POST (create)
   `src/app/api/games/[gameId]/route.ts` - GET, PUT, DELETE
   `src/app/api/games/[gameId]/api-keys/route.ts` - POST (generate), DELETE (revoke)

### Files Created
- `src/app/(dashboard)/games/page.tsx`
- `src/app/(dashboard)/games/[gameId]/page.tsx`
- `src/components/forms/GameForm.tsx`
- `src/components/dashboard/CreateGameModal.tsx`
- `src/components/dashboard/ApiKeysCard.tsx`
- `src/app/api/games/route.ts`
- `src/app/api/games/[gameId]/route.ts`
- `src/app/api/games/[gameId]/api-keys/route.ts`

### Manual Testing Checklist
- [ ] Games page shows empty state initially
- [ ] Create game → appears in list
- [ ] Click game → opens detail page
- [ ] Generate dev API key → key displays (only once!)
- [ ] Copy key to clipboard works
- [ ] Generate prod API key works
- [ ] Delete game → removed from list (with confirmation)
- [ ] API keys are hashed in database (check Supabase)

### AI Prompt

```markdown
# Task: KeeperBoard Phase 5 - Games Management

Implement games CRUD with API key management:

1. Games list page (src/app/(dashboard)/games/page.tsx):
   - Fetch and display user's games
   - "Create Game" button opens modal
   - Empty state: "No games yet. Create your first game!"

2. Game form (src/components/forms/GameForm.tsx):
   - Name (required)
   - Description (optional)
   - Slug (auto-generated from name, editable)
   - Validation

3. Create game modal (src/components/dashboard/CreateGameModal.tsx):
   - Dialog component
   - Contains GameForm
   - Close on success

4. Game detail page (src/app/(dashboard)/games/[gameId]/page.tsx):
   - Game name/description display
   - Edit button (opens modal)
   - API Keys card
   - Leaderboards section (list, create button)
   - Danger zone: Delete game

5. API Keys card (src/components/dashboard/ApiKeysCard.tsx):
   - Dev key row: "Generate" if none, "Copy" + "Regenerate" if exists
   - Prod key row: same
   - IMPORTANT: Full key shown ONLY on generation (stored hashed)
   - Copy button with toast feedback

6. API routes:
   - POST /api/games - create game
   - GET /api/games - list user's games
   - GET/PUT/DELETE /api/games/[gameId]
   - POST /api/games/[gameId]/api-keys - generate key (body: {environment: 'dev'|'prod'})
   - DELETE /api/games/[gameId]/api-keys/[keyId] - revoke key

Key generation format: kb_{env}_{random48chars}
Hash keys with SHA-256 before storing. Only store prefix for identification.
```

---

## Phase 6: Leaderboards Management

**Goal:** CRUD for leaderboards within a game.

**Prerequisites:** Phase 5 completed

**Estimated AI Complexity:** Simple

### Steps

1. **Create leaderboard list component**

   `src/components/dashboard/LeaderboardsList.tsx`:
   - List leaderboards for a game
   - Create button
   - Click to view scores

2. **Create leaderboard form**

   `src/components/forms/LeaderboardForm.tsx`:
   - Name input
   - Slug input
   - Sort order select (desc/asc)

3. **Create leaderboard detail page**

   `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`:
   - Leaderboard info
   - Scores table
   - Settings

4. **Create API routes**

   `src/app/api/games/[gameId]/leaderboards/route.ts` - GET, POST
   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/route.ts` - GET, PUT, DELETE

### Files Created
- `src/components/dashboard/LeaderboardsList.tsx`
- `src/components/forms/LeaderboardForm.tsx`
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`
- `src/app/api/games/[gameId]/leaderboards/route.ts`
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/route.ts`

### Manual Testing Checklist
- [ ] Game detail page shows leaderboards section
- [ ] Create leaderboard → appears in list
- [ ] Default leaderboard created with game (optional)
- [ ] Click leaderboard → opens detail page
- [ ] Edit leaderboard name/settings works
- [ ] Delete leaderboard works (with confirmation)

### AI Prompt

```markdown
# Task: KeeperBoard Phase 6 - Leaderboards Management

Implement leaderboards CRUD within games:

1. Leaderboards list (src/components/dashboard/LeaderboardsList.tsx):
   - Display leaderboards for the game
   - "Create Leaderboard" button
   - Each item clickable to view scores
   - Show score count per leaderboard

2. Leaderboard form (src/components/forms/LeaderboardForm.tsx):
   - Name input
   - Slug input (auto-generated)
   - Sort order: "Highest First" (desc) or "Lowest First" (asc)

3. Leaderboard detail page:
   - Breadcrumb: Games > {game} > {leaderboard}
   - Leaderboard settings card
   - Scores table (implement in Phase 10)
   - Delete button

4. API routes:
   - GET/POST /api/games/[gameId]/leaderboards
   - GET/PUT/DELETE /api/games/[gameId]/leaderboards/[leaderboardId]

All routes must verify the game belongs to the authenticated user.
```

---

## Phase 7: Public API

**Goal:** Implement the game-facing API endpoints.

**Prerequisites:** Phase 2 completed (can run parallel with 3-6)

**Estimated AI Complexity:** Medium

### Steps

1. **Create API key validation middleware**

   `src/lib/api/auth.ts`:
   - Extract API key from header
   - Hash and look up in database
   - Return leaderboard ID or error

2. **Create scores endpoint**

   `src/app/api/v1/scores/route.ts`:
   - POST: Submit score (upsert if higher)
   - Validate API key
   - Return rank after submission

3. **Create leaderboard endpoint**

   `src/app/api/v1/leaderboard/route.ts`:
   - GET: Fetch top scores
   - Query params: limit, offset
   - Include total count

4. **Create player endpoint**

   `src/app/api/v1/player/[guid]/route.ts`:
   - GET: Fetch player's score and rank
   - PUT: Update player name

5. **Create claim endpoint**

   `src/app/api/v1/claim/route.ts`:
   - POST: Claim migrated score by name match

6. **Create health endpoint**

   `src/app/api/v1/health/route.ts`:
   - GET: Return service status

### Files Created
- `src/lib/api/auth.ts`
- `src/app/api/v1/scores/route.ts`
- `src/app/api/v1/leaderboard/route.ts`
- `src/app/api/v1/player/[guid]/route.ts`
- `src/app/api/v1/claim/route.ts`
- `src/app/api/v1/health/route.ts`

### Manual Testing Checklist

Test with curl or Postman:

- [ ] `GET /api/v1/health` → returns success
- [ ] `POST /api/v1/scores` without API key → 401 error
- [ ] `POST /api/v1/scores` with valid key → creates score
- [ ] Submit same player with lower score → score NOT updated
- [ ] Submit same player with higher score → score updated
- [ ] `GET /api/v1/leaderboard` → returns sorted scores
- [ ] `GET /api/v1/leaderboard?limit=5` → returns 5 scores
- [ ] `GET /api/v1/player/{guid}` → returns player's score and rank
- [ ] `PUT /api/v1/player/{guid}` → updates player name

### AI Prompt

```markdown
# Task: KeeperBoard Phase 7 - Public API

Implement the game-facing REST API:

1. API key validation (src/lib/api/auth.ts):
   - Extract key from X-API-Key header
   - Hash the key (SHA-256)
   - Look up in api_keys table
   - Return { gameId, leaderboardId, environment } or error
   - Update last_used_at timestamp

2. POST /api/v1/scores:
   - Validate API key
   - Body: { player_guid, player_name, score, metadata? }
   - Upsert: only update if new score > existing score
   - Return: { id, player_guid, player_name, score, rank, is_new_high_score }

3. GET /api/v1/leaderboard:
   - Validate API key
   - Query params: limit (default 10, max 100), offset (default 0)
   - Return: { entries: [...], total_count }
   - Each entry: { rank, player_name, score, player_guid }

4. GET /api/v1/player/[guid]:
   - Return player's score and current rank
   - 404 if player not found

5. PUT /api/v1/player/[guid]:
   - Body: { player_name }
   - Update player's name
   - Return updated player data

6. POST /api/v1/claim:
   - Body: { player_guid, player_name }
   - Find migrated score matching player_name with null player_guid
   - If found: set player_guid, return score data
   - If not found: 404
   - If already claimed: 409

7. GET /api/v1/health:
   - No auth required
   - Return: { success: true, service: 'keeperboard', version: '1.0.0' }

Use the admin Supabase client (service role) for all database operations.
Standard error response format: { success: false, error: 'message', code: 'CODE' }
```

---

## Phase 8: Unity Package - Core

**Goal:** Create the Unity C# client library.

**Prerequisites:** Phase 2 completed (API schema known)

**Estimated AI Complexity:** Medium

### Steps

1. **Create new Unity package structure**

   Separate repository: `keeperboard-unity/`
   ```
   ├── package.json
   ├── README.md
   ├── LICENSE (MIT)
   ├── Runtime/
   │   ├── KeeperBoard.asmdef
   │   ├── KeeperBoardClient.cs
   │   ├── KeeperBoardConfig.cs
   │   ├── KeeperBoardTypes.cs
   │   ├── PlayerIdentity.cs
   │   └── Internal/
   │       └── WebRequestAwaiter.cs
   └── Editor/
       ├── KeeperBoard.Editor.asmdef
       └── KeeperBoardConfigEditor.cs
   ```

2. **Create configuration ScriptableObject**

   `Runtime/KeeperBoardConfig.cs`:
   - API URL
   - Dev/prod API keys
   - Settings (retries, timeouts)

3. **Create main client class**

   `Runtime/KeeperBoardClient.cs`:
   - SubmitScore()
   - GetTopScores()
   - GetPlayerScore()
   - UpdatePlayerName()
   - ClaimMigratedScore()

4. **Create data types**

   `Runtime/KeeperBoardTypes.cs`:
   - LeaderboardEntry
   - ScoreSubmitResult
   - ApiResponse<T>

5. **Create player identity helper**

   `Runtime/PlayerIdentity.cs`:
   - GUID generation/persistence
   - Name storage

6. **Create async helpers**

   `Runtime/Internal/WebRequestAwaiter.cs`:
   - Enable await on UnityWebRequest

### Files Created
- All files in keeperboard-unity/ structure

### Manual Testing Checklist

In a test Unity project:
- [ ] Import package via git URL
- [ ] Create KeeperBoardConfig asset
- [ ] Configure with test API key
- [ ] Call SubmitScore() → score appears in dashboard
- [ ] Call GetTopScores() → returns data
- [ ] Call GetPlayerScore() → returns player data
- [ ] PlayerIdentity.Guid persists across play sessions

### AI Prompt

```markdown
# Task: KeeperBoard Phase 8 - Unity Package Core

Create a Unity package for KeeperBoard integration.

Repository structure:
```
keeperboard-unity/
├── package.json (UPM manifest)
├── README.md (installation + usage docs)
├── LICENSE (MIT)
├── Runtime/
│   ├── KeeperBoard.asmdef
│   ├── KeeperBoardClient.cs
│   ├── KeeperBoardConfig.cs
│   ├── KeeperBoardTypes.cs
│   ├── PlayerIdentity.cs
│   └── Internal/
│       └── WebRequestAwaiter.cs
└── Editor/
    ├── KeeperBoard.Editor.asmdef
    └── KeeperBoardConfigEditor.cs
```

1. package.json:
   - Name: "com.keeperboard.client"
   - Version: "1.0.0"
   - Unity: "2021.3" minimum

2. KeeperBoardConfig (ScriptableObject):
   - apiUrl (default: "https://keeperboard.vercel.app/api/v1")
   - devApiKey, prodApiKey
   - useProductionInEditor toggle
   - maxRetries, retryDelaySeconds
   - Property: ActiveApiKey (selects based on build type)

3. KeeperBoardClient:
   - Constructor takes KeeperBoardConfig
   - async Task<ApiResponse<ScoreResult>> SubmitScore(int score)
   - async Task<ApiResponse<LeaderboardResult>> GetTopScores(int limit = 10)
   - async Task<ApiResponse<PlayerResult>> GetPlayerScore()
   - async Task<ApiResponse<PlayerResult>> UpdatePlayerName(string name)
   - async Task<ApiResponse<ClaimResult>> ClaimMigratedScore(string name)
   - Uses PlayerIdentity for GUID

4. KeeperBoardTypes:
   - LeaderboardEntry { rank, player_name, score, player_guid }
   - ScoreResult { id, rank, score, is_new_high_score }
   - LeaderboardResult { entries, total_count }
   - PlayerResult { player_guid, player_name, score, rank }
   - ClaimResult { claimed, score, rank }
   - ApiResponse<T> { success, data, error, code }

5. PlayerIdentity (static class):
   - Guid property (generates and persists to PlayerPrefs)
   - Name property (get/set to PlayerPrefs)
   - HasConfirmedName property

6. WebRequestAwaiter:
   - Extension method GetAwaiter for UnityWebRequestAsyncOperation
   - Enables: await request.SendWebRequest()

7. Editor script:
   - Custom inspector for KeeperBoardConfig
   - Test buttons: "Test Connection", "Submit Test Score"

Make all async methods use UnityWebRequest. Handle errors gracefully.
Support WebGL builds (no threads).
```

---

## Phase 9: Unity Package - UPM Setup

**Goal:** Configure package for UPM distribution and create samples.

**Prerequisites:** Phase 8 completed

**Estimated AI Complexity:** Simple

### Steps

1. **Finalize package.json**

   Ensure all metadata correct for UPM.

2. **Create samples**

   `Samples~/BasicUsage/`:
   - Example scene
   - Example script showing all API calls
   - Example UI for leaderboard display

3. **Create documentation**

   `Documentation~/`:
   - SETUP.md - Installation guide
   - USAGE.md - API reference
   - MIGRATION.md - UGS migration guide

4. **Create GitHub repository**
   - Push package
   - Add release tag

### Files Created
- `Samples~/BasicUsage/ExampleLeaderboard.cs`
- `Samples~/BasicUsage/ExampleScene.unity`
- `Documentation~/SETUP.md`
- `Documentation~/USAGE.md`

### Manual Testing Checklist
- [ ] Package installs via: `https://github.com/[user]/keeperboard-unity.git`
- [ ] Samples import correctly
- [ ] Sample scene runs and shows leaderboard
- [ ] Documentation is accessible in Package Manager

### AI Prompt

```markdown
# Task: KeeperBoard Phase 9 - Unity UPM Setup

Finalize the Unity package for distribution:

1. Update package.json with complete metadata:
   - name, version, displayName, description
   - author, repository
   - keywords: ["leaderboard", "score", "multiplayer"]
   - samples array pointing to Samples~

2. Create sample (Samples~/BasicUsage/):
   - ExampleLeaderboard.cs: Full example showing:
     - Initialize on Start
     - Submit score on button click
     - Display top 10 scores in UI
     - Show current player rank
   - ExampleScene.unity: Simple scene with:
     - Score input field
     - Submit button
     - Leaderboard display (using Unity UI)
     - Player name input + save button

3. Create documentation (Documentation~/):
   - SETUP.md: Step-by-step installation via UPM git URL
   - USAGE.md: API reference with code examples
   - MIGRATION.md: How to migrate from UGS

4. Update README.md with:
   - Installation instructions
   - Quick start code example
   - Link to documentation
   - License

Package should be installable via Unity Package Manager using git URL.
```

---

## Phase 10: Scores Management UI

**Goal:** View, search, and manage scores in dashboard.

**Prerequisites:** Phase 6 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Create scores table component**

   `src/components/dashboard/ScoresTable.tsx`:
   - Paginated table
   - Columns: Rank, Name, Score, GUID, Date
   - Delete button per row
   - Search/filter

2. **Create score edit modal**

   `src/components/dashboard/EditScoreModal.tsx`:
   - Edit player name
   - Edit score
   - View metadata

3. **Update leaderboard detail page**

   Add ScoresTable to the page.

4. **Create API routes for scores management**

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts`

### Files Created
- `src/components/dashboard/ScoresTable.tsx`
- `src/components/dashboard/EditScoreModal.tsx`
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts`

### Manual Testing Checklist
- [ ] Leaderboard page shows scores table
- [ ] Pagination works
- [ ] Search filters by player name
- [ ] Click score → edit modal opens
- [ ] Edit player name → saves
- [ ] Delete score → removes (with confirmation)

### AI Prompt

```markdown
# Task: KeeperBoard Phase 10 - Scores Management UI

Add scores management to the dashboard:

1. Scores table (src/components/dashboard/ScoresTable.tsx):
   - Columns: Rank, Player Name, Score, Player GUID (truncated), Created
   - Pagination: 25 per page, prev/next buttons
   - Search input: filter by player name
   - Sort by: score (default), date
   - Row actions: Edit, Delete
   - Empty state for no scores

2. Edit score modal (src/components/dashboard/EditScoreModal.tsx):
   - Edit player name
   - Edit score value
   - Show metadata (read-only JSON)
   - Show migration status
   - Save/Cancel buttons

3. Integrate into leaderboard detail page:
   - Add ScoresTable below settings
   - Add "Import Scores" button linking to import page

4. API route for scores:
   GET /api/games/[gameId]/leaderboards/[leaderboardId]/scores
   - Query params: page, limit, search, sortBy
   - Returns: { scores: [...], total, page, totalPages }

   DELETE /api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]

   PUT /api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]
   - Body: { player_name?, score? }

Use Tailwind for styling. Make table responsive.
```

---

## Phase 11: Import - Manual (CSV/JSON)

**Goal:** Allow importing scores via CSV or JSON paste.

**Prerequisites:** Phase 10 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Create import page**

   `src/app/(dashboard)/games/[gameId]/import/page.tsx`:
   - Tab navigation (Manual, UGS)
   - Manual import form

2. **Create manual import component**

   `src/components/dashboard/ManualImport.tsx`:
   - Textarea for paste
   - File upload for CSV/JSON
   - Column mapping UI
   - Preview table
   - Import button

3. **Create import API route**

   `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts`:
   - Accept array of scores
   - Insert with is_migrated = true

### Files Created
- `src/app/(dashboard)/games/[gameId]/import/page.tsx`
- `src/components/dashboard/ManualImport.tsx`
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts`

### Manual Testing Checklist
- [ ] Import page accessible from leaderboard
- [ ] Paste JSON array → preview shows
- [ ] Upload CSV file → preview shows
- [ ] Map columns: name → player_name, score → score
- [ ] Import → scores appear in leaderboard
- [ ] Imported scores show as "Migrated"
- [ ] Duplicate handling works (skip or error)

### AI Prompt

```markdown
# Task: KeeperBoard Phase 11 - Manual Import

Implement manual score import:

1. Import page (src/app/(dashboard)/games/[gameId]/import/page.tsx):
   - Breadcrumb navigation
   - Tabs: "Manual Import" | "UGS Import" (UGS disabled for now)
   - Leaderboard selector dropdown

2. Manual import component (src/components/dashboard/ManualImport.tsx):
   - Input method toggle: Paste | File Upload
   - Paste mode: Large textarea
   - File mode: Drag & drop zone, accepts .csv, .json
   - Auto-detect format (CSV vs JSON)
   - Column mapping:
     - Dropdown for "Player Name column"
     - Dropdown for "Score column"
   - Preview table showing first 10 rows
   - "Import X scores" button
   - Progress indicator during import

3. CSV/JSON parsing:
   - CSV: Parse headers, map to columns
   - JSON: Accept array of objects
   - Handle common formats

4. Import API route:
   POST /api/games/[gameId]/leaderboards/[leaderboardId]/import
   Body: { scores: [{ player_name, score }], source: 'csv' | 'json' }
   - Insert all with is_migrated=true, migrated_from=source
   - player_guid = null (for claiming later)
   - Return: { imported: number, skipped: number }

5. Duplicate handling options (UI):
   - Skip duplicates (by player_name)
   - Replace duplicates
   - Keep highest score

Show success toast with count after import.
```

---

## Phase 12: Import - UGS Direct

**Goal:** Import scores directly from Unity Gaming Services.

**Prerequisites:** Phase 11 completed

**Estimated AI Complexity:** Complex

### Steps

1. **Research UGS API**

   Document the exact API calls needed:
   - Authentication (service account)
   - List leaderboards
   - Fetch scores

2. **Create UGS import component**

   `src/components/dashboard/UGSImport.tsx`:
   - Project ID input
   - Service Account Key ID input
   - Service Account Secret input
   - Leaderboard selection
   - Fetch & preview
   - Import button

3. **Create UGS API utility**

   `src/lib/ugs/client.ts`:
   - Fetch leaderboards
   - Fetch all scores (with pagination)

4. **Update import page**

   Enable UGS tab, add UGSImport component.

### Files Created
- `src/components/dashboard/UGSImport.tsx`
- `src/lib/ugs/client.ts`
- Update import page

### Manual Testing Checklist
- [ ] UGS tab is enabled
- [ ] Enter UGS credentials
- [ ] Fetch leaderboards → shows list
- [ ] Select leaderboard → fetches scores
- [ ] Preview shows UGS scores
- [ ] Import → scores transferred to KeeperBoard
- [ ] Error handling for invalid credentials

### AI Prompt

```markdown
# Task: KeeperBoard Phase 12 - UGS Direct Import

Implement Unity Gaming Services direct import:

1. Research UGS Leaderboards API:
   - Base URL: https://services.api.unity.com
   - Auth: Basic auth with service account (base64 of keyId:secretKey)
   - GET /leaderboards/v1/projects/{projectId}/leaderboards - List leaderboards
   - GET /leaderboards/v1/projects/{projectId}/leaderboards/{leaderboardId}/scores - Get scores

2. UGS client utility (src/lib/ugs/client.ts):
   - Constructor: projectId, keyId, secretKey
   - getLeaderboards(): Fetch available leaderboards
   - getScores(leaderboardId, limit, offset): Fetch scores with pagination
   - fetchAllScores(leaderboardId): Paginate through all scores

3. UGS import component (src/components/dashboard/UGSImport.tsx):
   - Form fields:
     - UGS Project ID (from Unity Dashboard)
     - Service Account Key ID
     - Service Account Secret Key
     - Help text with links to Unity docs
   - "Fetch Leaderboards" button
   - Leaderboard dropdown (after fetch)
   - "Fetch Scores" button
   - Preview table
   - "Import to KeeperBoard" button
   - Progress indicator for large imports

4. Security note:
   - Credentials are NOT stored
   - Only used for immediate fetch
   - Recommend users create dedicated service account

5. Error handling:
   - Invalid credentials → clear error message
   - Network errors → retry option
   - Rate limiting → show warning

Import sets is_migrated=true, migrated_from='ugs'.
```

---

## Phase 13: Integration Testing

**Goal:** Test full flow with Graveyard Groundskeeper.

**Prerequisites:** Phases 1-11 completed, Unity package ready

**Estimated AI Complexity:** Medium

### Steps

1. **Migrate Graveyard Groundskeeper**

   In the Unity project:
   - Install KeeperBoard package
   - Create configuration
   - Replace LeaderboardManager implementation
   - Update LeaderboardUI to use new manager

2. **Import existing scores**

   Using KeeperBoard dashboard:
   - Create game "Graveyard Groundskeeper"
   - Generate dev/prod API keys
   - Import 26 existing scores from UGS
   - Verify scores appear

3. **Test full flow**

   - Play game, submit score
   - View leaderboard in game
   - Verify in dashboard

### Files Modified (in graveyard-groundskeeper)
- New: `KeeperBoardConfig` asset
- Modified: `LeaderboardManager.cs` (rewritten)
- Modified: `LeaderboardUI.cs` (updated references)

### Manual Testing Checklist
- [ ] Package imports without errors
- [ ] Configuration asset created
- [ ] API keys entered
- [ ] Game connects to KeeperBoard (health check)
- [ ] Submit score → appears in dashboard
- [ ] Get leaderboard → shows scores
- [ ] Migration: Existing player can claim their score
- [ ] Dev build uses dev key
- [ ] Prod build uses prod key
- [ ] Works in Unity Editor
- [ ] Works in WebGL build

### AI Prompt

```markdown
# Task: KeeperBoard Phase 13 - Integration Testing

Integrate KeeperBoard into Graveyard Groundskeeper:

1. Install KeeperBoard Unity package via git URL

2. Create KeeperBoardConfig asset in Assets/ScriptableObjects/
   - Set API URL
   - Set dev API key (from dashboard)
   - Set prod API key (from dashboard)

3. Update LeaderboardManager.cs:
   - Remove all UGS dependencies
   - Use KeeperBoardClient instead
   - Maintain same public interface if possible
   - Initialize in Awake
   - Use PlayerIdentity for GUID management

4. Update LeaderboardUI.cs:
   - Update references to new types
   - LeaderboardEntry → KeeperBoard.LeaderboardEntry
   - Maintain same UI flow

5. Handle migration:
   - On first run, if player has PPrefs.PlayerName:
     - Try to claim migrated score
     - If successful, player keeps their score
   - Sync local high score if no claim

6. Test scenarios:
   - New player: Gets new GUID, submits score
   - Returning player (from UGS): Claims score, continues
   - Offline: Graceful degradation

Keep changes minimal - just replace the backend, not the UI.
```

---

## Phase 14: Polish & Deploy

**Goal:** Final polish and production deployment.

**Prerequisites:** Phase 13 completed

**Estimated AI Complexity:** Medium

### Steps

1. **Polish dashboard UI**

   - Loading states everywhere
   - Error boundaries
   - Empty states
   - Mobile responsiveness
   - Dark mode (optional)

2. **Add rate limiting**

   - Implement basic rate limiting on public API
   - Use Vercel edge config or simple in-memory

3. **Security review**

   - Verify all routes check authentication
   - Verify RLS policies work
   - Test with different user accounts

4. **Deploy to Vercel**

   - Connect GitHub repo
   - Add environment variables
   - Deploy
   - Test production

5. **Update Unity package**

   - Update default API URL to production
   - Tag release

6. **Create landing page** (optional)

   - Simple landing page at root
   - Feature overview
   - "Get Started" CTA

### Files Modified
- Various UI polish
- `src/middleware.ts` (rate limiting)
- Vercel configuration

### Manual Testing Checklist
- [ ] All pages have loading states
- [ ] Errors show friendly messages
- [ ] Mobile layout works
- [ ] Rate limiting triggers on abuse
- [ ] Production deployment works
- [ ] Environment variables set correctly
- [ ] Unity package connects to production
- [ ] OAuth works in production (redirect URLs configured)

### AI Prompt

```markdown
# Task: KeeperBoard Phase 14 - Polish & Deploy

Final polish and deployment:

1. UI Polish:
   - Add loading skeletons to all data-fetching components
   - Add error boundaries with friendly messages
   - Ensure all empty states have helpful text
   - Test and fix mobile responsiveness
   - Add subtle animations (page transitions, button states)

2. Rate limiting:
   - Add rate limiting middleware to /api/v1/* routes
   - Limit: 100 requests per minute per API key
   - Return 429 with Retry-After header when exceeded

3. Security audit:
   - Verify no sensitive data in client bundles
   - Verify all dashboard routes check auth
   - Verify API routes validate API key
   - Test RLS by trying to access other users' data

4. Production deployment:
   - Create vercel.json if needed
   - Document required environment variables
   - Set up production Supabase (or use same with different env)
   - Configure OAuth redirect URLs for production domain

5. Landing page (optional):
   - Simple hero section: "Free Leaderboards for Indie Games"
   - Features list
   - "Get Started" button → register
   - "Documentation" link

Test everything in production before announcing.
```

---

## Quick Reference

### Phase Summary

| Phase | Name | Complexity | Dependencies |
|-------|------|------------|--------------|
| 1 | Project Setup | Simple | None |
| 2 | Database Schema | Simple | 1 |
| 3 | Authentication | Medium | 2 |
| 4 | Dashboard Layout | Medium | 3 |
| 5 | Games Management | Medium | 4 |
| 6 | Leaderboards Management | Simple | 5 |
| 7 | Public API | Medium | 2 |
| 8 | Unity Package Core | Medium | 2 |
| 9 | Unity UPM Setup | Simple | 8 |
| 10 | Scores Management UI | Medium | 6 |
| 11 | Import - Manual | Medium | 10 |
| 12 | Import - UGS | Complex | 11 |
| 13 | Integration Testing | Medium | 1-11 |
| 14 | Polish & Deploy | Medium | 13 |

### Parallel Groups

**Group A** (after Phase 2):
- Phase 3 + Phase 7 + Phase 8

**Group B** (after Phase 4):
- Phase 5 + Phase 6

### Estimated Total

- **Minimum viable** (Phases 1-7, 8-9, 13): ~8-10 sessions
- **Full feature set** (All phases): ~14-16 sessions

---

*Main plan: `2_keeperboard.md`*
