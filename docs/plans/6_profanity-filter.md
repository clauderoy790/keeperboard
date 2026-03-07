# Plan 6: Profanity Filter for Player Names

## Overview

Add server-side profanity filtering for player names in leaderboards. Configurable per-game via dashboard toggle, enabled by default for new and existing games.

## Tech Stack

- **Backend**: Next.js API routes (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Profanity Library**: glin-profanity (MIT, <1ms, leetspeak detection)
- **Frontend**: React (dashboard UI)
- **SDK**: TypeScript
- **Game Client**: Phaser 3 (flight747)

## Key Decisions

- **Game-level setting** (not per-leaderboard) - a game is either family-friendly or not
- **Server-side only** - keeps SDK lightweight, can't be bypassed
- **Default: enabled** - safer default, can be disabled for adult games
- **Skip auto-generated names** - SDK's random names are already safe
- **Leave existing scores** - only filter new submissions

---

## Phase 1: Database Migration

Add `profanity_filter_enabled` column to games table.

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/005_profanity_filter.sql` | Create |
| `keeperboard/src/types/database.ts` | Modify |

### Implementation

**005_profanity_filter.sql:**
```sql
-- Add profanity filter setting to games table
-- Default true: enabled for all existing and new games
ALTER TABLE games
ADD COLUMN profanity_filter_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN games.profanity_filter_enabled IS
  'When true, player names are checked for profanity before submission';
```

**database.ts** - Add to Games type:
```typescript
profanity_filter_enabled: boolean;
```

### Manual Testing
1. Run migration: `supabase db push` or apply via Supabase dashboard
2. Verify column exists: `SELECT profanity_filter_enabled FROM games LIMIT 1;`
3. Verify existing games have `true` value

---

## Phase 2: Profanity Filter Utility

Install glin-profanity and create a wrapper utility for consistent usage.

### Files to Create/Modify

| File | Action |
|------|--------|
| `keeperboard/package.json` | Modify (add dependency) |
| `keeperboard/src/lib/profanity/index.ts` | Create |
| `keeperboard/src/lib/profanity/wordlists.ts` | Create |

### Implementation

**Install dependency:**
```bash
cd keeperboard && npm install glin-profanity
```

**profanity/index.ts:**
```typescript
import { GlinProfanity } from 'glin-profanity';
import { ALLOWED_WORDS } from './wordlists';

const filter = new GlinProfanity({
  leetspeak: 'aggressive',
  // Add whitelist for common false positives
});

// Add allowed words to prevent false positives
ALLOWED_WORDS.forEach(word => filter.addAllowedWord(word));

/**
 * Check if a name contains profanity.
 * Returns true if profanity is detected.
 */
export function containsProfanity(name: string): boolean {
  return filter.isProfane(name);
}

/**
 * Get the detected profane words (for logging/debugging).
 */
export function getDetectedProfanity(name: string): string[] {
  return filter.detectProfanity(name);
}
```

**profanity/wordlists.ts:**
```typescript
/**
 * Words that should NOT trigger the profanity filter.
 * These are common false positives (Scunthorpe problem).
 */
export const ALLOWED_WORDS: string[] = [
  'Scunthorpe',
  'Assassin',
  'Cockatoo',
  'Cockpit',
  'Dickens',
  'Hancock',
  'Peacock',
  'Shuttlecock',
  'Bassist',
  'Classic',
  'Compass',
  'Grass',
  'Pass',
  'Mass',
  'Class',
];

/**
 * Names that SHOULD trigger the profanity filter.
 * Used for testing.
 */
export const PROFANE_TEST_WORDS: string[] = [
  'fuck',
  'shit',
  'f4ck',
  'sh1t',
  'fck',
  'fuuuck',
  'a55hole',
  'b1tch',
];
```

### Manual Testing
1. Create a test script or use Node REPL to verify filter works
2. Test that "f4ck" returns true
3. Test that "Assassin" returns false

---

## Phase 3: API Integration

Update score submission and player name update endpoints to check profanity when enabled.

### Files to Create/Modify

| File | Action |
|------|--------|
| `keeperboard/src/lib/api/game.ts` | Create |
| `keeperboard/src/app/api/v1/scores/route.ts` | Modify |
| `keeperboard/src/app/api/v1/player/[guid]/route.ts` | Modify |

### Implementation

**lib/api/game.ts** - Helper to fetch game settings:
```typescript
import { createAdminClient } from '@/lib/supabase/admin';

interface GameSettings {
  profanityFilterEnabled: boolean;
}

/**
 * Fetch game settings by game ID.
 * Cached per-request via Supabase client.
 */
export async function getGameSettings(gameId: string): Promise<GameSettings> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('games')
    .select('profanity_filter_enabled')
    .eq('id', gameId)
    .single();

  if (error || !data) {
    // Default to enabled if game not found (shouldn't happen)
    return { profanityFilterEnabled: true };
  }

  return {
    profanityFilterEnabled: data.profanity_filter_enabled,
  };
}
```

**v1/scores/route.ts** - Add profanity check after basic validation:
```typescript
import { containsProfanity } from '@/lib/profanity';
import { getGameSettings } from '@/lib/api/game';

