/**
 * Unit tests for generationService — mocked Anthropic API via injected fetch.
 * Run: npm test   (node --test, no test framework dependency)
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  GenerationService,
  GenerationError,
  stripFences,
  REQUIRED_MANIFEST_MEMBERS,
} = require('../src/services/generationService');

const PKG = 'com.nl2b.testapp';
const KT_PATH = `app/src/main/java/${PKG.replace(/\./g, '/')}/MainActivity.kt`;
const GOOD_MANIFEST = [...REQUIRED_MANIFEST_MEMBERS, KT_PATH];

/** Build a mock fetch that answers /v1/models then scripted message responses. */
function mockFetch(messageResponses) {
  let call = 0;
  const calls = [];
  const impl = async (url, opts = {}) => {
    if (String(url).includes('/v1/models')) {
      return {
        ok: true,
        json: async () => ({ data: [{ id: 'claude-opus-9' }, { id: 'claude-sonnet-9' }] }),
      };
    }
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, body });
    const r = messageResponses[Math.min(call, messageResponses.length - 1)];
    call += 1;
    if (r.httpError) {
      return { ok: false, status: r.httpError, text: async () => r.text || 'error' };
    }
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: r.text }],
        stop_reason: r.stopReason || 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    };
  };
  impl.calls = calls;
  return impl;
}

test('stripFences: passes through unfenced content', () => {
  const { content, fenced } = stripFences('plugins { }');
  assert.equal(content, 'plugins { }');
  assert.equal(fenced, false);
});

test('stripFences: strips ```kotlin fences and flags deviation', () => {
  const { content, fenced } = stripFences('```kotlin\nval x = 1\n```');
  assert.equal(content, 'val x = 1');
  assert.equal(fenced, true);
});

test('resolveModel: picks the sonnet-class model from the listing', async () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  assert.equal(await svc.resolveModel(), 'claude-sonnet-9');
});

test('resolveModel: NL2B_MODEL/ctor override wins, no API call needed', async () => {
  const svc = new GenerationService({ apiKey: 'k', model: 'claude-sonnet-42', fetchImpl: mockFetch([]) });
  assert.equal(await svc.resolveModel(), 'claude-sonnet-42');
});

test('missing API key raises GenerationError(stage=api)', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY; // isolate from the host environment
  try {
    const svc = new GenerationService({ fetchImpl: mockFetch([]) });
    await assert.rejects(
      () => svc.generateProject('a counter app', PKG),
      (e) => e instanceof GenerationError && e.stage === 'api'
    );
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('parseManifest: accepts a valid manifest (fenced)', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  const arr = svc.parseManifest('```json\n' + JSON.stringify(GOOD_MANIFEST) + '\n```', PKG);
  assert.deepEqual(arr, GOOD_MANIFEST);
});

test('parseManifest: rejects non-JSON with stage manifest-parse', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  assert.throws(
    () => svc.parseManifest('here is your project!', PKG),
    (e) => e instanceof GenerationError && e.stage === 'manifest-parse'
  );
});

test('parseManifest: rejects manifest missing required members', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  assert.throws(
    () => svc.parseManifest(JSON.stringify(['settings.gradle.kts', KT_PATH]), PKG),
    (e) => e instanceof GenerationError && e.stage === 'manifest-parse'
  );
});

test('parseManifest: rejects manifest with no Kotlin source under the package', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  assert.throws(
    () => svc.parseManifest(JSON.stringify([...REQUIRED_MANIFEST_MEMBERS]), PKG),
    (e) => e instanceof GenerationError && e.stage === 'manifest-parse'
  );
});

