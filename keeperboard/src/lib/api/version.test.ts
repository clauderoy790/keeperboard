/**
 * Manual test suite for version resolution logic.
 * Run with: npx tsx src/lib/api/version.test.ts
 *
 * This file tests the core time-based leaderboard logic WITHOUT database access.
 * It tests calculatePeriodStart, calculateNextReset, and calculatePeriodStartForVersion.
 */

import {
  calculatePeriodStart,
  calculateNextReset,
  calculatePeriodStartForVersion,
} from './version';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

console.log('\n=== Testing calculatePeriodStart ===\n');

// Daily - normal case
test('Daily: mid-day should return same day at reset hour', () => {
  const ref = new Date('2026-02-08T15:30:00Z');
  const result = calculatePeriodStart('daily', 0, ref);
  assertEqual(result.toISOString(), '2026-02-08T00:00:00.000Z');
});

test('Daily: before reset hour should return previous day', () => {
  const ref = new Date('2026-02-08T13:30:00Z');
  const result = calculatePeriodStart('daily', 14, ref);
  assertEqual(result.toISOString(), '2026-02-07T14:00:00.000Z');
});

test('Daily: exactly at reset hour belongs to new period', () => {
  const ref = new Date('2026-02-08T14:00:00.000Z');
  const result = calculatePeriodStart('daily', 14, ref);
  assertEqual(result.toISOString(), '2026-02-08T14:00:00.000Z');
});

test('Daily: 1 second before reset hour belongs to previous period', () => {
  const ref = new Date('2026-02-08T13:59:59.999Z');
  const result = calculatePeriodStart('daily', 14, ref);
  assertEqual(result.toISOString(), '2026-02-07T14:00:00.000Z');
});

// Weekly - normal case
test('Weekly: Wednesday should return Monday of that week at reset hour', () => {
  const ref = new Date('2026-02-11T15:30:00Z'); // Wednesday
  const result = calculatePeriodStart('weekly', 0, ref);
  assertEqual(result.toISOString(), '2026-02-09T00:00:00.000Z'); // Monday
});

test('Weekly: Monday before reset hour should return previous Monday', () => {
  const ref = new Date('2026-02-09T13:00:00Z'); // Monday 13:00
  const result = calculatePeriodStart('weekly', 14, ref);
  assertEqual(result.toISOString(), '2026-02-02T14:00:00.000Z'); // Previous Monday
});

test('Weekly: Monday exactly at reset hour belongs to new week', () => {
  const ref = new Date('2026-02-09T14:00:00.000Z'); // Monday 14:00
  const result = calculatePeriodStart('weekly', 14, ref);
  assertEqual(result.toISOString(), '2026-02-09T14:00:00.000Z');
});

test('Weekly: Sunday should return previous Monday', () => {
  const ref = new Date('2026-02-08T15:00:00Z'); // Sunday
  const result = calculatePeriodStart('weekly', 0, ref);
  assertEqual(result.toISOString(), '2026-02-02T00:00:00.000Z'); // Previous Monday
});

test('Weekly: Tuesday with reset hour 14 should return Monday 14:00', () => {
  const ref = new Date('2026-02-10T10:00:00Z'); // Tuesday 10:00
  const result = calculatePeriodStart('weekly', 14, ref);
  assertEqual(result.toISOString(), '2026-02-09T14:00:00.000Z'); // Monday 14:00
});

