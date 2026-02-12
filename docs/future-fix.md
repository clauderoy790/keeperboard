# Future Fixes

Minor issues identified during SDK v2.0.0 review that can be addressed in a future patch release.

---

## 1. Silent Error Swallowing in Cache Background Refresh

**Location:** `sdk/src/Cache.ts:59`

**Issue:** Background refresh errors are silently swallowed with an empty `.catch(() => {})`. While intentional (background refresh is best-effort), this makes debugging difficult since errors aren't logged anywhere.

**Current Code:**
```typescript
// Swallow the unhandled rejection — background refresh is best-effort
this.inflight.catch(() => {});
```

**Suggested Fix:** Add optional error callback or log in development:
```typescript
this.inflight.catch((err) => {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn('[KeeperBoard] Background cache refresh failed:', err);
  }
});
```

**Impact:** Low - Only affects debugging experience, not functionality.

**Priority:** P3 (Nice to have)

---

## 2. Double Submission Returns to Retry Queue

**Location:** `sdk/src/KeeperBoardSession.ts:97-99`

**Issue:** When a score submission is already in progress and another submission is attempted, it returns `{ success: false, error: 'Submission in progress' }`. This `success: false` status can trigger the retry queue logic on line 127, saving a legitimate "please wait" response as a failed submission for later retry.

**Current Code:**
```typescript
if (this.isSubmitting) {
  return { success: false, error: 'Submission in progress' };
}
```

**Analysis:** In practice, this isn't a major issue because:
1. The retry queue saves the *new* score, not the in-flight one
2. On retry, the actual submission usually succeeds
3. The guard prevents actual double-submissions

However, semantically, "submission in progress" isn't a failure that should be retried.

**Suggested Fix Options:**

Option A: Add a skip-retry flag:
```typescript
export type SessionScoreResult =
  | { success: true; rank: number; isNewHighScore: boolean }
  | { success: false; error: string; skipRetry?: boolean };

// Then:
if (this.isSubmitting) {
  return { success: false, error: 'Submission in progress', skipRetry: true };
}

// And in the catch block:
if (!result.skipRetry) {
  this.retryQueue?.save(score, metadata);
}
```

Option B: Use a specific error code:
```typescript
export type SessionScoreResult =
  | { success: true; rank: number; isNewHighScore: boolean }
  | { success: false; error: string; code?: 'NETWORK_ERROR' | 'SUBMISSION_IN_PROGRESS' };
```

**Impact:** Low - Edge case that rarely causes user-visible issues.

**Priority:** P3 (Nice to have)

---

## Implementation Notes

These fixes are non-breaking and can be added in a 2.0.1 patch release. Neither affects the public API contract.
