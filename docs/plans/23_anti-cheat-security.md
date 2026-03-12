# Plan 23: Anti-Cheat Security System

## Overview

Implement a layered anti-cheat system for keeperboard to prevent casual leaderboard hacking. After a user hacked the flight747 leaderboard by intercepting network calls and submitting fake scores, we need server-side protections that work for any game using the platform.

**Goal:** Stop casual DevTools cheaters. Accept that determined reverse-engineers might get through.

**Repositories:**
- Keeperboard (server + SDK): `/Users/claude/git/keeperboard`
- Flight747 (game): `/Users/claude/Git/flight747`

## Security Layers

1. **Server-Issued Run Tokens** - Server controls session lifecycle
2. **Multi-Step HMAC Signing** - SDK signs requests with obfuscated algorithm (raises reverse-engineering cost)
3. **Server Validation** - Score caps, elapsed time validation, one-time tokens
4. **Obfuscation** - SDK build with string encoding, control flow flattening

## Current State

- Scores submitted via `POST /api/v1/scores` with plaintext score
- API key exposed in browser, easily extractable
- No session binding or replay protection
- No score plausibility validation

---

## Phase 1: Database Schema & Game Settings

**Goal:** Add database tables for run tokens and signing secrets, plus game settings for anti-cheat.

### 1.1 Create Migration for Anti-Cheat Tables

**File:** `/Users/claude/git/keeperboard/supabase/migrations/20260311000000_anti_cheat.sql`

```sql
-- Signing secrets for HMAC validation (per-game)
ALTER TABLE games ADD COLUMN signing_secret TEXT;
ALTER TABLE games ADD COLUMN signing_enabled BOOLEAN DEFAULT false;

-- Anti-cheat settings (per-leaderboard)
ALTER TABLE leaderboards ADD COLUMN score_cap INTEGER;
ALTER TABLE leaderboards ADD COLUMN min_elapsed_seconds INTEGER DEFAULT 5;
ALTER TABLE leaderboards ADD COLUMN require_run_token BOOLEAN DEFAULT false;

-- Game runs table for session tokens
CREATE TABLE game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  player_guid TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score INTEGER,
  elapsed_seconds INTEGER,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for lookups
  CONSTRAINT game_runs_leaderboard_player_idx UNIQUE (id)
);

CREATE INDEX game_runs_lookup_idx ON game_runs(id, used);
CREATE INDEX game_runs_player_idx ON game_runs(player_guid, leaderboard_id);

-- Link scores to runs for elapsed time tracking
ALTER TABLE scores ADD COLUMN run_id UUID REFERENCES game_runs(id);

-- RLS policies
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;

-- Runs are managed by API keys (admin client), not user auth
CREATE POLICY "Admin can manage runs" ON game_runs
  FOR ALL USING (true);
```

### 1.2 Update TypeScript Database Types

**File:** `/Users/claude/git/keeperboard/keeperboard/src/types/database.ts`

Add to the Games type:
```typescript
signing_secret: string | null;
signing_enabled: boolean;
```

Add to the Leaderboards type:
```typescript
score_cap: number | null;
min_elapsed_seconds: number;
require_run_token: boolean;
```

Add to Scores type:
```typescript
run_id: string | null;
```

Add new GameRuns type:
```typescript
export interface GameRun {
  id: string;
  leaderboard_id: string;
  player_guid: string;
  started_at: string;
  finished_at: string | null;
  score: number | null;
  elapsed_seconds: number | null;
  used: boolean;
  created_at: string;
}
```

### 1.3 Update Game Settings Helpers

**File:** `/Users/claude/git/keeperboard/keeperboard/src/lib/api/game.ts`

Add function to get full anti-cheat settings:
```typescript
export interface AntiCheatSettings {
  signingEnabled: boolean;
  signingSecret: string | null;
  scoreCap: number | null;
  minElapsedSeconds: number;
  requireRunToken: boolean;
}

export async function getAntiCheatSettings(
  gameId: string,
  leaderboardId: string
): Promise<AntiCheatSettings>
```

### Success Criteria
- [ ] Migration runs successfully
- [ ] TypeScript types updated
- [ ] Can query anti-cheat settings for a game/leaderboard

### Manual Testing
1. Run migration: `npx supabase db push`
2. Verify new columns in Supabase dashboard
3. Verify TypeScript compiles without errors

---

## Phase 2: Run Token Endpoints

**Goal:** Create `/api/v1/runs/start` and `/api/v1/runs/finish` endpoints.

