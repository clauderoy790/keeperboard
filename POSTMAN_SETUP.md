# Postman Setup Guide for KeeperBoard API

This guide will help you test the KeeperBoard API using Postman.

## Quick Start

### 1. Import Files into Postman

1. Open Postman
2. Click **Import** (top left)
3. Drag and drop both files:
   - `KeeperBoard_API.postman_collection.json`
   - `KeeperBoard_Local.postman_environment.json`

### 2. Configure Environment

1. Click the **Environments** icon (left sidebar) or the environment dropdown (top right)
2. Select **KeeperBoard Local**
3. Click the eye icon to edit variables
4. Set your **api_key** value:
   - Go to your KeeperBoard dashboard (http://localhost:3000/dashboard)
   - Navigate to a game
   - Generate an API key for an environment
   - Copy the full key (e.g., `kb_dev_a1b2c3d4...`)
   - Paste it as the `api_key` value in Postman
5. Save the environment

### 3. Select Environment

- In the top-right dropdown, select **KeeperBoard Local**
- The environment is now active

## What's Included

The collection includes **6 main folders**:

### 1. Health
- **Health Check** — No authentication required

### 2. Scores
- **Submit Score (Default Leaderboard)** — Submit to the first/default leaderboard
- **Submit Score (Specific Leaderboard)** — Submit to a leaderboard by slug
- **Submit Score (No API Key)** — Example error case (401)

### 3. Leaderboard
- **Get Leaderboard (Default)** — Get top scores from default leaderboard
- **Get Leaderboard (Specific by Slug)** — Get scores from a specific leaderboard
- **Get Leaderboard (Top 100)** — Get maximum entries (limit=100)
- **Get Leaderboard (Invalid API Key)** — Example error case (401)

### 4. Player
- **Get Player Score & Rank** — Get a player's current score and rank
- **Get Player (Specific Leaderboard)** — Get player data from a specific leaderboard
- **Update Player Name** — Change a player's display name
- **Get Player (Not Found)** — Example error case (404)

### 5. Claim
- **Claim Migrated Score** — Claim an imported score by matching player_name
- **Claim Score (Specific Leaderboard)** — Claim on a specific leaderboard
- **Claim Score (Not Found)** — Example error case (404)

### 6. Complete Flow Example
A step-by-step workflow demonstrating the typical use case:
1. Submit first score
2. Check rank
3. Submit higher score (updates)
4. Submit lower score (does NOT update)
5. View full leaderboard
6. Update player name

## Testing the API

### Prerequisites

Before testing, ensure you have:
1. **Local server running**: `npm run dev` in the `keeperboard/` directory
2. **At least one game created** in the dashboard
3. **At least one leaderboard** created for that game
4. **API key generated** for an environment (dev, prod, etc.)

### Basic Test Flow

1. **Start with Health Check**
   - Run: `Health > Health Check`
   - Should return `200 OK` without requiring an API key

2. **Submit a Score**
   - Run: `Scores > Submit Score (Default Leaderboard)`
   - Should return `200` with score, rank, and `is_new_high_score: true`

3. **View Leaderboard**
   - Run: `Leaderboard > Get Leaderboard (Default)`
   - Should show your submitted score in the entries array

4. **Get Player Data**
   - Run: `Player > Get Player Score & Rank`
   - Should return your player's score and current rank

5. **Update Player Name**
   - Run: `Player > Update Player Name`
   - Should return updated player data with new name

### Testing Error Cases

Test authentication failures:
- Run: `Scores > Submit Score (No API Key)` → Expected: `401 INVALID_API_KEY`
- Run: `Leaderboard > Get Leaderboard (Invalid API Key)` → Expected: `401 INVALID_API_KEY`

Test not found errors:
- Run: `Player > Get Player (Not Found)` → Expected: `404 NOT_FOUND`

### Testing with Multiple Leaderboards

If you have multiple leaderboards:
1. Note the **slug** of each leaderboard from the dashboard
2. Use the `?leaderboard=slug` parameter in requests
3. Examples:
   - `Scores > Submit Score (Specific Leaderboard)`
   - `Leaderboard > Get Leaderboard (Specific by Slug)`

### Testing the Claim Endpoint

The claim endpoint requires migrated scores in the database:

**Option 1: Manual SQL Insert**
```sql
-- In Supabase SQL Editor
INSERT INTO scores (
  leaderboard_id,
  player_name,
  score,
  is_migrated,
  migrated_from
)
VALUES (
  'your-leaderboard-id',  -- Get this from dashboard or DB
  'MigratedPlayerName',
  5000,
  true,
  'csv'
);
```

**Option 2: Wait for Phase 12**
Phase 12 implements CSV/JSON import which creates migrated scores automatically.

After creating a migrated score:
- Run: `Claim > Claim Migrated Score`
- Update the `player_name` in the request body to match your migrated score
- Should return `200` with `claimed: true`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3000` |
| `api_key` | Your API key from dashboard | `kb_dev_a1b2c3d4...` |
| `player_guid` | Test player GUID for reuse | `test-player-123` |

## Tips

- **Use the environment variables**: Variables like `{{player_guid}}` make it easy to reuse the same test data
- **Check the Console**: Postman's console (bottom left) shows detailed request/response data
- **Save responses**: You can save example responses in Postman for documentation
- **Duplicate requests**: Right-click any request to duplicate and modify for custom tests
- **Run folder**: You can run all requests in a folder sequentially using the "Run" button

## Production Testing

To test against production:
1. Duplicate the **KeeperBoard Local** environment
2. Rename it to **KeeperBoard Production**
3. Change `base_url` to your production URL (e.g., `https://keeperboard.vercel.app`)
4. Generate a production API key from your production dashboard
5. Switch to the production environment in Postman

## Troubleshooting

### "Invalid API key" errors
- Ensure you've generated an API key in the dashboard
- Check that the key starts with `kb_` (e.g., `kb_dev_` or `kb_prod_`)
- Verify the key is for the correct environment
- Make sure you've selected the **KeeperBoard Local** environment in Postman

### "Leaderboard not found" errors
- Ensure you have at least one leaderboard created
- If using `?leaderboard=slug`, verify the slug is correct
- Check the dashboard to see available leaderboard slugs

### "Player not found" errors
- Submit a score first before trying to get player data
- Ensure the `player_guid` matches what you submitted
- Check that you're querying the correct leaderboard

### Connection refused
- Ensure the dev server is running: `npm run dev`
- Check that the server is running on port 3000
- Verify `base_url` is `http://localhost:3000` (not `https`)

## API Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": { ... }
}
```

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `INVALID_API_KEY` (401)
- `NOT_FOUND` (404)
- `ALREADY_CLAIMED` (409)
- `INVALID_REQUEST` (400)
- `INTERNAL_ERROR` (500)

## Next Steps

After testing the API:
- Phase 10: TypeScript Client SDK
- Phase 11: Scores Management UI
- Phase 12: CSV/JSON Import (enables claim endpoint testing)
- Phase 13: Integration Testing & Polish
