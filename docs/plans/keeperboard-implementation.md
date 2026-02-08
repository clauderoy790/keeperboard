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
    ▼
Phase 3 (API Skeleton) ← VALIDATION START
    │
    ▼
Phase 4 (Unity Test Harness)
    │
    ▼
Phase 5 (Deploy & Validate on Unity Play) ← CSP TEST
    │
    │ If validation passes, continue:
    │
    ├─────────────────────────────────────────┐
    ▼                                         ▼
Phase 6 (Auth)                           Phase 11 (Unity Package)
    │                                         │
    ▼                                         ▼
Phase 7 (Dashboard Layout)               Phase 12 (Unity UPM)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Phase 8       Phase 9         Phase 10
(Games)      (Leaderboards)  (Full Public API)
    │              │              │
    └──────┬───────┴──────────────┘
           │
           ▼
    Phase 13 (Scores UI)
           │
           ▼
    Phase 14 (Import - Manual)
           │
           ▼
    Phase 15 (Import - UGS)
           │
           ▼
    Phase 16 (Integration Test)
           │
           ▼
    Phase 17 (Polish & Deploy)
```

### Validation-First Approach

**Phases 3-5 are designed to validate that KeeperBoard will work on Unity Play BEFORE building the full system.**

- Phase 3: Minimal API endpoints (no auth, hardcoded leaderboard)
- Phase 4: Unity test project that calls all endpoints
- Phase 5: Deploy to Vercel, build to WebGL, test on Unity Play

**If Phase 5 fails (CSP blocks Vercel)** → Stop and investigate alternatives
**If Phase 5 passes** → Continue with full build (Phases 6+)

### Parallel Opportunities

**Parallel Group A (after Phase 5 validation):**
- Phase 6 (Auth) + Phase 11 (Unity Package)

**Parallel Group B (after Phase 7):**
- Phase 8 (Games) + Phase 9 (Leaderboards) + Phase 10 (Full API)

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
   │   │   ├── page.tsx
   │   │   └── games/
   │   │       └── [gameId]/
   │   │           └── page.tsx
   │   ├── api/
   │   │   └── v1/
   │   │       ├── scores/route.ts
   │   │       ├── leaderboard/route.ts
   │   │       ├── player/[guid]/route.ts
   │   │       ├── claim/route.ts
   │   │       └── health/route.ts
   │   ├── layout.tsx
   │   └── page.tsx
   ├── components/
   │   ├── ui/
   │   ├── dashboard/
   │   └── forms/
   ├── lib/
   │   ├── supabase/
   │   │   ├── client.ts
   │   │   ├── server.ts
   │   │   └── admin.ts
   │   ├── api/
   │   │   └── auth.ts
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

5. **Create API response utility**

   `src/lib/utils/api-response.ts`:
   ```typescript
   export function successResponse<T>(data: T, status = 200) {
     return Response.json({ success: true, data }, { status });
   }

   export function errorResponse(error: string, code: string, status = 400) {
     return Response.json({ success: false, error, code }, { status });
   }
   ```

### Files Created
- `package.json`
- `tailwind.config.ts`
- `.env.local`, `.env.example`
- Folder structure
- `src/lib/utils/api-response.ts`

### Manual Testing Checklist
- [ ] `npm run dev` starts without errors
- [ ] Visit http://localhost:3000 - page loads
- [ ] All folders exist as specified
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

Create the folder structure as specified. Create:
1. Environment files (.env.local, .env.example) with Supabase placeholders
2. API response utility at src/lib/utils/api-response.ts

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

   In Supabase SQL Editor, run the complete schema from `keeperboard.md`:
   - `users` table with auto-create trigger
   - `games` table
   - `api_keys` table
   - `leaderboards` table
   - `scores` table
   - All indexes

3. **Run RLS policies SQL**

4. **Generate TypeScript types**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
   ```

5. **Create Supabase clients**

   `src/lib/supabase/client.ts` - Browser client
   `src/lib/supabase/server.ts` - Server client
   `src/lib/supabase/admin.ts` - Service role client

6. **Update .env.local** with real credentials

### Files Created/Modified
- `src/types/database.ts` (generated)
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`
- `.env.local` (credentials added)

### Manual Testing Checklist
- [ ] Supabase dashboard shows all 5 tables
- [ ] Each table has RLS enabled
- [ ] TypeScript types file generated
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

Reference: See keeperboard.md Database Schema section for exact SQL.
```