### 2.1 Create Runs Start Endpoint

**File:** `/Users/claude/git/keeperboard/keeperboard/src/app/api/v1/runs/start/route.ts`

```typescript
// POST /api/v1/runs/start
// Request: { player_guid: string }
// Response: { run_id: string, started_at: string, expires_at: string }

// Flow:
// 1. Validate API key
// 2. Resolve leaderboard
// 3. Create game_run record
// 4. Return run_id (UUID) and timestamps
```

The run token is just the UUID - server tracks state in database.

### 2.2 Create Runs Finish Endpoint

**File:** `/Users/claude/git/keeperboard/keeperboard/src/app/api/v1/runs/finish/route.ts`

```typescript
// POST /api/v1/runs/finish
// Request: { run_id: string, player_guid: string, player_name: string, score: number }
// Response: { success: boolean, rank?: number, is_new_high_score?: boolean }

// Flow:
// 1. Validate API key
// 2. Look up run by id
// 3. Validate: run exists, not used, not expired, same player_guid
// 4. Validate: elapsed time >= min_elapsed_seconds
// 5. Validate: score <= score_cap (if set)
// 6. Mark run as used, store elapsed_seconds
// 7. Submit score with run_id reference
// 8. Return result
```

### 2.3 Run Expiration

Runs expire after 1 hour (configurable). Add cleanup job or lazy expiration check.

### Success Criteria
- [ ] `/api/v1/runs/start` creates run and returns run_id
- [ ] `/api/v1/runs/finish` validates run and submits score
- [ ] Elapsed time validation works
- [ ] One-time use enforcement works
- [ ] Score cap enforcement works

### Manual Testing
1. Start a run: `POST /api/v1/runs/start`
2. Immediately finish: should fail min_elapsed_seconds check
3. Wait, then finish: should succeed
4. Try to reuse run_id: should fail
5. Try with score > cap: should fail

---

## Phase 3: HMAC Signature Validation (Server-Side)

**Goal:** Add signature validation to run endpoints when signing is enabled.

### 3.1 Create Signature Utilities

**File:** `/Users/claude/git/keeperboard/keeperboard/src/lib/api/signature.ts`

