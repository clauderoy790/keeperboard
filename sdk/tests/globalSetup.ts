/**
 * Vitest global setup: ensures a Next.js dev server is running before tests.
 * - If localhost:3000 is already responding, uses the existing server.
 * - Otherwise, spawns `npm run dev` in the keeperboard/ directory and waits for it.
 * - On teardown, kills the spawned server (only if we started it).
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';

const API_URL = process.env.KEEPERBOARD_API_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${API_URL}/api/v1/health`;
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

let serverProcess: ChildProcess | null = null;

async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_ENDPOINT, { signal: AbortSignal.timeout(2000) });
    const json = await response.json();
    return json.success === true;
  } catch {
    return false;
  }
}

async function waitForServer(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    if (await isServerRunning()) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Server did not start within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

export async function setup() {
  if (await isServerRunning()) {
    console.log('[test setup] Using existing server at', API_URL);
    return;
  }

  console.log('[test setup] No server detected, starting Next.js dev server...');

  const keeperboardDir = resolve(__dirname, '..', '..', 'keeperboard');

  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: keeperboardDir,
    stdio: 'pipe',
    detached: false,
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString();
    // Only log actual errors, not the noisy Next.js output
    if (msg.includes('Error') || msg.includes('error')) {
      console.error('[dev server]', msg.trim());
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[test setup] Failed to start dev server:', err.message);
  });

  await waitForServer();
  console.log('[test setup] Dev server is ready');
}

export async function teardown() {
  if (serverProcess) {
    console.log('[test teardown] Stopping dev server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}
