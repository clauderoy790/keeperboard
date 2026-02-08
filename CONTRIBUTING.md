# Contributing to KeeperBoard

Thanks for your interest in contributing! This document outlines how to get started.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase account (free tier works)

### Local Setup

1. Fork and clone the repo
2. Set up the database:
   ```bash
   # Create a Supabase project, then run the SQL files:
   # - keeperboard/supabase/schema.sql
   # - keeperboard/supabase/rls-policies.sql
   ```
3. Configure environment:
   ```bash
   cd keeperboard
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```

## Making Changes

### Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test locally
4. Commit with a clear message
5. Push and open a Pull Request

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add player deletion endpoint`
- `fix: correct rate limit header format`
- `docs: update SDK examples`
- `chore: update dependencies`

### Code Style

- TypeScript for all new code
- Use existing patterns in the codebase
- Run `npm run lint` before committing (if available)

## What to Contribute

### Good First Issues

Look for issues labeled `good first issue` or `help wanted`.

### Ideas Welcome

- Bug fixes
- Documentation improvements
- New SDK features
- Dashboard UX improvements
- Performance optimizations

### Before Starting Big Changes

For significant changes, please open an issue first to discuss. This helps avoid wasted effort if the change doesn't align with the project direction.

## SDK Development

The SDK lives in `/sdk`. To work on it:

```bash
cd sdk
npm install
npm run build      # Build the SDK
npm run typecheck  # Check types
```

## Questions?

Open an issue with your question and we'll help out.