```typescript
import crypto from 'crypto';

export function generateSigningSecret(): string {
  // Generate 32-byte random secret, base64 encoded
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Multi-step signature validation matching SDK's algorithm:
 * 1. Derive key from secret + player GUID prefix
 * 2. Create payload with transformed values
 * 3. HMAC the payload
 * 4. XOR with timestamp bytes
 * 5. Custom base64 encode
 */
export function validateSignature(
  params: {
    playerGuid: string;
    timestamp: number;
    score?: number;
    runId?: string;
  },
  signature: string,
  secret: string
): boolean {
  // Step 1: Derive key
  const derivedKey = crypto
    .createHmac('sha256', secret)
    .update(params.playerGuid.slice(0, 8))
    .digest();

  // Step 2: Build payload with transformations
  const parts = [params.playerGuid];
  if (params.runId) {
    parts.push(params.runId.split('').reverse().join(''));
  }
  if (params.score !== undefined) {
    parts.push(String(params.score ^ 0xBEEF));
  }
  parts.push(String(params.timestamp ^ 0xDEAD));
  const payload = parts.join('::');

  // Step 3: HMAC
  const hmac = crypto
    .createHmac('sha256', derivedKey)
    .update(payload)
    .digest('hex');

  // Step 4: XOR with timestamp string (simple transform)
  const tsStr = String(params.timestamp);
  const xored = hmac.split('').map((c, i) => {
    const tsChar = tsStr[i % tsStr.length];
    return String.fromCharCode(c.charCodeAt(0) ^ tsChar.charCodeAt(0));
  }).join('');

  // Step 5: Base64 with custom alphabet
  const expected = Buffer.from(xored, 'binary').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 3.2 Update Start Endpoint for Signatures

When `signing_enabled` is true, require `X-Signature` header and validate.

### 3.3 Update Finish Endpoint for Signatures

Same validation for finish endpoint with score included in signature.

### 3.4 Timestamp Validation

- Require `timestamp` parameter in requests
- Reject if timestamp is > 60 seconds old (clock skew tolerance)
- Reject if timestamp+player_guid was used before (replay protection)

### Success Criteria
- [ ] Multi-step signature validation works
- [ ] Start endpoint validates signature when enabled
- [ ] Finish endpoint validates signature when enabled
- [ ] Replay protection via timestamp tracking works
- [ ] Games with signing disabled still work (backward compatible)

### Manual Testing
1. Enable signing for test game
2. Try request without signature: should fail
3. Try request with invalid signature: should fail
4. Try request with valid signature: should succeed
5. Replay same request: should fail (timestamp reuse)

---

## Phase 4: Dashboard - Anti-Cheat Settings & UI

**Goal:** Add UI to configure anti-cheat settings and show elapsed time for scores.

### 4.1 Update Game Settings Form

**File:** `/Users/claude/git/keeperboard/keeperboard/src/components/forms/GameForm.tsx`

Add section for anti-cheat settings:
- Toggle: Enable HMAC Signing
- Display: Signing Secret (with copy button, generate button)
- Warning: "Keep this secret safe - embed in your game build"

### 4.2 Update Leaderboard Settings

**File:** `/Users/claude/git/keeperboard/keeperboard/src/app/(dashboard)/dashboard/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`

Add anti-cheat settings:
- Score Cap: number input (optional)
- Min Elapsed Seconds: number input (default 5)
- Require Run Token: toggle

### 4.3 Generate Secret API

**File:** `/Users/claude/git/keeperboard/keeperboard/src/app/api/games/[gameId]/signing-secret/route.ts`

- POST: Generate new signing secret
- Only game owner can access

### 4.4 Add Elapsed Time Column to Scores List

**File:** `/Users/claude/git/keeperboard/keeperboard/src/app/(dashboard)/dashboard/games/[gameId]/leaderboards/[leaderboardId]/scores/page.tsx`

When `require_run_token` is enabled for the leaderboard:
- Add "Elapsed Time" column showing `game_runs.elapsed_seconds`
- Join scores with game_runs via `scores.run_id`
- Format as "Xm Ys" (e.g., "2m 34s")
- Show "-" for scores without run_id (legacy scores)

### Success Criteria
- [ ] Can enable/disable signing in dashboard
- [ ] Can view and regenerate signing secret
- [ ] Can set score cap per leaderboard
- [ ] Can set min elapsed time per leaderboard
- [ ] Can toggle run token requirement
- [ ] Elapsed time column appears when run tokens enabled
- [ ] Elapsed time shows correctly for run-based scores

### Manual Testing
1. Open game settings in dashboard
2. Enable signing, see secret generated
3. Copy secret
4. Set score cap on a leaderboard
5. Enable run tokens
6. Submit a score via run flow
7. Verify elapsed time shows in scores list

---

## Phase 5: SDK - Run Token Support

**Goal:** Update keeperboard SDK to support run-based submission flow.

### 5.1 Add Run Methods to Client

**File:** `/Users/claude/git/keeperboard/sdk/src/KeeperBoardClient.ts`

```typescript
async startRun(options: { playerGuid: string }): Promise<StartRunResult> {
  // POST /api/v1/runs/start
}

async finishRun(options: {
  runId: string;
  playerGuid: string;
  playerName: string;
  score: number;
}): Promise<FinishRunResult> {
  // POST /api/v1/runs/finish
}
```

### 5.2 Add Run Methods to Session

**File:** `/Users/claude/git/keeperboard/sdk/src/KeeperBoardSession.ts`

```typescript
async startRun(): Promise<string> {
  // Returns runId, stores internally
  this.currentRunId = result.runId;
}

async finishRun(score: number): Promise<SessionScoreResult> {
  // Uses stored runId, clears after
}

// Keep submitScore() for backward compatibility
// but deprecate when run tokens required
```

### 5.3 Update Types

**File:** `/Users/claude/git/keeperboard/sdk/src/types.ts`

Add run-related types:
```typescript
export interface StartRunResult {
  runId: string;
  startedAt: string;
  expiresAt: string;
}

export interface FinishRunResult {
  success: boolean;
  rank?: number;
  isNewHighScore?: boolean;
  error?: string;
}
```

### Success Criteria
- [ ] SDK can start a run
- [ ] SDK can finish a run with score
- [ ] Backward compatible - old submitScore still works
- [ ] Types exported correctly

### Manual Testing
1. Use SDK to start run
2. Wait 5+ seconds
3. Finish run with score
4. Verify score appears on leaderboard

---

## Phase 6: SDK - Multi-Step HMAC Signing

**Goal:** Add obfuscated multi-step HMAC signature generation to SDK.

### 6.1 Add Signing Configuration

**File:** `/Users/claude/git/keeperboard/sdk/src/types.ts`

```typescript
export interface SessionConfig {
  // ... existing fields
  signingSecret?: string;  // NEW: If set, signs all requests
}
```

### 6.2 Implement Multi-Step Signing

**File:** `/Users/claude/git/keeperboard/sdk/src/signing.ts`

```typescript
/**
 * Multi-step signature generation designed to be hard to replicate:
 * 1. Derive key from secret + player GUID prefix
 * 2. Create payload with transformed values (reversed, XORed)
 * 3. HMAC the payload
 * 4. XOR result with timestamp bytes
 * 5. Custom base64 encode
 */