---

## Phase 3: API Skeleton (Validation)

**Goal:** Create minimal working API endpoints to validate the approach before building the full system.

**Prerequisites:** Phase 2 completed

**Estimated AI Complexity:** Simple

**PURPOSE:** This phase creates a bare-minimum API to test if Unity Play allows connections to Vercel. No authentication, no dashboard - just working endpoints.

### Steps

1. **Create a test leaderboard manually**

   In Supabase SQL Editor:
   ```sql
   -- Create a test game (no user, just for testing)
   INSERT INTO games (id, user_id, name, slug)
   VALUES (
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000000',  -- Fake user ID
     'Test Game',
     'test-game'
   );

   -- Create a test leaderboard
   INSERT INTO leaderboards (id, game_id, name, slug, sort_order)
   VALUES (
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'High Scores',
     'high-scores',
     'desc'
   );
   ```

2. **Temporarily disable RLS for testing**

   In Supabase SQL Editor:
   ```sql
   -- Temporarily disable RLS for skeleton testing
   ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
   ALTER TABLE leaderboards DISABLE ROW LEVEL SECURITY;
   ```

3. **Create health endpoint**

   `src/app/api/v1/health/route.ts`:
   ```typescript
   import { successResponse } from '@/lib/utils/api-response';

   export async function GET() {
     return successResponse({
       service: 'keeperboard',
       version: '0.1.0-skeleton',
       timestamp: new Date().toISOString()
     });
   }
   ```

4. **Create scores endpoint (simplified)**

   `src/app/api/v1/scores/route.ts`:
   - POST: Submit score (no API key auth yet)
   - Uses hardcoded leaderboard ID for testing
   - Upsert logic (only update if higher)

5. **Create leaderboard endpoint (simplified)**

   `src/app/api/v1/leaderboard/route.ts`:
   - GET: Fetch top scores
   - Uses hardcoded leaderboard ID
   - Returns sorted results with rank

6. **Create player endpoint (simplified)**

   `src/app/api/v1/player/[guid]/route.ts`:
   - GET: Fetch player's score and rank
   - PUT: Update player name

### Files Created
- `src/app/api/v1/health/route.ts`
- `src/app/api/v1/scores/route.ts`
- `src/app/api/v1/leaderboard/route.ts`
- `src/app/api/v1/player/[guid]/route.ts`

### Manual Testing Checklist

Test locally with curl:

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Submit a score
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"player_guid": "test-123", "player_name": "TestPlayer", "score": 100}'

# Get leaderboard
curl http://localhost:3000/api/v1/leaderboard

# Get player score
curl http://localhost:3000/api/v1/player/test-123

# Update player name
curl -X PUT http://localhost:3000/api/v1/player/test-123 \
  -H "Content-Type: application/json" \
  -d '{"player_name": "NewName"}'
```

- [ ] Health returns success
- [ ] Submit score creates entry in database
- [ ] Submit higher score updates entry
- [ ] Submit lower score does NOT update
- [ ] Leaderboard returns sorted scores
- [ ] Player endpoint returns score and rank

### AI Prompt

```markdown
# Task: KeeperBoard Phase 3 - API Skeleton (Validation)

Create minimal API endpoints to validate the system works. NO authentication, NO dashboard - just bare endpoints for testing.

Use hardcoded leaderboard ID: '00000000-0000-0000-0000-000000000002'

1. GET /api/v1/health
   - Return: { success: true, data: { service: 'keeperboard', version: '0.1.0-skeleton', timestamp: ISO string } }

2. POST /api/v1/scores
   - Body: { player_guid: string, player_name: string, score: number }
   - Upsert to scores table (only update if new score > existing)
   - Return: { success: true, data: { id, player_guid, player_name, score, rank, is_new_high_score } }
   - Calculate rank by counting scores higher than this one

3. GET /api/v1/leaderboard
   - Query params: limit (default 10), offset (default 0)
   - Return: { success: true, data: { entries: [{rank, player_name, score, player_guid}], total_count } }
   - Sort by score DESC

4. GET /api/v1/player/[guid]
   - Return player's score and current rank
   - 404 if not found

