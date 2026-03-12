#!/usr/bin/env npx ts-node
/**
 * Anti-Cheat Security Test Script
 *
 * Tests various attack vectors against the KeeperBoard API to verify
 * that anti-cheat measures are working correctly.
 *
 * Usage:
 *   npx ts-node scripts/test-anti-cheat.ts
 *
 * Requirements:
 *   - Local KeeperBoard server running (npm run dev in keeperboard/)
 *   - Test leaderboard with anti-cheat enabled
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'kb_dev_test_key';
const LEADERBOARD = process.env.LEADERBOARD || 'test-anticheat';
const SIGNING_SECRET = process.env.SIGNING_SECRET || '';

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const results: TestResult[] = [];

async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${API_URL}/api/v1${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function test(name: string, passed: boolean, expected: string, actual: string) {
  results.push({ name, passed, expected, actual });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (!passed) {
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
  }
}

// ============================================
// TEST CASES
// ============================================

async function testDirectScoreWithoutRunToken() {
  console.log('\n--- Test: Direct score submission without run token ---');

  const res = await apiCall('/scores', 'POST', {
    player_guid: 'attacker-' + Date.now(),
    player_name: 'ATTACKER',
    score: 99999,
    leaderboard,
  });

  // If run tokens are required, this should fail
  // If not required, it may succeed (backward compatible)
  const requiresToken = res.status === 400 || res.status === 403;
  test(
    'Direct score without run token',
    requiresToken,
    'Should be rejected (400/403) when run tokens required',
    `Status ${res.status}`
  );
}

async function testReplayRunId() {
  console.log('\n--- Test: Replay same run_id ---');

  // Start a legitimate run
  const startRes = await apiCall(`/runs/start?leaderboard=${LEADERBOARD}`, 'POST', {
    player_guid: 'replay-test-' + Date.now(),
  });

  if (startRes.status !== 200) {
    test('Replay run_id', false, 'Need successful start first', `Start failed: ${startRes.status}`);
    return;
  }

  const { run_id } = startRes.data as { run_id: string };

  // Wait minimum time
  await new Promise((r) => setTimeout(r, 1000));

  // First finish - should succeed
  const finish1 = await apiCall('/runs/finish', 'POST', {
    run_id,
    player_guid: 'replay-test-' + Date.now(),
    player_name: 'REPLAY1',
    score: 100,
  });

  // Second finish with same run_id - should fail
  const finish2 = await apiCall('/runs/finish', 'POST', {
    run_id,
    player_guid: 'replay-test-' + Date.now(),
    player_name: 'REPLAY2',
    score: 200,
  });

  test(
    'Replay same run_id',
    finish2.status === 400 || finish2.status === 403,
    'Second use of run_id should be rejected',
    `First: ${finish1.status}, Second: ${finish2.status}`
  );
}

async function testMinElapsedTime() {
  console.log('\n--- Test: Submit before min elapsed time ---');

  const playerGuid = 'elapsed-test-' + Date.now();

  const startRes = await apiCall(`/runs/start?leaderboard=${LEADERBOARD}`, 'POST', {
    player_guid: playerGuid,
  });

  if (startRes.status !== 200) {
    test('Min elapsed time', false, 'Need successful start first', `Start failed: ${startRes.status}`);
    return;
  }

  const { run_id } = startRes.data as { run_id: string };

  // Immediately try to finish (should fail if min_elapsed_seconds > 0)
  const finishRes = await apiCall('/runs/finish', 'POST', {
    run_id,
    player_guid: playerGuid,
    player_name: 'SPEEDRUN',
    score: 100,
  });

  // This test depends on leaderboard having min_elapsed_seconds set
  test(
    'Submit before min elapsed time',
    finishRes.status === 400,
    'Should be rejected for submitting too fast',
    `Status ${finishRes.status}`
  );
}

async function testScoreCap() {
  console.log('\n--- Test: Submit score above cap ---');

  const playerGuid = 'cap-test-' + Date.now();

  const startRes = await apiCall(`/runs/start?leaderboard=${LEADERBOARD}`, 'POST', {
    player_guid: playerGuid,
  });

  if (startRes.status !== 200) {
    test('Score cap', false, 'Need successful start first', `Start failed: ${startRes.status}`);
    return;
  }

  const { run_id } = startRes.data as { run_id: string };

  // Wait minimum time
  await new Promise((r) => setTimeout(r, 2000));

  // Try to submit impossibly high score
  const finishRes = await apiCall('/runs/finish', 'POST', {
    run_id,
    player_guid: playerGuid,
    player_name: 'CHEATER',
    score: 999999999,
  });

  // This test depends on leaderboard having score_cap set
  test(
    'Submit score above cap',
    finishRes.status === 400,
    'Should be rejected for exceeding score cap',
    `Status ${finishRes.status}`
  );
}

async function testInvalidSignature() {
  console.log('\n--- Test: Invalid signature ---');

  const res = await apiCall(
    `/runs/start?leaderboard=${LEADERBOARD}`,
    'POST',
    {
      player_guid: 'sig-test-' + Date.now(),
      timestamp: Date.now(),
    },
    {
      'X-Signature': 'invalid-signature-here',
    }
  );

  // If signing is required, invalid signature should fail
  test(
    'Invalid signature rejected',
    res.status === 401 || res.status === 403,
    'Should reject invalid signature when signing enabled',
    `Status ${res.status}`
  );
}

async function testMissingSignature() {
  console.log('\n--- Test: Missing signature when required ---');

  // This tests the same thing as invalid signature
  // If signing is enabled but no signature provided
  const res = await apiCall(`/runs/start?leaderboard=${LEADERBOARD}`, 'POST', {
    player_guid: 'nosig-test-' + Date.now(),
    timestamp: Date.now(),
  });

  // Note: Server may return 200 if signing is not enforced yet
  // This is informational
  console.log(`   Missing signature response: ${res.status}`);
}

async function testTamperedScore() {
  console.log('\n--- Test: Tampered score in signed request ---');

  if (!SIGNING_SECRET) {
    console.log('   Skipped: SIGNING_SECRET not provided');
    return;
  }

  // This would require implementing the signing algorithm here
  // For now, we just note that tampering would invalidate the signature
  console.log('   Note: Score tampering would invalidate HMAC signature');
  console.log('   The invalid signature test covers this case');
}

async function testLegitimateFlow() {
  console.log('\n--- Test: Legitimate game flow ---');

  const playerGuid = 'legit-test-' + Date.now();

  // Start run
  const startRes = await apiCall(`/runs/start?leaderboard=${LEADERBOARD}`, 'POST', {
    player_guid: playerGuid,
  });

  if (startRes.status !== 200) {
    test('Legitimate flow', false, 'Start should succeed', `Start failed: ${startRes.status}`);
    return;
  }

  const { run_id } = startRes.data as { run_id: string };
  console.log(`   Started run: ${run_id}`);

  // Wait realistic play time
  console.log('   Playing game (waiting 3s)...');
  await new Promise((r) => setTimeout(r, 3000));

  // Submit reasonable score
  const finishRes = await apiCall('/runs/finish', 'POST', {
    run_id,
    player_guid: playerGuid,
    player_name: 'LEGITPLAYER',
    score: 150,
  });

  test(
    'Legitimate game flow',
    finishRes.status === 200,
    'Should succeed for valid gameplay',
    `Status ${finishRes.status}`
  );
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('KeeperBoard Anti-Cheat Security Tests');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Leaderboard: ${LEADERBOARD}`);
  console.log(`Signing: ${SIGNING_SECRET ? 'Configured' : 'Not configured'}`);

  // Check API is reachable
  try {
    const health = await apiCall('/health');
    if (health.status !== 200) {
      console.error('\n❌ API not reachable. Start the server first.');
      process.exit(1);
    }
    console.log('✅ API is reachable\n');
  } catch {
    console.error('\n❌ Cannot connect to API. Is the server running?');
    process.exit(1);
  }

  // Run tests
  await testDirectScoreWithoutRunToken();
  await testReplayRunId();
  await testMinElapsedTime();
  await testScoreCap();
  await testInvalidSignature();
  await testMissingSignature();
  await testTamperedScore();
  await testLegitimateFlow();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`);
      });
  }

  console.log('\nNote: Some tests depend on leaderboard configuration:');
  console.log('  - min_elapsed_seconds must be > 0 for elapsed time test');
  console.log('  - score_cap must be set for score cap test');
  console.log('  - signing_enabled must be true for signature tests');
  console.log('  - require_run_token must be true for run token test');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
