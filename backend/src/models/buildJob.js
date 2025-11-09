// In-memory storage for build jobs
// In production, use a database like PostgreSQL or MongoDB
const buildJobs = new Map();

const BuildStatus = {
  PENDING: 'PENDING',
  ANALYZING: 'ANALYZING',
  GENERATING: 'GENERATING',
  BUILDING: 'BUILDING',
  SIGNING: 'SIGNING',
  READY: 'READY',
  FAILED: 'FAILED',
  INSTALLING: 'INSTALLING'
};

function getBuildStatus(buildJobId) {
  return buildJobs.get(buildJobId);
}

function updateBuildStatus(buildJobId, status) {
  const existing = buildJobs.get(buildJobId) || {};
  const updated = {
    ...existing,
    ...status,
    updatedAt: Date.now()
  };
  buildJobs.set(buildJobId, updated);
  return updated;
}

function deleteBuildJob(buildJobId) {
  buildJobs.delete(buildJobId);
}

module.exports = {
  BuildStatus,
  getBuildStatus,
  updateBuildStatus,
  deleteBuildJob
};