// Inside POST handler, after basic validation:

// Check profanity if enabled for this game
const gameSettings = await getGameSettings(gameId);
if (gameSettings.profanityFilterEnabled && containsProfanity(player_name)) {
  return errorResponse(
    'Name contains inappropriate content',
    'PROFANITY_DETECTED',
    400,
    corsHeaders
  );
}
```

**v1/player/[guid]/route.ts** - Same check in PUT handler:
```typescript
// Inside PUT handler, after validating player_name exists:

const gameSettings = await getGameSettings(gameId);
if (gameSettings.profanityFilterEnabled && containsProfanity(player_name)) {
  return errorResponse(
    'Name contains inappropriate content',
    'PROFANITY_DETECTED',
    400,
    corsHeaders
  );
}
```

### Manual Testing
1. Submit score with profane name via API - should get 400 PROFANITY_DETECTED
2. Submit score with clean name - should succeed
3. Update player name to profane - should get 400 PROFANITY_DETECTED
4. Disable filter in database, retry profane name - should succeed

---

## Phase 4: Dashboard UI

Add profanity filter toggle to the Game edit form.

### Files to Create/Modify

| File | Action |
|------|--------|
| `keeperboard/src/components/forms/GameForm.tsx` | Modify |
| `keeperboard/src/app/(dashboard)/dashboard/games/[gameId]/page.tsx` | Modify |
| `keeperboard/src/app/api/games/[gameId]/route.ts` | Modify |

### Implementation

**GameForm.tsx** - Add toggle field:
```typescript
interface GameFormData {
  name: string;
  description: string;
  profanityFilterEnabled: boolean;  // Add this
}

// Add to form state
const [profanityFilterEnabled, setProfanityFilterEnabled] = useState(
  initialData?.profanityFilterEnabled ?? true
);

// Add toggle UI after description field:
<div className="space-y-2">
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={profanityFilterEnabled}
      onChange={(e) => setProfanityFilterEnabled(e.target.checked)}
      className="w-5 h-5 accent-cyan-500"
    />
    <span className="text-cyan-400 text-sm font-mono uppercase tracking-wider">
      Enable Profanity Filter
    </span>
  </label>
  <p className="text-gray-500 text-xs">
    Block inappropriate player names from leaderboards (recommended)
  </p>
</div>
```

**games/[gameId]/page.tsx** - Pass setting to form and include in update:
```typescript
// Fetch game with profanity_filter_enabled
const { data: game } = await supabase
  .from('games')
  .select('id, name, description, profanity_filter_enabled, created_at')
  // ...

// Pass to GameForm
<GameForm
  initialData={{
    name: game.name,
    description: game.description || '',
    profanityFilterEnabled: game.profanity_filter_enabled,
  }}
  // ...
/>
```

**api/games/[gameId]/route.ts** - Handle profanityFilterEnabled in PUT:
```typescript
// In PUT handler, include in update:
const { name, description, profanityFilterEnabled } = body;

const { error: updateError } = await supabase
  .from('games')
  .update({
    name,
    description: description || null,
    profanity_filter_enabled: profanityFilterEnabled,
    updated_at: new Date().toISOString(),
  })
  .eq('id', gameId);