5. PUT /api/v1/player/[guid]
   - Body: { player_name: string }
   - Update player name
   - Return updated data with rank

Use the admin Supabase client (service role) for all operations.
Use the api-response utility for consistent responses.

This is SKELETON code - no auth, no validation beyond basics. Just make it work.
```

---

## Phase 4: Unity Test Harness

**Goal:** Create a minimal Unity project that tests all API endpoints and displays results.

**Prerequisites:** Phase 3 completed

**Estimated AI Complexity:** Simple

**PURPOSE:** A throwaway Unity project solely for validating KeeperBoard works. Not your actual game.

### Steps

1. **Create new Unity project**

   - Unity 2021.3+ (LTS)
   - 2D or 3D template (doesn't matter)
   - Name: `keeperboard-test-harness`

2. **Create test script**

   `Assets/Scripts/KeeperBoardTester.cs`:
   ```csharp
   using UnityEngine;
   using UnityEngine.Networking;
   using UnityEngine.UI;
   using TMPro;
   using System;
   using System.Collections;
   using System.Text;

   public class KeeperBoardTester : MonoBehaviour
   {
       [Header("Configuration")]
       [SerializeField] private string apiUrl = "http://localhost:3000/api/v1";
       [SerializeField] private string testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

       [Header("UI References")]
       [SerializeField] private TextMeshProUGUI resultsText;
       [SerializeField] private Button runTestsButton;

       private StringBuilder results = new StringBuilder();

       private void Start()
       {
           runTestsButton.onClick.AddListener(() => StartCoroutine(RunAllTests()));
           Log("Ready. Click 'Run Tests' to start.");
           Log($"API URL: {apiUrl}");
           Log($"Test Player GUID: {testPlayerGuid}");
       }

       private IEnumerator RunAllTests()
       {
           results.Clear();
           Log("=== Starting KeeperBoard API Tests ===\n");

           yield return TestHealth();
           yield return TestSubmitScore(100);
           yield return TestGetLeaderboard();
           yield return TestGetPlayer();
           yield return TestSubmitScore(50);  // Lower score - should NOT update
           yield return TestSubmitScore(200); // Higher score - should update
           yield return TestUpdatePlayerName();
           yield return TestGetLeaderboard(); // Final check

           Log("\n=== Tests Complete ===");
       }

       // ... test methods
   }
   ```

3. **Create simple UI**

   - Canvas with:
     - Title text: "KeeperBoard Test Harness"
     - API URL input field
     - "Run Tests" button
     - Scrollable results text area (monospace font)

4. **Implement test methods**

   Each test:
   - Makes the API call
   - Logs the request
   - Logs the response (success/fail + data)
   - Shows clear PASS/FAIL

5. **Configure for WebGL**

   - Player Settings → WebGL
   - Disable compression (for easier debugging)
   - Set memory size appropriately

### Files Created (in Unity project)
- `Assets/Scripts/KeeperBoardTester.cs`
- `Assets/Scripts/SimpleWebRequest.cs` (helper for async)
- `Assets/Scenes/TestScene.unity`
- UI prefabs

### Manual Testing Checklist

**Local Testing:**
- [ ] Run KeeperBoard locally (`npm run dev`)
- [ ] Play Unity scene in Editor
- [ ] Click "Run Tests"
- [ ] All tests show PASS
- [ ] Score appears in Supabase

**Build Test:**
- [ ] Build to WebGL
- [ ] Host locally (e.g., `npx serve build`)
- [ ] Open in browser
- [ ] Tests still pass

### AI Prompt

```markdown
# Task: KeeperBoard Phase 4 - Unity Test Harness

Create a minimal Unity project for testing KeeperBoard API endpoints.

1. Project Setup:
   - Unity 2021.3+ compatible
   - Single scene with UI