export async function signRequest(
  params: {
    playerGuid: string;
    timestamp: number;
    score?: number;
    runId?: string;
  },
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Step 1: Derive key from secret + player prefix
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const derivedKeyData = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(params.playerGuid.slice(0, 8))
  );
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    derivedKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Step 2: Build payload with weird transformations
  const parts = [params.playerGuid];
  if (params.runId) {
    // Reverse the runId
    parts.push(params.runId.split('').reverse().join(''));
  }
  if (params.score !== undefined) {
    // XOR score with magic number
    parts.push(String(params.score ^ 0xBEEF));
  }
  // XOR timestamp with different magic number
  parts.push(String(params.timestamp ^ 0xDEAD));
  const payload = parts.join('::');

  // Step 3: HMAC the payload
  const hmacResult = await crypto.subtle.sign(
    'HMAC',
    derivedKey,
    encoder.encode(payload)
  );
  const hmacHex = Array.from(new Uint8Array(hmacResult))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Step 4: XOR with timestamp string
  const tsStr = String(params.timestamp);
  const xored = hmacHex.split('').map((c, i) => {
    const tsChar = tsStr[i % tsStr.length];
    return String.fromCharCode(c.charCodeAt(0) ^ tsChar.charCodeAt(0));
  }).join('');

  // Step 5: Custom base64 (URL-safe, no padding)
  const signature = btoa(xored)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return signature;
}
```

### 6.3 Integrate with Client

When `signingSecret` is configured:
- Add `timestamp` to request body (Date.now())
- Compute signature using multi-step algorithm
- Add `X-Signature` header

### Success Criteria
- [ ] SDK generates multi-step signatures
- [ ] Signatures validate on server
- [ ] Algorithm is convoluted enough to deter casual inspection
- [ ] Requests without signing still work when not required
- [ ] Works in browser (Web Crypto API)

### Manual Testing
1. Configure SDK with signing secret
2. Start and finish run
3. Check server logs - signature should validate
4. Inspect network request - signature should be opaque string
5. Try tampering with request - should be rejected

---

## Phase 7: SDK Build - Obfuscation

**Goal:** Add obfuscation to SDK build process.

### 7.1 Add Obfuscation to Rollup Config

**File:** `/Users/claude/git/keeperboard/sdk/rollup.config.js`

Add `rollup-plugin-obfuscator` or `javascript-obfuscator`:

```javascript
import obfuscator from 'rollup-plugin-obfuscator';

export default {
  // ... existing config
  plugins: [
    // ... existing plugins
    obfuscator({
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
    }),
  ],
};
```

### 7.2 Separate Dev and Prod Builds

- Dev build: No obfuscation (readable for debugging)
- Prod build: Full obfuscation

### 7.3 Verify No Source Maps

Ensure `sourcemap: false` in production builds.

### Success Criteria
- [ ] Production SDK build is obfuscated
- [ ] Signing secret not visible as plain string
- [ ] Control flow is flattened
- [ ] Magic numbers (0xBEEF, 0xDEAD) not easily visible
- [ ] Dev build still readable
- [ ] No source maps in dist

### Manual Testing
1. Build SDK: `npm run build`
2. Open dist/index.js
3. Verify code is obfuscated
4. Verify no source map files
5. Search for magic numbers - should not be plain text

---

## Phase 8: Flight747 Integration

**Goal:** Update flight747 to use new secure submission flow.

### 8.1 Update keeperboard Dependency

```bash
cd /Users/claude/Git/flight747
npm update keeperboard
```

### 8.2 Update LeaderboardManager

**File:** `/Users/claude/Git/flight747/src/managers/LeaderboardManager.ts`

```typescript
// Add signing secret from env
const SIGNING_SECRET = import.meta.env.VITE_KEEPERBOARD_SIGNING_SECRET;

// In constructor, pass signing secret:
this.session = new KeeperBoardSession({
  apiKey,
  leaderboard: LEADERBOARD_NAME,
  signingSecret: SIGNING_SECRET,  // NEW
  // ... rest
});