```

### Manual Testing
1. Open game in dashboard - verify toggle appears with correct state
2. Toggle off, save - verify setting persists on page reload
3. Toggle on, save - verify setting persists
4. Create new game - verify toggle defaults to ON

---

## Phase 5: Unit Tests

Add comprehensive tests for profanity filter with two-array approach.

### Files to Create

| File | Action |
|------|--------|
| `keeperboard/src/lib/profanity/profanity.test.ts` | Create |

### Implementation

**profanity.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';
import { containsProfanity } from './index';

/**
 * Names that SHOULD be blocked (profanity).
 * Add new test cases here when discovered.
 */
const SHOULD_BLOCK: string[] = [
  // Basic profanity
  'fuck',
  'shit',
  'ass',
  'bitch',
  'dick',
  'pussy',
  'cunt',

  // Leetspeak variants
  'f4ck',
  'sh1t',
  'a55',
  'b1tch',
  'd1ck',
  'pu55y',
  'c0ck',

  // Extended/repeated letters
  'fuuuck',
  'shiiit',
  'fuuuuuck',

  // Mixed into names
  'FuckBoy',
  'ShitKing',
  'AssMan',
  'xXfuckXx',

  // Unicode tricks (if supported)
  // 'fṳck',
];

/**
 * Names that should NOT be blocked (false positives).
 * Add names here that were incorrectly blocked.
 */
const SHOULD_ALLOW: string[] = [
  // Normal player names
  'Player1',
  'SkyKing',
  'AcePilot',
  'NightOwl',
  'DragonSlayer',
  'xXProGamerXx',
  'NoobMaster69',

  // Scunthorpe problem - words containing bad substrings
  'Scunthorpe',
  'Assassin',
  'Cockatoo',
  'Cockpit',
  'Dickens',
  'Hancock',
  'Peacock',
  'Shuttlecock',

  // Words with "ass" substring
  'Bassist',
  'Classic',
  'Compass',
  'Embassy',
  'Grass',
  'Mass',
  'Pass',
  'Class',
  'Massive',
  'Rassle',

  // Words with "tit" substring
  'Titanic',
  'Title',
  'Constitution',

  // Words with "cum" substring
  'Document',
  'Cucumber',
  'Circumstance',

  // Words with "hell" substring
  'Hello',
  'Shell',
  'Michelle',

  // Edge cases
  'Bonjour',
  'IcyCobra81',
  'HyperPuma19',
  'MightyPira11',
];

describe('Profanity Filter', () => {
  describe('should BLOCK profane names', () => {
    SHOULD_BLOCK.forEach((name) => {
      it(`blocks "${name}"`, () => {
        expect(containsProfanity(name)).toBe(true);
      });
    });
  });

  describe('should ALLOW clean names', () => {
    SHOULD_ALLOW.forEach((name) => {
      it(`allows "${name}"`, () => {
        expect(containsProfanity(name)).toBe(false);
      });
    });
  });
});
```

**Update package.json** - Ensure vitest is configured:
```json
{
  "scripts": {
    "test": "vitest",
    "test:profanity": "vitest run src/lib/profanity"
  }
}
```

### Manual Testing
1. Run `npm test` - verify all tests pass
2. Add a new profane word to SHOULD_BLOCK - verify test catches it
3. If a valid name gets blocked, add to SHOULD_ALLOW and fix the filter

---

## Phase 6: SDK Update

Update SDK to handle PROFANITY_DETECTED error code and expose it to game clients.

### Files to Modify

| File | Action |
|------|--------|
| `sdk/src/types.ts` | Modify |
| `sdk/src/KeeperBoardSession.ts` | Modify |
| `sdk/src/KeeperBoardClient.ts` | Modify (if needed) |
| `sdk/package.json` | Modify (version bump) |
| `sdk/CHANGELOG.md` | Modify |

### Implementation

**types.ts** - Add error code type:
```typescript
export type ErrorCode =
  | 'PROFANITY_DETECTED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export interface SubmitScoreResult {
  success: boolean;
  rank?: number;
  isNewHighScore?: boolean;
  error?: string;
  errorCode?: ErrorCode;  // Add this
}

export interface UpdateNameResult {
  success: boolean;
  error?: string;
  errorCode?: ErrorCode;  // Add this
}
```

