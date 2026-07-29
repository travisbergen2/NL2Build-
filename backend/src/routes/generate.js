/**
 * POST /api/generate — full prompt-to-signed-build pipeline, server-side.
 *
 * Body: { description: string, packageName?: string }
 * Response: { projectId, buildJobId, status, ... } (poll /api/build/:id/status)
 *
 * Orchestration: generate (chunked, per-file) -> build -> on compile failure,
 * repair round (max NL2B_MAX_REPAIRS, default 2) -> rebuild. The route never
 * edits code itself; it only transports content between the model and the
 * build service. Builds are serialized through a queue of one — Gradle builds
 * cannot safely overlap on small hosts (measured: daemon OOM at 4GB).
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const buildService = require('./../services/buildService');
const { GenerationService, GenerationError } = require('../services/generationService');
const { getBuildStatus, updateBuildStatus, BuildStatus } = require('../models/buildJob');

const MAX_REPAIRS = parseInt(process.env.NL2B_MAX_REPAIRS || '2', 10);

// Minimal queue-of-1: builds (and their generation) run strictly one at a time.
let chain = Promise.resolve();
function enqueue(task) {
  const next = chain.then(task, task);
  chain = next.catch(() => {});
  return next;
}

router.post('/', async (req, res) => {
  const { description, packageName } = req.body || {};
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'description (string, >=10 chars) is required' });
  }

  const projectId = uuidv4();
  const buildJobId = uuidv4();
  const pkg = packageName || `com.nl2b.a${buildJobId.slice(0, 8)}`;

  updateBuildStatus(buildJobId, {
    projectId,
    buildJobId,
    status: BuildStatus.BUILDING,
    progress: 0,
    message: 'Queued for generation',
  });

  enqueue(() => runPipeline(projectId, buildJobId, description.trim(), pkg)).catch((err) => {
    console.error('Pipeline error:', err);
    updateBuildStatus(buildJobId, {
      status: BuildStatus.FAILED,
      progress: 0,
      message: err instanceof GenerationError ? `Generation failed (${err.stage})` : 'Pipeline failed',
      error: err.message,
    });
  });

  res.json({ projectId, buildJobId, status: BuildStatus.BUILDING, progress: 0, message: 'Generation started' });
});

async function runPipeline(projectId, buildJobId, description, packageName) {
  const gen = new GenerationService();

  updateBuildStatus(buildJobId, { progress: 5, message: 'Generating project (chunked, per-file)...' });
  let { files, meta } = await gen.generateProject(description, packageName);

  let attempt = 0;
  // First attempt + up to MAX_REPAIRS repair rounds.
  for (;;) {
    updateBuildStatus(buildJobId, {
      progress: 10,
      message: attempt === 0 ? 'Building generated project...' : `Rebuilding after repair round ${attempt}...`,
    });
    try {
      await buildService.buildProject(projectId, buildJobId, { files, dependencies: [] });
      // buildService sets READY on success.
      const st = getBuildStatus(buildJobId) || {};
      updateBuildStatus(buildJobId, {
        message: `${st.message || 'Build completed successfully!'} (repairRounds=${attempt}, model=${meta.model})`,
      });
      return;
    } catch (err) {
      const errorText = err && err.message ? err.message : String(err);
      const isCompileError = /compile|Compilation error|assembleRelease|bundleRelease/i.test(errorText);
      if (!isCompileError || attempt >= MAX_REPAIRS) throw err;
      attempt += 1;
      updateBuildStatus(buildJobId, {
        status: BuildStatus.BUILDING,
        progress: 8,
        message: `Compile failed — repair round ${attempt}/${MAX_REPAIRS}...`,
      });
      const repaired = await gen.repairProject(description, packageName, files, errorText);
      files = repaired.files;
    }
  }
}

module.exports = router;
