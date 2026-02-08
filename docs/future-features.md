# Future Feature Ideas

Potential features to add to KeeperBoard. Prioritized by value to indie game developers.

---

## 1. Time-based Leaderboards (Daily/Weekly/Monthly/All-time)

**Status:** Next up

**What it does:** Players compete for the best score within a time window. Leaderboards auto-reset on schedule.

**Why it matters:**
- Drives daily engagement ("come back tomorrow for a fresh start")
- Gives new players a chance to compete
- Very common in mobile games

**Implementation notes:**
- Each leaderboard can have a `reset_period`: none, daily, weekly, monthly
- Scores have a `period_start` timestamp to group them
- Query filters by current period
- Historical periods can be archived or discarded

---

## 2. Embeddable Leaderboard Widget

**Status:** Idea

**What it does:** A simple `<script>` tag or iframe that devs drop on their game's website to show live scores.

**Why it matters:**
- Zero-effort marketing for the game
- Players can check scores outside the game
- Drives traffic back to the game

**Implementation notes:**
- Generate embed code per leaderboard in dashboard
- Customizable themes (dark/light, colors)
- Responsive design
- Optional: player search within widget

---

## 3. Webhooks

**Status:** Idea

**What it does:** HTTP POST notifications to a game server when events happen.

**Events to support:**
- New #1 score submitted
- Player breaks into top N (configurable)
- Daily/weekly leaderboard resets
- New player first score

**Why it matters:**
- Discord bot integration ("🏆 New high score by PlayerX!")
- Custom notifications (email, push)
- Social sharing automation
- Server-side achievements

**Implementation notes:**
- Webhook URL configuration per game/environment
- Retry logic with exponential backoff
- Webhook secret for signature verification
- Event log in dashboard

---

## 4. Score Validation Rules (Anti-cheat)

**Status:** Idea

**What it does:** Configurable rules per leaderboard to reject suspicious scores.

**Rules to support:**
- Min/max score limits
- Rate limit per player (e.g., max 1 submission per 30 seconds)
- Required metadata fields
- Score delta limits (can't jump from 100 to 1,000,000 in one submission)

**Why it matters:**
- Prevents obvious cheating without server-side validation
- Easy to configure, no code required
- Keeps leaderboards fair

**Implementation notes:**
- Rules stored as JSON on leaderboard record
- Validation happens in API before insert
- Return clear error codes for rejected scores
- Dashboard UI to configure rules

---

## 5. Player Stats & History

**Status:** Idea

**What it does:** Track all score attempts (not just best). Show personal progression.

**Features:**
- Personal best vs current session
- Score history graph over time
- "You beat X% of players" percentile
- Attempt count, average score

**Why it matters:**
- Players see their improvement
- Adds depth beyond just "high score"
- Retention through personal progression

**Implementation notes:**
- New `score_history` table (or keep all scores, not just best)
- Aggregate queries for stats
- SDK methods: `getPlayerStats()`, `getScoreHistory()`
- Dashboard visualization

---

## 6. Leaderboard Seasons

**Status:** Idea

**What it does:** Competitive seasons with start/end dates. Past seasons are archived and viewable but locked.

**Features:**
- Create season with name, start date, end date
- Active season accepts scores
- Past seasons are read-only
- Season rewards/badges (optional)

**Why it matters:**
- Common in competitive games
- Fresh starts for players
- Historical bragging rights

**Implementation notes:**
- `seasons` table linked to leaderboard
- Scores linked to season_id
- Auto-transition when season ends
- Dashboard to manage seasons

---

## 7. Bucketed Leaderboards

**Status:** Idea

**What it does:** Automatically groups players into smaller "buckets" so they compete against ~100-1000 players instead of everyone globally.

**How it works:**
1. Player submits their first score
2. System assigns them to a bucket (randomly, or based on join timing)
3. Player stays in that bucket permanently
4. Leaderboard queries only return players in the same bucket

**Bucket assignment methods:**
| Method | How it works |
|--------|--------------|
| Time-based | First 100 players → bucket 1, next 100 → bucket 2 |
| Random | Randomly assigned to any bucket with open slots |
| Scheduled | Everyone who joins Monday → bucket A, Tuesday → bucket B |

**Why it matters:**
- New player sees rank #47 instead of rank #47,291
- Achievable goals increase motivation
- Hardcore players don't permanently dominate
- Great for casual/mobile games

**Player experience:**
- They just see "the leaderboard" — buckets are invisible
- Feels like a real competition they can win
- No bucket switching ever

**Best for:** Casual games, idle games, puzzle games, mobile games where retention > true global ranking

**Less useful for:** Competitive/esports games where players want the real global ranking

**Implementation notes:**
- `bucket_id` field on scores (or separate player→bucket mapping)
- Bucket size configurable per leaderboard
- Assignment logic runs on first score submission
- Query filters by player's bucket_id

---

## 8. Ranked Tiers (LoL-style)

**Status:** Idea (Complex)

**What it does:** Skill-based divisions like Bronze, Silver, Gold, Diamond. Players actively climb tiers.

**Features:**
- MMR/ELO rating calculation
- Visible tier badges
- Promotion/demotion mechanics
- Global leaderboard with tier shown
- Decay for inactive players

**Why it matters:**
- Core feature for competitive games
- Strong player motivation
- Clear skill progression

**Complexity:** High — requires MMR algorithm, tier thresholds, promotion logic, decay system. This is essentially a matchmaking rating system.

**Best for:** Competitive multiplayer games, ranked modes

**Implementation notes:**
- Significant feature, would be its own major version
- Consider as "KeeperBoard Ranked" premium feature
- Study existing systems (Elo, Glicko-2, TrueSkill)

---

## Priority Ranking

1. **Time-based Leaderboards** — Universal value, most games benefit
2. **Webhooks** — High value for engaged developers
3. **Score Validation** — Easy win, prevents common cheating
4. **Embeddable Widget** — Marketing value, drives adoption
5. **Player Stats** — Nice-to-have, adds depth
6. **Seasons** — Valuable for competitive games
7. **Bucketed** — Niche but solves real problem for casual games
8. **Ranked Tiers** — Complex, save for v2

---

*Last updated: 2026-02-07*