// Monthly - normal case
test('Monthly: mid-month should return 1st of that month at reset hour', () => {
  const ref = new Date('2026-02-15T15:30:00Z');
  const result = calculatePeriodStart('monthly', 0, ref);
  assertEqual(result.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('Monthly: 1st before reset hour should return previous month', () => {
  const ref = new Date('2026-02-01T13:00:00Z');
  const result = calculatePeriodStart('monthly', 14, ref);
  assertEqual(result.toISOString(), '2026-01-01T14:00:00.000Z');
});

test('Monthly: 1st exactly at reset hour belongs to new period', () => {
  const ref = new Date('2026-02-01T14:00:00.000Z');
  const result = calculatePeriodStart('monthly', 14, ref);
  assertEqual(result.toISOString(), '2026-02-01T14:00:00.000Z');
});

test('Monthly: edge case Jan 31 to Feb (fewer days)', () => {
  const ref = new Date('2026-01-31T15:00:00Z');
  const result = calculatePeriodStart('monthly', 0, ref);
  assertEqual(result.toISOString(), '2026-01-01T00:00:00.000Z');
});

console.log('\n=== Testing calculateNextReset ===\n');

test('Daily: next reset is +1 day', () => {
  const result = calculateNextReset('daily', 0, '2026-02-08T00:00:00Z');
  assertEqual(result.toISOString(), '2026-02-09T00:00:00.000Z');
});

test('Daily: next reset with custom hour', () => {
  const result = calculateNextReset('daily', 14, '2026-02-08T14:00:00Z');
  assertEqual(result.toISOString(), '2026-02-09T14:00:00.000Z');
});

test('Weekly: next reset is +7 days', () => {
  const result = calculateNextReset('weekly', 0, '2026-02-09T00:00:00Z');
  assertEqual(result.toISOString(), '2026-02-16T00:00:00.000Z');
});

test('Weekly: next reset with custom hour', () => {
  const result = calculateNextReset('weekly', 14, '2026-02-09T14:00:00Z');
  assertEqual(result.toISOString(), '2026-02-16T14:00:00.000Z');
});

test('Monthly: next reset is first day of next month', () => {
  const result = calculateNextReset('monthly', 0, '2026-02-01T00:00:00Z');
  assertEqual(result.toISOString(), '2026-03-01T00:00:00.000Z');
});

test('Monthly: edge case Jan to Feb', () => {
  const result = calculateNextReset('monthly', 0, '2026-01-01T00:00:00Z');
  assertEqual(result.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('Monthly: edge case Feb to Mar (leap year)', () => {
  const result = calculateNextReset('monthly', 0, '2024-02-01T00:00:00Z');
  assertEqual(result.toISOString(), '2024-03-01T00:00:00.000Z');
});

console.log('\n=== Testing calculatePeriodStartForVersion ===\n');

test('Daily: calculate 3 versions back', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'daily',
    reset_hour: 0,
    current_version: 10,
    current_period_start: '2026-02-08T00:00:00Z',
  };
  const result = calculatePeriodStartForVersion(leaderboard, 7);
  assertEqual(result, '2026-02-05T00:00:00.000Z');
});

test('Daily: calculate current version returns current period start', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'daily',
    reset_hour: 14,
    current_version: 5,
    current_period_start: '2026-02-08T14:00:00Z',
  };
  const result = calculatePeriodStartForVersion(leaderboard, 5);
  assertEqual(result, '2026-02-08T14:00:00Z');
});

test('Weekly: calculate 2 weeks back', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'weekly',
    reset_hour: 0,
    current_version: 5,
    current_period_start: '2026-02-09T00:00:00Z', // Monday
  };
  const result = calculatePeriodStartForVersion(leaderboard, 3);
  assertEqual(result, '2026-01-26T00:00:00.000Z'); // 2 weeks earlier
});

test('Monthly: calculate 3 months back', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'monthly',
    reset_hour: 0,
    current_version: 6,
    current_period_start: '2026-02-01T00:00:00Z',
  };
  const result = calculatePeriodStartForVersion(leaderboard, 3);
  assertEqual(result, '2025-11-01T00:00:00.000Z');
});

test('Monthly: edge case crossing year boundary', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'monthly',
    reset_hour: 0,
    current_version: 14,
    current_period_start: '2026-02-01T00:00:00Z',
  };
  const result = calculatePeriodStartForVersion(leaderboard, 1);
  assertEqual(result, '2025-01-01T00:00:00.000Z'); // 13 months back
});

test('Should throw error if target version > current version', () => {
  const leaderboard = {
    id: 'test',
    reset_schedule: 'daily',
    reset_hour: 0,
    current_version: 5,
    current_period_start: '2026-02-08T00:00:00Z',
  };
  try {
    calculatePeriodStartForVersion(leaderboard, 10);
    throw new Error('Should have thrown error');
  } catch (error) {
    if (error instanceof Error && error.message.includes('cannot be greater than')) {
      // Expected error
    } else {
      throw error;
    }
  }
});

// Summary
console.log('\n=== Test Summary ===\n');
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`Total: ${results.length} tests`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tests:');
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}`);
      console.log(`    ${r.error}`);
    });
  process.exit(1);
} else {
  console.log('\n✨ All tests passed!');
}