2. KeeperBoardTester.cs:
   - Configurable API URL field (default: http://localhost:3000/api/v1)
   - Auto-generated test player GUID
   - "Run Tests" button
   - Scrollable results display

3. Tests to run (in order):
   a. GET /health → Expect success
   b. POST /scores (score: 100) → Expect success, rank returned
   c. GET /leaderboard → Expect to see our score
   d. GET /player/{guid} → Expect our score and rank
   e. POST /scores (score: 50) → Should NOT update (lower)
   f. POST /scores (score: 200) → Should update (higher)
   g. PUT /player/{guid} (new name) → Should update name
   h. GET /leaderboard → Final verification

4. UI Layout:
   - Title: "KeeperBoard Test Harness"
   - Input field: API URL
   - Button: "Run Tests"
   - Scroll view: Results log (monospace, selectable)

5. Results format:
   ```
   [TEST] Health Check
   [REQUEST] GET /health
   [RESPONSE] 200 OK
   {"success":true,"data":{"service":"keeperboard"...}}
   [RESULT] ✓ PASS

   [TEST] Submit Score (100)
   ...
   ```

6. WebGL Compatible:
   - Use UnityWebRequest (not HttpClient)
   - No threading
   - Handle CORS (server should allow *)

Make it ugly but functional. This is a test tool, not a product.
```

---

## Phase 5: Deploy & Validate on Unity Play

**Goal:** Deploy skeleton API to Vercel, upload Unity test build to Unity Play, verify no CSP issues.

**Prerequisites:** Phase 4 completed

**Estimated AI Complexity:** Simple (mostly manual steps)

**PURPOSE:** This is THE critical test. If this passes, we know KeeperBoard will work.

### Steps

1. **Deploy KeeperBoard to Vercel**

   ```bash
   # In keeperboard directory
   npm install -g vercel
   vercel login
   vercel
   ```

   - Follow prompts
   - Note the deployment URL (e.g., `https://keeperboard-xxx.vercel.app`)

2. **Add environment variables in Vercel**

   - Go to Vercel dashboard → Project → Settings → Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Verify deployment**

   ```bash
   curl https://keeperboard.vercel.app/api/v1/health
   ```

4. **Update Unity test harness**

   - Change API URL to Vercel URL
   - Test in Editor first

5. **Build Unity for WebGL**

   - File → Build Settings → WebGL
   - Build

6. **Upload to Unity Play**

   - Go to play.unity.com
   - Upload WebGL build
   - Note the game URL

7. **THE TEST**

   - Open your game on Unity Play
   - Open browser dev tools (Console tab)
   - Click "Run Tests"
   - **Watch for CSP errors**

### Expected Outcomes

**SUCCESS (proceed to Phase 6+):**
```
[TEST] Health Check
[RESULT] ✓ PASS
[TEST] Submit Score
[RESULT] ✓ PASS
...
```

**FAILURE (CSP blocks Vercel):**
```
Access to fetch at 'https://keeperboard-xxx.vercel.app/api/v1/health'
from origin 'https://play.unity.com' has been blocked by CORS policy...
```

or

```
Refused to connect to 'https://keeperboard-xxx.vercel.app/api/v1/health'
because it violates the Content Security Policy directive...
```

### Manual Testing Checklist

- [ ] Vercel deployment successful
- [ ] Health check works from local machine
- [ ] Health check works from Unity Editor
- [ ] WebGL build completes
- [ ] Unity Play upload successful
- [ ] **Tests pass on Unity Play (no CSP errors)**

### If Validation Fails

If CSP blocks Vercel:

1. **Check error type** - Is it CORS or CSP?
   - CORS: We can fix with headers
   - CSP: Unity Play's restriction, harder to fix

2. **Try custom domain** - Sometimes CSP allows specific domains

3. **Contact Unity** - The forum post might get a response

4. **Alternative hosting** - Try Cloudflare Workers, AWS Lambda, etc.

### AI Prompt

```markdown
# Task: KeeperBoard Phase 5 - Deploy & Validate

This is mostly manual steps, but document the process:

1. Vercel Deployment:
   - Commands to deploy
   - Environment variables needed
   - How to verify deployment

2. Unity Build:
   - WebGL build settings
   - Compression settings
   - Memory size

3. Unity Play Upload:
   - How to upload
   - What URL format to expect

4. Validation Steps:
   - What to look for in browser console
   - How to identify CSP vs CORS errors
   - Success criteria

5. Troubleshooting:
   - Common issues and fixes
   - Alternative approaches if CSP blocks

Create a checklist document for these manual steps.
```

---

## Phase 6: Authentication System

**Goal:** Implement login/register with email and OAuth providers.

**Prerequisites:** Phase 5 PASSED (validation successful)

**Estimated AI Complexity:** Medium

### Steps

1. **Re-enable RLS**
   ```sql
   ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
   ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
   ```

2. **Create auth middleware**

   `src/middleware.ts`:
   - Protect dashboard routes
   - Redirect unauthenticated to login
   - Redirect authenticated from login to dashboard

3. **Create auth hooks**

   `src/lib/hooks/useAuth.ts`

4. **Create login page**

   `src/app/(auth)/login/page.tsx`:
   - Email/password form
   - Google OAuth button
   - GitHub OAuth button

5. **Create register page**

   `src/app/(auth)/register/page.tsx`

6. **Create auth callback route**

   `src/app/auth/callback/route.ts`

7. **Configure OAuth in Supabase** (manual)

### Files Created
- `src/middleware.ts`
- `src/lib/hooks/useAuth.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/auth/callback/route.ts`

### Manual Testing Checklist
- [ ] Visit /dashboard when logged out → redirects to /login
- [ ] Register with new email → success message
- [ ] Login with verified account → redirects to dashboard
- [ ] OAuth login works (if configured)
- [ ] Logout → redirects to login

### AI Prompt

```markdown
# Task: KeeperBoard Phase 6 - Authentication System

Implement Supabase Auth for the dashboard with:

1. Middleware (src/middleware.ts):
   - Protect all /dashboard/* routes
   - Redirect unauthenticated users to /login
   - Allow /api/v1/* without auth (public API)

2. Auth hook (src/lib/hooks/useAuth.ts):
   - useAuth() hook returning { user, profile, loading, signOut }

3. Login page (src/app/(auth)/login/page.tsx):
   - Email/password form
   - Google OAuth button
   - GitHub OAuth button
   - Clean Tailwind styling

4. Register page (src/app/(auth)/register/page.tsx):
   - Same as login but for registration

5. OAuth callback route (src/app/auth/callback/route.ts)

Use @supabase/ssr patterns for auth.
```

---

## Phase 7: Dashboard Layout & Home

**Goal:** Create the dashboard shell with navigation and home page.

**Prerequisites:** Phase 6 completed

**Estimated AI Complexity:** Medium

### Steps

1. Create dashboard layout with sidebar
2. Create navigation component
3. Create header component
4. Create dashboard home page
5. Create reusable UI components

### Files Created
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/dashboard/Header.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Card.tsx`

### Manual Testing Checklist
- [ ] Dashboard has sidebar and header
- [ ] Navigation works
- [ ] Logout button works
- [ ] Responsive on mobile

### AI Prompt

```markdown
# Task: KeeperBoard Phase 7 - Dashboard Layout & Home

Create the dashboard shell with:

1. Dashboard layout (src/app/(dashboard)/layout.tsx):
   - Left sidebar (collapsible on mobile)
   - Top header
   - Main content area

2. Sidebar component:
   - KeeperBoard logo
   - Nav links: Dashboard, Games
   - User section with logout

3. Header component:
   - Page title
   - User avatar

4. Dashboard home:
   - Welcome message
   - Stats cards
   - Create Game CTA

5. UI components: Button, Input, Card, Badge

Style with Tailwind. Clean and professional.
```

---

## Phase 8: Games Management

**Goal:** CRUD operations for games and API key management.

**Prerequisites:** Phase 7 completed

**Estimated AI Complexity:** Medium

### Steps

1. Create games list page
2. Create game form component
3. Create game detail page
4. Create API keys component
5. Create API routes for games

### Files Created
- `src/app/(dashboard)/games/page.tsx`
- `src/app/(dashboard)/games/[gameId]/page.tsx`
- `src/components/forms/GameForm.tsx`
- `src/components/dashboard/ApiKeysCard.tsx`
- `src/app/api/games/route.ts`
- `src/app/api/games/[gameId]/route.ts`
- `src/app/api/games/[gameId]/api-keys/route.ts`

### Manual Testing Checklist
- [ ] Create game → appears in list
- [ ] Generate API keys → keys display
- [ ] Copy key works
- [ ] Delete game works

### AI Prompt

```markdown
# Task: KeeperBoard Phase 8 - Games Management

Implement games CRUD with API key management:

1. Games list page with create button
2. Game form (name, description, slug)
3. Game detail page with API keys section
4. API Keys card:
   - Generate dev/prod keys
   - Copy to clipboard
   - Keys shown only once (stored hashed)

5. API routes for games and keys

Key format: kb_{env}_{random48chars}
Hash with SHA-256 before storing.
```

---

## Phase 9: Leaderboards Management

**Goal:** CRUD for leaderboards within a game.

**Prerequisites:** Phase 8 completed

**Estimated AI Complexity:** Simple

### Steps

1. Create leaderboard list component
2. Create leaderboard form
3. Create leaderboard detail page
4. Create API routes

### Files Created
- `src/components/dashboard/LeaderboardsList.tsx`
- `src/components/forms/LeaderboardForm.tsx`
- `src/app/(dashboard)/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`
- `src/app/api/games/[gameId]/leaderboards/route.ts`

### Manual Testing Checklist
- [ ] Create leaderboard works
- [ ] Edit leaderboard works
- [ ] Delete leaderboard works

### AI Prompt

```markdown
# Task: KeeperBoard Phase 9 - Leaderboards Management

Implement leaderboards CRUD:

1. Leaderboards list within game page
2. Leaderboard form (name, slug, sort order)
3. Leaderboard detail page
4. API routes for CRUD

Sort order options: "Highest First" (desc), "Lowest First" (asc)
```

---

## Phase 10: Full Public API

**Goal:** Add API key authentication and complete the public API.

**Prerequisites:** Phase 9 completed

**Estimated AI Complexity:** Medium

### Steps

1. Create API key validation middleware
2. Update all /api/v1/* routes to require API key
3. Add claim endpoint
4. Add proper error handling

### Files Created/Modified
- `src/lib/api/auth.ts` (API key validation)
- Update all `/api/v1/*` routes

### Manual Testing Checklist
- [ ] API calls without key → 401
- [ ] API calls with valid key → success
- [ ] API calls with invalid key → 401
- [ ] Claim endpoint works

### AI Prompt

```markdown
# Task: KeeperBoard Phase 10 - Full Public API

Add API key authentication to public endpoints:

1. API key validation (src/lib/api/auth.ts):
   - Extract from X-API-Key header
   - Hash and lookup in api_keys table
   - Return game/leaderboard info or error
   - Update last_used_at

2. Update all /api/v1/* routes:
   - Require API key (except /health)
   - Use leaderboard from API key lookup
   - Remove hardcoded IDs

3. Add POST /api/v1/claim:
   - Claim migrated score by name match

Maintain backward compatibility with existing responses.
```

---

## Phase 11: Unity Package - Core

**Goal:** Create the proper Unity package for distribution.

**Prerequisites:** Phase 5 completed (can run parallel with 6-10)

**Estimated AI Complexity:** Medium

### Steps

1. Create Unity package structure in separate repo
2. Create KeeperBoardConfig ScriptableObject
3. Create KeeperBoardClient
4. Create data types
5. Create PlayerIdentity helper

### Files Created
- All files in `keeperboard-unity/` repository

### Manual Testing Checklist
- [ ] Package imports without errors
- [ ] Config asset can be created
- [ ] API calls work

### AI Prompt

```markdown
# Task: KeeperBoard Phase 11 - Unity Package Core

Create a Unity package for KeeperBoard integration:

1. package.json for UPM
2. KeeperBoardConfig ScriptableObject
3. KeeperBoardClient with all API methods
4. KeeperBoardTypes for data models
5. PlayerIdentity for GUID management
6. WebRequestAwaiter for async support

Make it WebGL compatible. Use UnityWebRequest.
```

---

## Phase 12: Unity Package - UPM Setup

**Goal:** Configure package for distribution and create samples.

**Prerequisites:** Phase 11 completed

**Estimated AI Complexity:** Simple

### Steps

1. Finalize package.json
2. Create samples
3. Create documentation
4. Push to GitHub

### Files Created
- `Samples~/BasicUsage/*`
- `Documentation~/*`
- Updated README

### Manual Testing Checklist
- [ ] Package installs via git URL
- [ ] Samples work
- [ ] Documentation is accessible

---

## Phase 13: Scores Management UI

**Goal:** View, search, and manage scores in dashboard.

**Prerequisites:** Phase 9 completed

**Estimated AI Complexity:** Medium

### Steps

1. Create scores table component
2. Create score edit modal
3. Add to leaderboard detail page
4. Create API routes

### Files Created
- `src/components/dashboard/ScoresTable.tsx`
- `src/components/dashboard/EditScoreModal.tsx`
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts`

### Manual Testing Checklist
- [ ] Scores table displays
- [ ] Pagination works
- [ ] Search works
- [ ] Edit/delete works

---

## Phase 14: Import - Manual (CSV/JSON)

**Goal:** Allow importing scores via CSV or JSON.

**Prerequisites:** Phase 13 completed

**Estimated AI Complexity:** Medium

### Steps

1. Create import page
2. Create manual import component
3. Create import API route

### Files Created
- `src/app/(dashboard)/games/[gameId]/import/page.tsx`
- `src/components/dashboard/ManualImport.tsx`
- `src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts`

### Manual Testing Checklist
- [ ] CSV import works
- [ ] JSON import works
- [ ] Preview shows correctly
- [ ] Duplicate handling works

---

## Phase 15: Import - UGS Direct

**Goal:** Import scores directly from Unity Gaming Services.

**Prerequisites:** Phase 14 completed

**Estimated AI Complexity:** Complex

### Steps

1. Research UGS API
2. Create UGS import component
3. Create UGS API utility
4. Update import page

### Files Created
- `src/components/dashboard/UGSImport.tsx`
- `src/lib/ugs/client.ts`

### Manual Testing Checklist
- [ ] UGS credentials work
- [ ] Fetch leaderboards works
- [ ] Import works

---

## Phase 16: Integration Testing

**Goal:** Test full flow with Graveyard Groundskeeper.

**Prerequisites:** Phases 1-14 completed

**Estimated AI Complexity:** Medium

### Steps

1. Install KeeperBoard package in game
2. Create configuration
3. Update LeaderboardManager
4. Import existing scores
5. Test full flow

### Manual Testing Checklist
- [ ] Package imports
- [ ] Scores submit
- [ ] Leaderboard displays
- [ ] Migration works
- [ ] Works on Unity Play

---

## Phase 17: Polish & Deploy

**Goal:** Final polish and production deployment.

**Prerequisites:** Phase 16 completed

**Estimated AI Complexity:** Medium

### Steps

1. Polish UI
2. Add rate limiting
3. Security review
4. Production deployment
5. Update Unity package

### Manual Testing Checklist
- [ ] All features work in production
- [ ] Rate limiting works
- [ ] OAuth works in production

---

## Quick Reference

### Phase Summary

| Phase | Name | Complexity | Dependencies | Notes |
|-------|------|------------|--------------|-------|
| 1 | Project Setup | Simple | None | |
| 2 | Database Schema | Simple | 1 | |
| 3 | **API Skeleton** | Simple | 2 | **VALIDATION** |
| 4 | **Unity Test Harness** | Simple | 3 | **VALIDATION** |
| 5 | **Deploy & Validate** | Simple | 4 | **CSP TEST** |
| 6 | Authentication | Medium | 5 ✓ | After validation |
| 7 | Dashboard Layout | Medium | 6 | |
| 8 | Games Management | Medium | 7 | |
| 9 | Leaderboards Management | Simple | 8 | |
| 10 | Full Public API | Medium | 9 | |
| 11 | Unity Package Core | Medium | 5 ✓ | Parallel with 6-10 |
| 12 | Unity UPM Setup | Simple | 11 | |
| 13 | Scores Management UI | Medium | 9 | |
| 14 | Import - Manual | Medium | 13 | |
| 15 | Import - UGS | Complex | 14 | |
| 16 | Integration Testing | Medium | 10, 12 | |
| 17 | Polish & Deploy | Medium | 16 | |

### Validation Gate

**After Phase 5:**
- If PASS → Continue to Phase 6+
- If FAIL → Stop and troubleshoot

### Parallel Groups

**After Phase 5 validation passes:**
- Phase 6 (Auth) + Phase 11 (Unity Package)

**After Phase 7:**
- Phase 8 + Phase 9 + Phase 10

### Estimated Time

- **Validation only** (Phases 1-5): ~2-3 sessions
- **Minimum viable** (Phases 1-12): ~8-10 sessions
- **Full feature set** (All phases): ~15-17 sessions

---

*Main plan: `keeperboard.md`*
