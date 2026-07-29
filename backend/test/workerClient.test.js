/**
 * Unit tests for workerClient — mocked webhook via injected fetch.
 * Run: npm test
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { WorkerGenerationService, createGenerationBackend, extractReply } = require('../src/services/workerClient');
const { GenerationError, REQUIRED_MANIFEST_MEMBERS } = require('../src/services/generationService');

const PKG = 'com.nl2b.testapp';
const KT_PATH = `app/src/main/java/${PKG.replace(/\./g, '/')}/MainActivity.kt`;
const GOOD_MANIFEST = [...REQUIRED_MANIFEST_MEMBERS, KT_PATH];

function mockWebhook(replies) {
  let call = 0;
  const calls = [];
  const impl = async (url, opts = {}) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    const r = replies[Math.min(call, replies.length - 1)];
    call += 1;
    if (r.httpError) return { ok: false, status: r.httpError, text: async () => r.text || 'err' };
    if (r.reject) throw new Error(r.reject);
    return { ok: true, text: async () => r.text };
  };
  impl.calls = calls;
  return impl;
}

test('extractReply: raw text body passes through', () => {
  assert.equal(extractReply('plugins { }'), 'plugins { }');
});

test('extractReply: JSON envelope under known keys is unwrapped', () => {
  assert.equal(extractReply(JSON.stringify({ result: 'file content' })), 'file content');
  assert.equal(extractReply(JSON.stringify({ output: 'x' })), 'x');
});

test('extractReply: bare JSON array (manifest) stays as raw JSON text', () => {
  const arr = JSON.stringify(GOOD_MANIFEST);
  assert.equal(extractReply(arr), arr);
});

test('missing webhook URL raises GenerationError(stage=api)', async () => {
  const saved = process.env.NL2B_WORKER_WEBHOOK_URL;
  delete process.env.NL2B_WORKER_WEBHOOK_URL;
  try {
    const svc = new WorkerGenerationService({ fetchImpl: mockWebhook([]) });
    await assert.rejects(
      () => svc.generateProject('a counter app', PKG),
      (e) => e instanceof GenerationError && e.stage === 'api'
    );
  } finally {
    if (saved !== undefined) process.env.NL2B_WORKER_WEBHOOK_URL = saved;
  }
});

test('generateProject: manifest job + one job per file over the webhook', async () => {
  const replies = [
    { text: JSON.stringify(GOOD_MANIFEST) },
    ...GOOD_MANIFEST.map((p) => ({ text: `// content of ${p}` })),
  ];
  const fetchImpl = mockWebhook(replies);
  const svc = new WorkerGenerationService({ webhookUrl: 'https://wh.example/x', fetchImpl });
  const { files, meta } = await svc.generateProject('a tap counter app', PKG);

  assert.equal(Object.keys(files).length, GOOD_MANIFEST.length);
  assert.ok(files[KT_PATH].includes('// content of'));
  assert.equal(fetchImpl.calls.length, 1 + GOOD_MANIFEST.length);
  assert.equal(fetchImpl.calls[0].body.kind, 'manifest');
  assert.equal(fetchImpl.calls[1].body.kind, 'file');
  assert.deepEqual(fetchImpl.calls[1].body.manifest, GOOD_MANIFEST);
  assert.equal(meta.model, 'hyperagent-worker');
});

test('generateProject: worker ERROR reply surfaces as file-generation failure', async () => {
  const svc = new WorkerGenerationService({
    webhookUrl: 'https://wh.example/x',
    fetchImpl: mockWebhook([{ text: 'ERROR: malformed job payload' }]),
  });
  await assert.rejects(
    () => svc.generateProject('a counter app', PKG),
    (e) => e instanceof GenerationError && e.stage === 'file-generation'
  );
});

test('generateProject: webhook HTTP error is stage webhook-transport', async () => {
  const svc = new WorkerGenerationService({
    webhookUrl: 'https://wh.example/x',
    fetchImpl: mockWebhook([{ httpError: 502, text: 'bad gateway' }]),
  });
  await assert.rejects(
    () => svc.generateProject('a counter app', PKG),
    (e) => e instanceof GenerationError && e.stage === 'webhook-transport'
  );
});

test('generateProject: network rejection is stage webhook-transport', async () => {
  const svc = new WorkerGenerationService({
    webhookUrl: 'https://wh.example/x',
    fetchImpl: mockWebhook([{ reject: 'socket hang up' }]),
  });
  await assert.rejects(
    () => svc.generateProject('a counter app', PKG),
    (e) => e instanceof GenerationError && e.stage === 'webhook-transport'
  );
});

test('repairProject: sends repair jobs only for error-named files', async () => {
  const files = { [KT_PATH]: 'broken', 'app/build.gradle.kts': 'gradle stuff' };
  const fetchImpl = mockWebhook([{ text: 'fixed content' }]);
  const svc = new WorkerGenerationService({ webhookUrl: 'https://wh.example/x', fetchImpl });
  const { files: updated, repairedPaths } = await svc.repairProject(
    'a notes app', PKG, files, `e: ${KT_PATH}:63:13 This material API is experimental`
  );
  assert.deepEqual(repairedPaths, [KT_PATH]);
  assert.equal(updated[KT_PATH], 'fixed content\n');
  assert.equal(fetchImpl.calls[0].body.kind, 'repair');
  assert.equal(fetchImpl.calls[0].body.currentContent, 'broken');
  assert.equal(updated['app/build.gradle.kts'], 'gradle stuff');
});

test('createGenerationBackend: env selects the backend', () => {
  const saved = process.env.NL2B_BACKEND;
  try {
    process.env.NL2B_BACKEND = 'worker';
    assert.ok(createGenerationBackend() instanceof WorkerGenerationService);
    process.env.NL2B_BACKEND = 'api';
    assert.ok(!(createGenerationBackend() instanceof WorkerGenerationService));
  } finally {
    if (saved !== undefined) process.env.NL2B_BACKEND = saved;
    else delete process.env.NL2B_BACKEND;
  }
});
