/**
 * workerClient — alternative generation backend: a webhook-invoked Hyperagent
 * worker agent ("Forge Worker") instead of the direct Anthropic API.
 *
 * Why: routes generation spend through prepaid platform credits, and removes
 * the ANTHROPIC_API_KEY requirement from the build box entirely. The wire
 * path is under registered test E-NL2B-2c (frozen 2026-07-29); the beta must
 * not ship on this path until that test passes its gate.
 *
 * Call contract (must stay in sync with the Forge Worker agent's system
 * prompt and the E-NL2B-2c protocol doc):
 *   POST <webhookUrl>  body: { kind, description, packageName,
 *                              manifest?, targetPath?, currentContent?, errorTail? }
 *   kind=manifest -> body of reply is ONLY a JSON array of file paths
 *   kind=file     -> body of reply is ONLY raw file content for targetPath
 *   kind=repair   -> body of reply is ONLY corrected raw content for targetPath
 *
 * Response-shape tolerance: the G2c plumbing gate records whether the webhook
 * returns the agent's text synchronously and in what envelope. This client
 * accepts either a raw text body or a JSON envelope with the reply under one
 * of: result, content, text, message, output, response.
 */

const { GenerationService, GenerationError } = require('./generationService');

const ENVELOPE_KEYS = ['result', 'content', 'text', 'message', 'output', 'response'];

function extractReply(bodyText) {
  const trimmed = (bodyText || '').trim();
  if (!trimmed) return '';
  // Try JSON envelope first; fall back to raw text.
  try {
    const obj = JSON.parse(trimmed);
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return trimmed; // a manifest returned as bare JSON array
    for (const k of ENVELOPE_KEYS) {
      if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k];
    }
    // JSON but no known key — return the raw text so manifest parsing can try.
    return trimmed;
  } catch {
    return trimmed;
  }
}

class WorkerGenerationService extends GenerationService {
  /**
   * @param {object} opts
   * @param {string} [opts.webhookUrl] defaults to env NL2B_WORKER_WEBHOOK_URL
   * @param {number} [opts.timeoutMs]  per-call timeout (default 30 min — agent
   *                                   runs are slower than raw API calls)
   * @param {function} [opts.fetchImpl]
   */
  constructor(opts = {}) {
    super({ apiKey: 'unused-worker-path', model: 'hyperagent-worker', fetchImpl: opts.fetchImpl });
    this.webhookUrl = opts.webhookUrl || process.env.NL2B_WORKER_WEBHOOK_URL;
    this.timeoutMs = opts.timeoutMs || parseInt(process.env.NL2B_WORKER_TIMEOUT_MS || String(30 * 60 * 1000), 10);
  }

  requireWebhook() {
    if (!this.webhookUrl) {
      throw new GenerationError(
        'api',
        'NL2B_WORKER_WEBHOOK_URL is not configured. The worker generation backend is unavailable.'
      );
    }
  }

  async callWorker(payload) {
    this.requireWebhook();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res;
    try {
      res = await this.fetchImpl(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (e) {
      throw new GenerationError('webhook-transport', `worker webhook call failed: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GenerationError('webhook-transport', `worker webhook HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    const reply = extractReply(await res.text());
    if (!reply) throw new GenerationError('webhook-transport', 'worker webhook returned an empty reply');
    if (reply.startsWith('ERROR:')) throw new GenerationError('file-generation', `worker rejected job: ${reply}`);
    return reply;
  }

  async generateProject(description, packageName = 'com.nl2b.app') {
    const meta = { model: 'hyperagent-worker', calls: [], formatDeviations: [], designLimitEvents: [] };

    const manifestReply = await this.callWorker({ kind: 'manifest', description, packageName });
    meta.calls.push({ kind: 'manifest' });
    const manifest = this.parseManifest(manifestReply, packageName);

    const files = {};
    for (const path of manifest) {
      const reply = await this.callWorker({
        kind: 'file',
        description,
        packageName,
        manifest,
        targetPath: path,
      });
      meta.calls.push({ kind: 'file', path });
      const stripped = require('./generationService').stripFences(reply);
      if (stripped.fenced) meta.formatDeviations.push(path);
      if (!stripped.content) throw new GenerationError('file-generation', `empty content for ${path}`);
      files[path] = stripped.content + '\n';
    }
    return { files, meta };
  }

  async repairProject(description, packageName, files, errorTail) {
    const targets = this.filesNamedInError(errorTail, files);
    const updated = { ...files };
    const tail = errorTail.split('\n').slice(-60).join('\n');
    for (const path of targets) {
      const reply = await this.callWorker({
        kind: 'repair',
        description,
        packageName,
        targetPath: path,
        currentContent: files[path],
        errorTail: tail,
      });
      const { content } = require('./generationService').stripFences(reply);
      if (content) updated[path] = content + '\n';
    }
    return { files: updated, repairedPaths: targets };
  }
}

/** Factory used by the generate route: picks the backend from env. */
function createGenerationBackend() {
  const backend = (process.env.NL2B_BACKEND || 'api').toLowerCase();
  if (backend === 'worker') return new WorkerGenerationService();
  return new GenerationService();
}

module.exports = { WorkerGenerationService, createGenerationBackend, extractReply };
