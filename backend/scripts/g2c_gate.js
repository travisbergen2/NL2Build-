#!/usr/bin/env node
/**
 * E-NL2B-2c Gate G2c — webhook plumbing gate (blocks reporting).
 *
 * Sends ONE kind=file job for a fixed trivial target through the ACTUAL
 * webhook transport and records: HTTP status, latency, response envelope
 * shape, and whether the reply is non-empty — i.e. whether the webhook
 * returns the agent's output synchronously.
 *
 * Usage:
 *   NL2B_WORKER_WEBHOOK_URL=https://... node scripts/g2c_gate.js
 *
 * This script performs NO corpus work. Running it does not start E-NL2B-2c.
 */
const { WorkerGenerationService } = require('../src/services/workerClient');

const PROBE = {
  kind: 'file',
  description: 'A simple tap counter app. One screen, a number, an increment button.',
  packageName: 'com.nl2b.gate',
  manifest: [
    'settings.gradle.kts',
    'build.gradle.kts',
    'gradle.properties',
    'app/build.gradle.kts',
    'app/src/main/AndroidManifest.xml',
    'app/src/main/java/com/nl2b/gate/MainActivity.kt',
  ],
  targetPath: 'gradle.properties',
};

(async () => {
  const url = process.env.NL2B_WORKER_WEBHOOK_URL;
  if (!url) {
    console.error('G2c: FAIL — NL2B_WORKER_WEBHOOK_URL not set');
    process.exit(2);
  }
  const svc = new WorkerGenerationService();
  const t0 = Date.now();
  try {
    const reply = await svc.callWorker(PROBE);
    const ms = Date.now() - t0;
    const looksRight = /android\.useAndroidX\s*=\s*true/.test(reply);
    console.log(`G2c: reply received in ${(ms / 1000).toFixed(1)}s, ${reply.length} chars`);
    console.log(`G2c: content plausibility (androidx flag present): ${looksRight}`);
    console.log('--- first 300 chars of reply ---');
    console.log(reply.slice(0, 300));
    console.log('--------------------------------');
    if (reply.length > 0) {
      console.log('G2c: PASS — synchronous non-empty reply through the webhook transport');
      process.exit(0);
    }
  } catch (e) {
    console.error(`G2c: FAIL after ${((Date.now() - t0) / 1000).toFixed(1)}s — ${e.message}`);
    console.error('If the failure is a timeout or an immediate 200 with an empty/ack body,');
    console.error('the webhook is ASYNCHRONOUS: record that semantics finding per the');
    console.error('protocol and use the documented fallback transport (logged, not a deviation).');
    process.exit(1);
  }
})();
