/**
 * generationService — server-side chunked project generation.
 *
 * Replaces the client-side single-response design (one 4096-token JSON for a
 * whole project — measured 0/7 first-attempt success, E-NL2B-1 2026-07-29)
 * with the chunked per-file protocol validated in E-NL2B-2 (6/8 first-attempt,
 * 8/8 after one repair round).
 *
 * Protocol (frozen in "E-NL2B-2b Protocol" doc — keep code and doc in sync):
 *   1. MANIFEST call: description -> JSON array of project-relative paths.
 *   2. One call PER FILE: description + manifest + path -> raw file content.
 *   3. Repair round (caller-orchestrated, max 2): gradle error tail + failing
 *      file content -> corrected raw file content. Only files named in the
 *      error may be modified.
 *
 * Moving generation server-side also removes the BYO-API-key requirement from
 * the Android client: the key lives in the backend env (ANTHROPIC_API_KEY).
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODELS_API = 'https://api.anthropic.com/v1/models?limit=50';
const ANTHROPIC_VERSION = '2023-06-01';

// Per-call output budgets. The design fix: budgets are per FILE, never per
// project. (The shipped defect was max_tokens 4096 for an entire project.)
const MANIFEST_MAX_TOKENS = 8192;
const FILE_MAX_TOKENS = 8192;

// Frozen toolchain pins (E-NL2B-2/2b). Builds fail if generation deviates.
const TOOLCHAIN_PINS = `
HARD TOOLCHAIN PINS (the build machine has ONLY these — deviating fails the build):
- AGP 8.2.0, Kotlin 1.9.20, compileSdk 34, minSdk 26, targetSdk 34
- Jetpack Compose, composeOptions kotlinCompilerExtensionVersion = "1.5.5"
- Compose BOM 2023.10.01; prefer BOM-managed artifacts without explicit versions
- Java/Kotlin target 17
- Repositories: google() and mavenCentral() ONLY (settings.gradle.kts with FAIL_ON_PROJECT_REPOS)
- Release buildType with isMinifyEnabled = false. Do NOT add a signingConfig — signing happens externally.
- AndroidManifest: MainActivity exported=true with MAIN/LAUNCHER intent filter; use a theme you define or @android:style/Theme.Material.Light.NoActionBar.`;

// Frozen prompt guards — the two constants E-NL2B-2 taught (its only compile
// failures were un-opted-in experimental Material3 APIs; its only OOM came
// from material-icons-extended).
const PROMPT_GUARDS = `
MANDATORY GUARDS:
- Any use of experimental Material3 APIs (TopAppBar, etc.) MUST carry @OptIn(ExperimentalMaterial3Api::class) with the matching import — or use stable equivalents.
- Do NOT use material-icons-extended; core icons or text only.
- Keep the project minimal: every extra dependency is compile risk. Single-activity pure Compose; no navigation library unless the app needs multiple screens.
- Reference no resource you do not also generate.`;

const REQUIRED_MANIFEST_MEMBERS = [
  'settings.gradle.kts',
  'build.gradle.kts',
  'gradle.properties',
  'app/build.gradle.kts',
  'app/src/main/AndroidManifest.xml',
];

class GenerationError extends Error {
  constructor(stage, message) {
    super(message);
    this.stage = stage; // 'manifest-parse' | 'file-generation' | 'api'
  }
}

/**
 * Strip markdown code fences if the model wrapped its output despite
 * instructions. Logged by callers as a format deviation, not a failure.
 */
function stripFences(text) {
  const t = text.trim();
  if (!t.startsWith('```')) return { content: text.trim(), fenced: false };
  const stripped = t
    .replace(/^```[a-zA-Z0-9]*\s*\n?/, '')
    .replace(/\n?```\s*$/, '');
  return { content: stripped.trim(), fenced: true };
}

