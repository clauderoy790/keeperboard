# KeeperBoard Deployment Guide

## Prerequisites

- Vercel account
- Supabase project
- GitHub account (for OAuth, optional)
- Google OAuth credentials (optional)

## Environment Variables

### Required Variables

Create these in your Vercel project settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site URL (for OAuth callbacks)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### Optional Variables (OAuth)

Only needed if enabling OAuth login:

```bash
# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down your project URL and keys

### 2. Run Database Migrations

Execute the SQL files in order:

1. Connect to your Supabase project SQL editor
2. Run `supabase/schema.sql` - Creates all tables
3. Run `supabase/rls-policies.sql` - Enables Row Level Security

### 3. Configure Authentication

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: Set to your production URL (e.g., `https://your-domain.vercel.app`)
2. **Redirect URLs**: Add your auth callback URL:
   - `https://your-domain.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

### 4. Enable Email Auth

In Supabase Dashboard → Authentication → Providers:

1. Enable Email provider
2. Disable email confirmation for MVP (or configure SMTP)
3. Optional: Enable GitHub/Google OAuth

## Vercel Deployment

### 1. Connect Repository

1. Import your GitHub repository to Vercel
2. Select the `keeperboard` directory as the root
3. Framework preset: Next.js

### 2. Configure Build Settings

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Root Directory**: `keeperboard`

### 3. Set Environment Variables

Go to Project Settings → Environment Variables and add all required variables from above.

### 4. Deploy

Click "Deploy" - Vercel will build and deploy your application.

## Post-Deployment Checklist

### Security

- [ ] Verify RLS is enabled on all Supabase tables
- [ ] Test that unauthenticated users cannot access dashboard
- [ ] Test that users cannot access other users' games
- [ ] Verify API key authentication works
- [ ] Test rate limiting (60 req/min per key)
- [ ] Verify CORS headers are correct

### Authentication

- [ ] Test email/password registration
- [ ] Test email/password login
- [ ] Test logout
- [ ] Test OAuth (GitHub/Google) if enabled
- [ ] Verify auth callbacks work with production URL
- [ ] Test session persistence across page reloads
- [ ] Test session expiry and auto-logout

### Dashboard Functionality

- [ ] Create a game
- [ ] Create an environment
- [ ] Generate API keys for each environment
- [ ] Create a leaderboard
- [ ] View empty leaderboard (empty state)
- [ ] Edit game/leaderboard details
- [ ] Delete game/leaderboard (with confirmation)

### Public API

- [ ] Test health endpoint (no auth needed)
- [ ] Test score submission with valid API key
- [ ] Test score submission with invalid API key (should fail)
- [ ] Test leaderboard retrieval
- [ ] Test player lookup
- [ ] Test player name update
- [ ] Test rate limiting (make 61+ requests rapidly)

### SDK Integration

- [ ] Install dependencies in test game
- [ ] Connect to production API with prod API key
- [ ] Submit score from test game
- [ ] Verify score appears in dashboard
- [ ] Test leaderboard display in game
- [ ] Test all SDK methods

### Data Management

- [ ] Import CSV scores
- [ ] Import JSON scores
- [ ] Reset leaderboard (delete all scores)
- [ ] Delete individual score
- [ ] Edit score

### Performance

- [ ] Test page load times
- [ ] Verify API response times < 200ms
- [ ] Check for memory leaks in rate limiter
- [ ] Test with 100+ scores on leaderboard
- [ ] Test pagination with large datasets

## Monitoring

### Vercel Dashboard

Monitor in Vercel Analytics:
- Function execution times
- Error rates
- Bandwidth usage
- Build times

### Supabase Dashboard

Monitor in Supabase Dashboard:
- API usage
- Database size
- Active connections
- Query performance

## Troubleshooting

### OAuth Not Working

**Problem**: OAuth login fails or redirects to wrong URL

**Solution**:
1. Check `NEXT_PUBLIC_SITE_URL` matches your production domain
2. Verify redirect URL in Supabase auth settings
3. Check OAuth provider credentials are correct
4. Ensure OAuth callback URL is whitelisted in provider settings

### API Keys Not Working

**Problem**: Valid API key returns 401

**Solution**:
1. Verify API key is copied correctly (no whitespace)
2. Check API key belongs to correct environment
3. Verify Supabase service role key is set in Vercel env vars
4. Check RLS policies on `api_keys` table

### Rate Limiting Issues

**Problem**: Rate limiting not working across Vercel instances

**Solution**:
- Current in-memory solution is single-instance only
- For production scale, migrate to Redis/Upstash
- Acceptable for MVP with low traffic

### CORS Errors

**Problem**: Browser blocks API requests

**Solution**:
1. Verify `corsHeaders` in `/api/v1/*` routes
2. Check that `Access-Control-Allow-Origin: *` is set
3. Ensure preflight OPTIONS requests return 204

## Scaling Considerations

### Database

- Supabase free tier: 500MB database, 50MB file storage
- Upgrade to Pro if you exceed limits
- Consider adding database indexes for large leaderboards

### API

- Vercel free tier: 100GB bandwidth, 100,000 edge requests/mo
- Current rate limiting is in-memory (single instance)
- For scale, migrate to Upstash Redis or Vercel KV

### Caching

Consider adding caching for:
- Leaderboard data (cache for 30-60 seconds)
- Player rank lookups
- API key validation results

## Backup Strategy

### Database Backups

Supabase Pro provides:
- Daily automated backups
- Point-in-time recovery

For free tier:
- Export data regularly via CSV
- Store SQL dumps in version control (without sensitive data)

### Code Backups

- Git repository is your source of truth
- Tag releases: `git tag v1.0.0 && git push --tags`
- Keep deployment history in Vercel

## Updates and Maintenance

### Updating Dependencies

```bash
cd keeperboard
npm update
npm audit fix
git commit -m "chore: update dependencies"
git push
```

Vercel will auto-deploy.

### Database Schema Changes

1. Test migration locally
2. Export current schema: `pg_dump > backup.sql`
3. Apply migration in Supabase SQL editor
4. Verify in dashboard
5. Update `supabase/schema.sql` in repo

### Rollback Procedure

If deployment breaks:

1. In Vercel dashboard, find previous working deployment
2. Click "..." → "Redeploy"
3. Investigate issue locally
4. Fix and redeploy

## Support and Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

## Production Readiness Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] RLS enabled and tested
- [ ] OAuth callbacks configured
- [ ] CORS headers correct
- [ ] Rate limiting active
- [ ] Error handling covers all edge cases
- [ ] Input validation on all endpoints
- [ ] Homepage looks good
- [ ] Dashboard fully functional
- [ ] Public API working with SDK
- [ ] Test game successfully integrated
- [ ] Security review complete
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Documentation up to date

---

**Last Updated**: 2026-02-07