**KeeperBoardSession.ts** - Pass through error code:
```typescript
// In submitScore():
if (!response.ok) {
  const errorData = await response.json();
  return {
    success: false,
    error: errorData.error || 'Failed to submit score',
    errorCode: errorData.code as ErrorCode,
  };
}

// In updatePlayerName():
if (!response.ok) {
  const errorData = await response.json();
  return {
    success: false,
    error: errorData.error || 'Failed to update name',
    errorCode: errorData.code as ErrorCode,
  };
}
```

**package.json** - Version bump:
```json
{
  "version": "2.1.0"  // or appropriate semver bump
}
```

**CHANGELOG.md** - Document change:
```markdown
## [2.1.0] - 2026-03-XX

### Added
- `errorCode` field in `SubmitScoreResult` and `UpdateNameResult`
- `PROFANITY_DETECTED` error code when player name contains inappropriate content

### Changed
- Error responses now include structured error codes for better handling
```

### Manual Testing
1. Build SDK: `npm run build`
2. Test with profane name - verify errorCode is 'PROFANITY_DETECTED'
3. Test with clean name - verify success: true

---

## Phase 7: Game Integration (flight747)

Update flight747 to use new SDK and handle profanity errors in NameInputModal.

### Files to Modify

| File | Action |
|------|--------|
| `package.json` (flight747) | Modify (update SDK) |
| `src/ui/NameInputModal.ts` | Modify |
| `src/managers/LeaderboardManager.ts` | Modify (if needed) |

### Implementation

**package.json** - Update SDK:
```bash
npm update keeperboard
# or
npm install keeperboard@2.1.0
```

**NameInputModal.ts** - Handle profanity error:
```typescript
// Modify OK button handler:
okHit.on('pointerdown', async () => {
  const sanitizedName = sanitize(input.value);
  if (sanitizedName.length < 2) return;

  // Try to set the name
  const result = await leaderboardManager.updatePlayerName(sanitizedName);

  if (!result.success) {
    if (result.errorCode === 'PROFANITY_DETECTED') {
      hint.setText('This name is not allowed. Please choose another.');
      hint.setColor(colors.HINT_ERROR);
      input.focus();
      return; // Don't close modal
    }
    // Other errors - still close but log
    console.warn('Failed to update name:', result.error);
  }

  // Success or non-blocking error
  cleanup();
  resolve(result.success ? sanitizedName : null);
});

// Also handle Enter key similarly
input.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const sanitizedName = sanitize(input.value);
    if (sanitizedName.length < 2) return;

    const result = await leaderboardManager.updatePlayerName(sanitizedName);

    if (result.errorCode === 'PROFANITY_DETECTED') {
      hint.setText('This name is not allowed. Please choose another.');
      hint.setColor(colors.HINT_ERROR);
      return;
    }

    cleanup();
    resolve(result.success ? sanitizedName : null);
  }
  // ... rest of handler
});
```

**LeaderboardManager.ts** - Ensure updatePlayerName returns result with errorCode:
```typescript
async updatePlayerName(newName: string): Promise<UpdateNameResult> {
  if (!this.session) {
    return { success: false, error: 'Leaderboard not configured' };
  }
  return this.session.updatePlayerName(newName);
}
```

### Manual Testing
1. Build game: `npm run dev`
2. Open name input modal
3. Enter profane name (e.g., "f4ck") - should show "This name is not allowed"
4. Enter clean name - should succeed and close modal
5. Verify score submission still works with clean name

---

## Summary

| Phase | Description | Files |
|-------|-------------|-------|
| 1 | Database Migration | 2 |
| 2 | Profanity Filter Utility | 3 |
| 3 | API Integration | 3 |
| 4 | Dashboard UI | 3 |
| 5 | Unit Tests | 1 |
| 6 | SDK Update | 4 |
| 7 | Game Integration | 3 |

**Total: 7 phases, ~19 files**

## Testing Checklist

After all phases complete:

- [ ] New games have profanity filter enabled by default
- [ ] Existing games have profanity filter enabled
- [ ] Toggle appears in dashboard and saves correctly
- [ ] API rejects profane names with PROFANITY_DETECTED
- [ ] API allows clean names
- [ ] Disabling filter allows profane names
- [ ] SDK returns errorCode in result
- [ ] Game shows friendly error for profane names
- [ ] Game allows retry with new name
- [ ] Unit tests pass (all SHOULD_BLOCK blocked, all SHOULD_ALLOW allowed)
- [ ] Auto-generated names are not filtered (SDK uses safe wordlist)