// Add run management:
private currentRunId: string | null = null;

async startGameRun(): Promise<void> {
  this.currentRunId = await this.session.startRun();
}

async submitRunScore(score: number): Promise<SubmitScoreResult> {
  if (!this.currentRunId) {
    // Fallback to old method if no run started
    return this.submitScore(score);
  }
  const result = await this.session.finishRun(score);
  this.currentRunId = null;
  return result;
}
```

### 8.3 Update GameScene

**File:** `/Users/claude/Git/flight747/src/scenes/GameScene.ts`

Start a run when game begins:
```typescript
create() {
  // ... existing code
  leaderboardManager.startGameRun();
}
```

### 8.4 Update GameOverScene

**File:** `/Users/claude/Git/flight747/src/scenes/GameOverScene.ts`

Use `submitRunScore` instead of `submitScore`:
```typescript
const result = await leaderboardManager.submitRunScore(this.finalScore);
```

### 8.5 Add Obfuscation to Vite Build

**File:** `/Users/claude/Git/flight747/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  // ... existing config
  plugins: [
    // ... existing plugins
    obfuscatorPlugin({
      include: ['src/**/*.ts'],
      exclude: [/node_modules/],
      options: {
        compact: true,
        controlFlowFlattening: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
      },
    }),
  ],
});
```

### 8.6 Environment Variables

Add to `.env`:
```
VITE_KEEPERBOARD_SIGNING_SECRET=your-secret-from-dashboard
```

Add to `.env.example`:
```
VITE_KEEPERBOARD_SIGNING_SECRET=
```

### Success Criteria
- [x] Flight747 uses new run-based flow
- [x] Signing secret configured
- [x] Build is obfuscated
- [x] Old scores still work (backward compatible)

### Manual Testing
1. Start a game in flight747
2. Play for > 5 seconds
3. Die and submit score
4. Verify score appears on leaderboard
5. Check network tab - requests should have signatures

---

## Phase 9: Security Testing & Cleanup

**Goal:** Verify security measures work and clean up.

### 9.1 Create Attack Test Script

**File:** `/Users/claude/git/keeperboard/scripts/test-anti-cheat.ts`

Test various attack vectors:
1. Direct score submission without run token → Should fail
2. Replay same run_id → Should fail
3. Submit before min elapsed time → Should fail
4. Submit score > cap → Should fail
5. Invalid signature → Should fail
6. Missing signature when required → Should fail
7. Tampered signature (changed score) → Should fail

### 9.2 Delete Fake Scores

Use dashboard to delete the fake 1,000,001 score from flight747 leaderboard.

### 9.3 Enable Anti-Cheat for Flight747

1. Generate signing secret in dashboard
2. Enable run token requirement
3. Set score cap (e.g., 5000)
4. Set min elapsed time (e.g., 10 seconds)

### 9.4 Documentation

Update keeperboard README and SDK docs with:
- How to enable anti-cheat
- How to configure signing
- How run tokens work
- Limitations (determined attackers can still cheat)

### Success Criteria
- [x] All attack vectors tested and blocked (automated tests in `sdk/tests/anti-cheat.test.ts`)
- [x] /api/v1/scores endpoint protected (blocks bypass when signing/run tokens enabled)
- [ ] Fake scores deleted (manual: use dashboard)
- [x] Flight747 using secure flow in production
- [x] Documentation updated

### Manual Testing
1. Run attack test script
2. Try to cheat in flight747 via DevTools
3. Verify all attacks fail
4. Play legitimately - should still work

---

## Summary

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Database Schema & Game Settings | Low |
| 2 | Run Token Endpoints | Medium |
| 3 | HMAC Signature Validation (Server) | Medium |
| 4 | Dashboard - Anti-Cheat Settings & Elapsed Time UI | Medium |
| 5 | SDK - Run Token Support | Medium |
| 6 | SDK - Multi-Step HMAC Signing | Medium |
| 7 | SDK Build - Obfuscation | Low |
| 8 | Flight747 Integration | Medium |
| 9 | Security Testing & Cleanup | Low |

**Estimated Total:** 9 phases, medium complexity overall

**After Implementation:**
- Casual DevTools cheaters will be blocked
- Your coworker won't be able to easily hack the leaderboard
- Multi-step signing algorithm is tedious to reverse-engineer
- Determined reverse-engineers could still cheat (acceptable tradeoff)
- Elapsed time visible in dashboard to spot suspicious scores
