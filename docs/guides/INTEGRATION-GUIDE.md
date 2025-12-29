# KeeperBoard Integration Guide

> Step-by-step guide to add KeeperBoard leaderboards to your Unity game.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Your Account](#1-create-your-account)
3. [Create Your Game](#2-create-your-game)
4. [Generate API Keys](#3-generate-api-keys)
5. [Create Leaderboards](#4-create-leaderboards)
6. [Install Unity Package](#5-install-unity-package)
7. [Configure the Package](#6-configure-the-package)
8. [Basic Usage](#7-basic-usage)
9. [Testing Your Integration](#8-testing-your-integration)
10. [Migrating from UGS](#9-migrating-from-ugs-optional)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Unity 2021.3 or newer
- A Unity project with your game
- Internet connection

---

## 1. Create Your Account

1. Go to [https://keeperboard.vercel.app](https://keeperboard.vercel.app) (or your self-hosted URL)

2. Click **"Get Started"** or **"Sign Up"**

3. Register using one of:
   - Email + Password
   - Google account
   - GitHub account

4. If using email, check your inbox and **verify your email**

5. You'll be redirected to the dashboard

---

## 2. Create Your Game

1. From the dashboard, click **"Create Game"**

2. Fill in the details:
   | Field | Example | Notes |
   |-------|---------|-------|
   | **Name** | Graveyard Groundskeeper | Display name |
   | **Slug** | graveyard-groundskeeper | URL-friendly (auto-generated) |
   | **Description** | A 2D falling object catcher | Optional |

3. Click **"Create"**

4. You'll be taken to your game's management page

---

## 3. Generate API Keys

You need **two API keys**: one for development, one for production.

### Generate Dev Key

1. On your game's page, find the **"API Keys"** section

2. Click **"Generate Dev Key"**

3. **IMPORTANT**: Copy the key immediately! It will only be shown once.
   ```
   kb_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4
   ```

4. Store it somewhere safe (password manager, secure notes)

### Generate Prod Key

1. Click **"Generate Prod Key"**

2. Copy and store this key separately
   ```
   kb_prod_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6
   ```

### Key Format

| Environment | Prefix | Example |
|-------------|--------|---------|
| Development | `kb_dev_` | `kb_dev_abc123...` |
| Production | `kb_prod_` | `kb_prod_xyz789...` |

---

## 4. Create Leaderboards

Each game can have multiple leaderboards (e.g., "High Scores", "Weekly Best", "Speedrun").

1. On your game's page, find the **"Leaderboards"** section

2. Click **"Create Leaderboard"**

3. Configure:
   | Field | Example | Notes |
   |-------|---------|-------|
   | **Name** | High Scores | Display name |
   | **Slug** | high-scores | Used in API (auto-generated) |
   | **Sort Order** | Highest First | Or "Lowest First" for time-based |

4. Click **"Create"**

5. Note: A default "High Scores" leaderboard may be auto-created with your game

---

## 5. Install Unity Package

### Option A: Unity Package Manager (Recommended)

1. Open your Unity project

2. Go to **Window > Package Manager**

3. Click the **"+"** button in the top-left

4. Select **"Add package from git URL..."**

5. Enter:
   ```
   https://github.com/YOUR_USERNAME/keeper-board-unity.git
   ```

6. Click **"Add"**

7. Wait for installation to complete

### Option B: Manual Installation

1. Download the latest release from GitHub

2. Extract to your `Assets/` folder:
   ```
   Assets/
   └── KeeperBoard/
       ├── Runtime/
       └── Editor/
   ```

---

## 6. Configure the Package

### Create Configuration Asset

1. In Unity, go to **Assets > Create > KeeperBoard > Config**

2. Name it `KeeperBoardConfig` (or any name you prefer)

3. Place it in a sensible location, e.g., `Assets/ScriptableObjects/`

### Configure Settings

Select the config asset and fill in the Inspector:

| Field | Value | Notes |
|-------|-------|-------|
| **API URL** | `https://keeperboard.vercel.app/api/v1` | Or your self-hosted URL |
| **Dev API Key** | `kb_dev_your_key_here` | From Step 3 |
| **Prod API Key** | `kb_prod_your_key_here` | From Step 3 |
| **Use Production In Editor** | ❌ Unchecked | Check only to test prod |
| **Max Retries** | `3` | Retry failed requests |
| **Retry Delay (seconds)** | `1` | Delay between retries |

### Key Selection Logic

The package automatically selects the correct key:

| Build Type | Key Used |
|------------|----------|
| Unity Editor | Dev (unless "Use Production In Editor" checked) |
| Development Build | Dev |
| Release Build | Prod |

---

## 7. Basic Usage

### Setup

Create a manager script or add to your existing game manager:

```csharp
using UnityEngine;
using KeeperBoard;

public class MyLeaderboardManager : MonoBehaviour
{
    [SerializeField] private KeeperBoardConfig config;

    private KeeperBoardClient client;

    private void Awake()
    {
        client = new KeeperBoardClient(config);
    }
}
```

### Submit a Score

```csharp
public async void SubmitScore(int score)
{
    // Optionally set player name first (persists in PlayerPrefs)
    // PlayerIdentity.Name = "PlayerName";

    var result = await client.SubmitScore(score);

    if (result.success)
    {
        Debug.Log($"Score submitted! Rank: #{result.data.rank}");

        if (result.data.is_new_high_score)
        {
            Debug.Log("New personal best!");
        }
    }
    else
    {
        Debug.LogError($"Failed to submit score: {result.error}");
    }
}
```

### Get Top Scores

```csharp
public async void LoadLeaderboard()
{
    var result = await client.GetTopScores(limit: 10);

    if (result.success)
    {
        foreach (var entry in result.data.entries)
        {
            Debug.Log($"#{entry.rank} {entry.player_name}: {entry.score}");

            // Check if this is the current player
            if (entry.player_guid == PlayerIdentity.Guid)
            {
                Debug.Log("^ That's you!");
            }
        }
    }
}
```

### Get Current Player's Score

```csharp
public async void LoadMyScore()
{
    var result = await client.GetPlayerScore();

    if (result.success)
    {
        Debug.Log($"Your rank: #{result.data.rank}");
        Debug.Log($"Your score: {result.data.score}");
    }
    else if (result.code == "NOT_FOUND")
    {
        Debug.Log("You haven't submitted a score yet!");
    }
}
```

### Update Player Name

```csharp
public async void SetPlayerName(string newName)
{
    // Save locally
    PlayerIdentity.Name = newName;

    // Update on server (if player has a score)
    var result = await client.UpdatePlayerName(newName);

    if (result.success)
    {
        Debug.Log($"Name updated to: {result.data.player_name}");
    }
}
```

### Complete Example

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KeeperBoard;
using System.Collections.Generic;

public class LeaderboardManager : MonoBehaviour
{
    public static LeaderboardManager Instance { get; private set; }

    [Header("Configuration")]
    [SerializeField] private KeeperBoardConfig config;

    [Header("UI References")]
    [SerializeField] private Transform leaderboardContainer;
    [SerializeField] private GameObject entryPrefab;
    [SerializeField] private TMP_InputField nameInput;
    [SerializeField] private TextMeshProUGUI statusText;

    private KeeperBoardClient client;

    public bool IsReady => client != null;

    private void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        client = new KeeperBoardClient(config);
    }

    public async void SubmitScore(int score)
    {
        statusText.text = "Submitting score...";

        var result = await client.SubmitScore(score);

        if (result.success)
        {
            statusText.text = $"Rank #{result.data.rank}!";
            await RefreshLeaderboard();
        }
        else
        {
            statusText.text = "Failed to submit score";
            Debug.LogError(result.error);
        }
    }

    public async System.Threading.Tasks.Task RefreshLeaderboard()
    {
        statusText.text = "Loading...";

        // Clear existing entries
        foreach (Transform child in leaderboardContainer)
        {
            Destroy(child.gameObject);
        }

        var result = await client.GetTopScores(10);

        if (result.success)
        {
            foreach (var entry in result.data.entries)
            {
                var go = Instantiate(entryPrefab, leaderboardContainer);
                var text = go.GetComponentInChildren<TextMeshProUGUI>();
                text.text = $"{entry.rank}. {entry.player_name} - {entry.score:N0}";

                // Highlight current player
                if (entry.player_guid == PlayerIdentity.Guid)
                {
                    text.color = Color.yellow;
                }
            }

            statusText.text = $"{result.data.total_count} total scores";
        }
        else
        {
            statusText.text = "Failed to load leaderboard";
        }
    }

    public void OnNameSubmit()
    {
        var newName = nameInput.text.Trim();
        if (!string.IsNullOrEmpty(newName))
        {
            SetPlayerName(newName);
        }
    }

    private async void SetPlayerName(string name)
    {
        PlayerIdentity.Name = name;
        await client.UpdatePlayerName(name);
    }
}
```

---

## 8. Testing Your Integration

### In Unity Editor

1. Enter Play mode

2. Submit a test score:
   ```csharp
   // In a test script or console
   LeaderboardManager.Instance.SubmitScore(100);
   ```

3. Check the KeeperBoard dashboard - score should appear

4. Load the leaderboard in-game - should show your score

### Test Checklist

- [ ] Score submits successfully
- [ ] Score appears in dashboard (dev environment)
- [ ] Leaderboard loads in-game
- [ ] Player name displays correctly
- [ ] Current player is highlighted
- [ ] Higher score replaces lower score
- [ ] Lower score does NOT replace higher score
- [ ] Works offline gracefully (no crash)

### Test Production (Before Release)

1. In config, check **"Use Production In Editor"**

2. Test all features again

3. Verify scores appear in prod leaderboard (separate from dev)

4. Uncheck the setting when done testing

---

## 9. Migrating from UGS (Optional)

If you're replacing Unity Gaming Services leaderboards:

### Export UGS Scores

**Option A: Manual Export**
1. Go to Unity Dashboard > Gaming Services > Leaderboards
2. View your leaderboard scores
3. Copy/note player names and scores

**Option B: Direct Import (in KeeperBoard)**
1. Go to your game in KeeperBoard dashboard
2. Click **"Import Scores"**
3. Select **"UGS Import"** tab
4. Enter your UGS credentials:
   - Project ID
   - Service Account Key ID
   - Service Account Secret
5. Select the leaderboard to import
6. Click **"Import"**

### Import to KeeperBoard

**For Manual Export:**
1. Go to your game in KeeperBoard dashboard
2. Click **"Import Scores"**
3. Select **"Manual Import"** tab
4. Paste your data (CSV or JSON format):
   ```json
   [
     {"player_name": "Player1", "score": 5000},
     {"player_name": "Player2", "score": 4500},
     {"player_name": "Player3", "score": 3200}
   ]
   ```
5. Map the columns if needed
6. Click **"Import"**

### Handle Returning Players

Migrated scores have no `player_guid` (they came from a different system).

When a returning player launches your game with KeeperBoard:

```csharp
private async void Start()
{
    // If player had a name from the UGS era
    string savedName = PlayerPrefs.GetString("UGS_PlayerName", "");

    if (!string.IsNullOrEmpty(savedName))
    {
        // Try to claim their migrated score
        var result = await client.ClaimMigratedScore(savedName);

        if (result.success && result.data.claimed)
        {
            Debug.Log($"Welcome back! Your score of {result.data.score} has been restored.");
            PlayerIdentity.Name = savedName;
        }
    }
}
```

### Update Your Code

Replace UGS calls with KeeperBoard:

| UGS | KeeperBoard |
|-----|-------------|
| `LeaderboardsService.Instance.AddPlayerScoreAsync()` | `client.SubmitScore()` |
| `LeaderboardsService.Instance.GetScoresAsync()` | `client.GetTopScores()` |
| `LeaderboardsService.Instance.GetPlayerScoreAsync()` | `client.GetPlayerScore()` |
| `AuthenticationService.Instance.PlayerId` | `PlayerIdentity.Guid` |
| `AuthenticationService.Instance.UpdatePlayerNameAsync()` | `client.UpdatePlayerName()` |

### Remove UGS Dependencies

Once migration is complete:

1. Remove UGS packages from Package Manager:
   - `com.unity.services.core`
   - `com.unity.services.authentication`
   - `com.unity.services.leaderboards`

2. Delete old UGS-related code

3. Remove UGS project linking from Unity Dashboard

---

## Troubleshooting

### "Invalid API Key" Error

- Double-check the key is correct (copy-paste again)
- Ensure you're using the right key for the environment (dev vs prod)
- Check if the key was regenerated (old keys are invalidated)

### Scores Not Appearing in Dashboard

- Confirm you're checking the correct environment (dev vs prod)
- Check Unity console for error messages
- Verify your game has a leaderboard created

### "Network Error" or Timeout

- Check internet connection
- Verify the API URL is correct
- The service might be temporarily down - check status

### Player GUID Changes

The GUID is stored in `PlayerPrefs`. It can reset if:
- Player clears browser data (WebGL)
- Player reinstalls the app (mobile)
- PlayerPrefs are deleted

This creates a "new" player. Consider implementing account linking for persistent identity.

### Scores Not Updating

KeeperBoard only updates scores if the new score is **higher** than the existing one (for `desc` leaderboards). This is intentional to preserve high scores.

### WebGL/Browser Issues

- Ensure your hosting allows CORS (KeeperBoard API allows all origins)
- Check browser console for specific errors
- Some ad blockers may interfere - test in incognito mode

---

## Quick Reference

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/scores` | Submit score |
| `GET` | `/api/v1/leaderboard` | Get top scores |
| `GET` | `/api/v1/player/:guid` | Get player's score |
| `PUT` | `/api/v1/player/:guid` | Update player name |
| `POST` | `/api/v1/claim` | Claim migrated score |
| `GET` | `/api/v1/health` | Health check |

### PlayerIdentity Properties

| Property | Type | Description |
|----------|------|-------------|
| `PlayerIdentity.Guid` | `string` | Unique player ID (auto-generated) |
| `PlayerIdentity.Name` | `string` | Player display name |
| `PlayerIdentity.HasConfirmedName` | `bool` | Whether name was set |

### Response Format

All API responses follow this structure:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

---

## Support

- **Documentation**: [https://keeperboard.vercel.app/docs](https://keeperboard.vercel.app/docs)
- **Issues**: [https://github.com/YOUR_USERNAME/keeper-board/issues](https://github.com/YOUR_USERNAME/keeper-board/issues)
- **Unity Package Issues**: [https://github.com/YOUR_USERNAME/keeper-board-unity/issues](https://github.com/YOUR_USERNAME/keeper-board-unity/issues)

---

*Happy leaderboarding!*
