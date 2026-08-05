#!/usr/bin/env npx tsx
/**
 * Removes integration test fixtures orphaned by runs that died before teardown.
 *
 * Runs automatically before every `npm run test:integration`; this script exists for
 * running it on its own, or for checking what would be removed.
 *
 * Usage:
 *   npm run test:clean
 */

import { config } from 'dotenv';
import { sweepStaleFixtures } from '../tests/sweepStaleFixtures';

config();

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — see sdk/.env.example');
    process.exit(1);
  }

  const { scanned, removed } = await sweepStaleFixtures();

  if (removed.length === 0) {
    console.log(`No orphaned test fixtures found (scanned ${scanned} games).`);
    return;
  }

  console.log(`Removed ${removed.length} orphaned test fixture(s):`);
  for (const name of removed) {
    console.log(`  - ${name}`);
  }
}

main().catch((error) => {
  console.error('Sweep failed:', error);
  process.exit(1);
});