class GenerationService {
  /**
   * @param {object} opts
   * @param {string} [opts.apiKey]    defaults to env ANTHROPIC_API_KEY
   * @param {string} [opts.model]     defaults to env NL2B_MODEL, else resolved
   *                                  from /v1/models (newest sonnet-class)
   * @param {function} [opts.fetchImpl] injectable for tests; defaults to global fetch
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = opts.model || process.env.NL2B_MODEL || null;
    this.fetchImpl = opts.fetchImpl || fetch;
  }

  requireKey() {
    if (!this.apiKey) {
      throw new GenerationError(
        'api',
        'ANTHROPIC_API_KEY is not configured on the server. Generation is unavailable.'
      );
    }
  }

  /** Resolve the newest sonnet-class model the key can list; cache it. */
  async resolveModel() {
    if (this.model) return this.model;
    this.requireKey();
    const res = await this.fetchImpl(ANTHROPIC_MODELS_API, {
      headers: { 'x-api-key': this.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
    });
    if (!res.ok) {
      throw new GenerationError('api', `model list failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const ids = (data.data || []).map((m) => m.id);
    const sonnet = ids.find((id) => id.includes('sonnet'));
    if (!sonnet) throw new GenerationError('api', `no sonnet-class model available in: ${ids.join(', ')}`);
    this.model = sonnet;
    return sonnet;
  }

  async callModel(prompt, maxTokens) {
    this.requireKey();
    const model = await this.resolveModel();
    const res = await this.fetchImpl(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new GenerationError('api', `API call failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text' || b.text)
      .map((b) => b.text || '')
      .join('');
    return { text, stopReason: data.stop_reason, usage: data.usage || {} };
  }

  buildManifestPrompt(description, packageName) {
    return `You are an expert Android developer planning a minimal, compilable Jetpack Compose project.

APP DESCRIPTION:
${description}

Package name: ${packageName}
${TOOLCHAIN_PINS}
${PROMPT_GUARDS}

Return ONLY a JSON array of the project-relative file paths this project needs — no file contents, no commentary. The array MUST include: ${REQUIRED_MANIFEST_MEMBERS.join(', ')}, and at least one Kotlin source file under app/src/main/java/${packageName.replace(/\./g, '/')}/.`;
  }

  buildFilePrompt(description, packageName, manifest, targetPath) {
    return `You are an expert Android developer generating ONE file of a minimal Jetpack Compose project.

APP DESCRIPTION:
${description}

Package name: ${packageName}
${TOOLCHAIN_PINS}
${PROMPT_GUARDS}

FULL PROJECT FILE MANIFEST (for cross-file consistency — imports, class names, resources):
${manifest.map((p) => `- ${p}`).join('\n')}

TARGET FILE: ${targetPath}

Output ONLY the raw content of ${targetPath}. No code fences, no commentary, no explanations — the response body IS the file.`;
  }

  buildRepairPrompt(description, packageName, targetPath, currentContent, errorTail) {
    return `You are a compile-repair agent. A generated Android project failed to compile. Fix ONLY the compile error in this one file — do not restructure, do not add features.

APP DESCRIPTION (unchanged):
${description}

Package name: ${packageName}
${TOOLCHAIN_PINS}
${PROMPT_GUARDS}

GRADLE ERROR (tail):
${errorTail}

CURRENT CONTENT OF ${targetPath}:
${currentContent}

Output ONLY the corrected raw content of ${targetPath}. No code fences, no commentary — the response body IS the file.`;
  }

  parseManifest(text, packageName) {
    const { content } = stripFences(text);
    let arr;
    try {
      arr = JSON.parse(content);
    } catch (e) {
      throw new GenerationError('manifest-parse', `manifest is not valid JSON: ${e.message}`);
    }
    if (!Array.isArray(arr) || arr.length === 0 || !arr.every((x) => typeof x === 'string')) {
      throw new GenerationError('manifest-parse', 'manifest must be a non-empty array of path strings');
    }
    for (const required of REQUIRED_MANIFEST_MEMBERS) {
      if (!arr.includes(required)) {
        throw new GenerationError('manifest-parse', `manifest missing required file: ${required}`);
      }
    }
    const ktPrefix = `app/src/main/java/${packageName.replace(/\./g, '/')}/`;
    if (!arr.some((p) => p.startsWith(ktPrefix) && p.endsWith('.kt'))) {
      throw new GenerationError('manifest-parse', `manifest has no Kotlin source under ${ktPrefix}`);
    }
    return arr;
  }

  /**
   * Generate a complete project: manifest call, then one call per file.
   * @returns {{ files: Object<string,string>, meta: object }}
   */
  async generateProject(description, packageName = 'com.nl2b.app') {
    const meta = { model: null, calls: [], formatDeviations: [], designLimitEvents: [] };

    const manifestResp = await this.callModel(
      this.buildManifestPrompt(description, packageName),
      MANIFEST_MAX_TOKENS
    );
    meta.model = this.model;
    meta.calls.push({ kind: 'manifest', stopReason: manifestResp.stopReason, usage: manifestResp.usage });
    const manifest = this.parseManifest(manifestResp.text, packageName);

    const files = {};
    for (const path of manifest) {
      const resp = await this.callModel(
        this.buildFilePrompt(description, packageName, manifest, path),
        FILE_MAX_TOKENS
      );
      meta.calls.push({ kind: 'file', path, stopReason: resp.stopReason, usage: resp.usage });
      if (resp.stopReason === 'max_tokens') {
        // Logged even if the truncated file happens to compile (design-limit event).
        meta.designLimitEvents.push(path);
      }
      const { content, fenced } = stripFences(resp.text);
      if (fenced) meta.formatDeviations.push(path);
      if (!content) throw new GenerationError('file-generation', `empty content for ${path}`);
      files[path] = content + '\n';
    }
    return { files, meta };
  }

  /**
   * Extract file paths named in a gradle error tail that exist in the project.
   * Falls back to the main activity / all .kt files when none are named.
   */
  filesNamedInError(errorTail, files) {
    const named = new Set();
    for (const path of Object.keys(files)) {
      const base = path.split('/').pop();
      if (errorTail.includes(path) || errorTail.includes(base)) named.add(path);
    }
    if (named.size === 0) {
      for (const path of Object.keys(files)) {
        if (path.endsWith('.kt')) named.add(path);
      }
    }
    return [...named];
  }

  /**
   * One repair round: regenerate only files named in the error.
   * Returns the updated files map (new object; input not mutated).
   */
  async repairProject(description, packageName, files, errorTail) {
    const targets = this.filesNamedInError(errorTail, files);
    const updated = { ...files };
    const tail = errorTail.split('\n').slice(-60).join('\n');
    for (const path of targets) {
      const resp = await this.callModel(
        this.buildRepairPrompt(description, packageName, path, files[path], tail),
        FILE_MAX_TOKENS
      );
      const { content } = stripFences(resp.text);
      if (content) updated[path] = content + '\n';
    }
    return { files: updated, repairedPaths: targets };
  }
}

module.exports = { GenerationService, GenerationError, stripFences, REQUIRED_MANIFEST_MEMBERS };
