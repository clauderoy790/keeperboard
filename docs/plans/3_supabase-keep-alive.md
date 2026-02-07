# Plan 3: Supabase Keep-Alive System

Prevent Supabase free-tier projects from pausing due to inactivity (7-day limit) using a GitHub Actions cron job. Designed for multi-project reuse.

## Context

- Supabase free tier pauses projects after 7 days of no API/DB activity
- A leaderboard service must be available 24/7
- Solution: lightweight heartbeat via GitHub Actions every 3 days
- No dependencies, no fake data — just a simple RPC call

---

## Phase 1: SQL Function & GitHub Actions Workflow

### Prerequisites
- Supabase project resumed and accessible
- GitHub repo with push access

### Steps

#### 1. Create the `keep_alive` SQL function in Supabase

Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'ok';
END;
$$;

-- Allow anon role to call it (needed for the API call)
GRANT EXECUTE ON FUNCTION public.keep_alive() TO anon;
```

#### 2. Create the GitHub Actions workflow

Create `.github/workflows/supabase-keep-alive.yml`:

```yaml
name: Supabase Keep Alive

on:
  schedule:
    # Every 3 days at midnight UTC (well within the 7-day pause window)
    - cron: '0 0 */3 * *'
  workflow_dispatch: # Allow manual trigger for testing

jobs:
  ping:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: KeeperBoard
            url_secret: KEEPERBOARD_SUPABASE_URL
            key_secret: KEEPERBOARD_SUPABASE_ANON_KEY
          # To add another project, just add another entry:
          # - name: MyOtherProject
          #   url_secret: OTHER_PROJECT_SUPABASE_URL
          #   key_secret: OTHER_PROJECT_SUPABASE_ANON_KEY
    steps:
      - name: Ping ${{ matrix.name }}
        run: |
          response=$(curl -sf -X POST \
            "${{ secrets[matrix.url_secret] }}/rest/v1/rpc/keep_alive" \
            -H "apikey: ${{ secrets[matrix.key_secret] }}" \
            -H "Content-Type: application/json")
          echo "${{ matrix.name }}: $response"
```

#### 3. Add GitHub repo secrets

Go to GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|---|---|
| `KEEPERBOARD_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `KEEPERBOARD_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### Manual Testing

1. After pushing the workflow file, go to GitHub → Actions → "Supabase Keep Alive"
2. Click "Run workflow" → "Run workflow" (manual dispatch)
3. Verify the job succeeds and logs `KeeperBoard: "ok"`
4. Verify in Supabase Dashboard → Logs that the RPC call was received

### Success Criteria
- [ ] `keep_alive()` function exists in Supabase and returns `"ok"`
- [ ] GitHub Actions workflow file exists at `.github/workflows/supabase-keep-alive.yml`
- [ ] Repo secrets are configured
- [ ] Manual workflow run succeeds with `"ok"` response
- [ ] Cron schedule is set to run every 3 days

---

## Adding Future Projects

To add a new Supabase project to the keep-alive system:

1. Run the `keep_alive()` SQL function in the new project's SQL Editor
2. Add two new GitHub secrets: `PROJECTNAME_SUPABASE_URL` and `PROJECTNAME_SUPABASE_ANON_KEY`
3. Add a new matrix entry in the workflow file:
   ```yaml
   - name: ProjectName
     url_secret: PROJECTNAME_SUPABASE_URL
     key_secret: PROJECTNAME_SUPABASE_ANON_KEY
   ```
4. Push and manually trigger to verify