test('generateProject: manifest call + one call per file, files assembled', async () => {
  const responses = [
    { text: JSON.stringify(GOOD_MANIFEST) },
    ...GOOD_MANIFEST.map((p) => ({ text: `// content of ${p}` })),
  ];
  const fetchImpl = mockFetch(responses);
  const svc = new GenerationService({ apiKey: 'k', fetchImpl });
  const { files, meta } = await svc.generateProject('a tap counter app with a reset button', PKG);

  assert.equal(Object.keys(files).length, GOOD_MANIFEST.length);
  assert.ok(files[KT_PATH].includes(`// content of ${KT_PATH}`));
  // 1 manifest call + N file calls
  assert.equal(fetchImpl.calls.length, 1 + GOOD_MANIFEST.length);
  assert.equal(meta.calls[0].kind, 'manifest');
  assert.equal(meta.model, 'claude-sonnet-9');
  // per-call budget is per FILE — the design fix under test
  for (const c of fetchImpl.calls.slice(1)) assert.equal(c.body.max_tokens, 8192);
});

test('generateProject: fenced file output is stripped and logged as deviation', async () => {
  const responses = [
    { text: JSON.stringify(GOOD_MANIFEST) },
    ...GOOD_MANIFEST.map((p, i) =>
      i === 0 ? { text: '```kotlin\n// fenced content\n```' } : { text: `// content of ${p}` }
    ),
  ];
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch(responses) });
  const { files, meta } = await svc.generateProject('a notes app', PKG);
  assert.ok(files[GOOD_MANIFEST[0]].startsWith('// fenced content'));
  assert.deepEqual(meta.formatDeviations, [GOOD_MANIFEST[0]]);
});

test('generateProject: stop_reason=max_tokens recorded as design-limit event', async () => {
  const responses = [
    { text: JSON.stringify(GOOD_MANIFEST) },
    ...GOOD_MANIFEST.map((p, i) =>
      i === 1 ? { text: `// truncated ${p}`, stopReason: 'max_tokens' } : { text: `// content of ${p}` }
    ),
  ];
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch(responses) });
  const { meta } = await svc.generateProject('a timer app', PKG);
  assert.deepEqual(meta.designLimitEvents, [GOOD_MANIFEST[1]]);
});

test('generateProject: API HTTP error surfaces as GenerationError(stage=api)', async () => {
  const svc = new GenerationService({
    apiKey: 'k',
    fetchImpl: mockFetch([{ httpError: 400, text: 'credit balance is too low' }]),
  });
  await assert.rejects(
    () => svc.generateProject('a dice app', PKG),
    (e) => e instanceof GenerationError && e.stage === 'api' && /credit balance/.test(e.message)
  );
});

test('filesNamedInError: picks exactly the files the gradle error names', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  const files = { [KT_PATH]: 'x', 'app/build.gradle.kts': 'y', 'settings.gradle.kts': 'z' };
  const named = svc.filesNamedInError(`e: file:///w/${KT_PATH}:63:13 This material API is experimental`, files);
  assert.deepEqual(named, [KT_PATH]);
});

test('filesNamedInError: falls back to all .kt files when none are named', () => {
  const svc = new GenerationService({ apiKey: 'k', fetchImpl: mockFetch([]) });
  const files = { [KT_PATH]: 'x', 'app/build.gradle.kts': 'y' };
  const named = svc.filesNamedInError('Gradle build daemon disappeared unexpectedly', files);
  assert.deepEqual(named, [KT_PATH]);
});

test('repairProject: regenerates only error-named files, does not mutate input', async () => {
  const files = { [KT_PATH]: 'broken', 'app/build.gradle.kts': 'gradle stuff' };
  const svc = new GenerationService({
    apiKey: 'k',
    fetchImpl: mockFetch([{ text: 'fixed content' }]),
  });
  const { files: updated, repairedPaths } = await svc.repairProject(
    'a notes app',
    PKG,
    files,
    `e: ${KT_PATH}:63:13 This material API is experimental`
  );
  assert.deepEqual(repairedPaths, [KT_PATH]);
  assert.equal(updated[KT_PATH], 'fixed content\n');
  assert.equal(updated['app/build.gradle.kts'], 'gradle stuff'); // untouched
  assert.equal(files[KT_PATH], 'broken'); // input not mutated
});
