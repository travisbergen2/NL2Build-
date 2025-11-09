const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const buildService = require('../services/buildService');
const { getBuildStatus, updateBuildStatus, BuildStatus } = require('../models/buildJob');

// Submit a new build
router.post('/', async (req, res) => {
  try {
    const { projectId, buildJobId, projectStructure } = req.body;

    if (!projectId || !buildJobId || !projectStructure) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['projectId', 'buildJobId', 'projectStructure']
      });
    }

    // Initialize build job
    updateBuildStatus(buildJobId, {
      projectId,
      buildJobId,
      status: BuildStatus.BUILDING,
      progress: 0,
      message: 'Build job queued'
    });

    // Start build process asynchronously
    buildService.buildProject(projectId, buildJobId, projectStructure)
      .catch(error => {
        console.error('Build error:', error);
        updateBuildStatus(buildJobId, {
          projectId,
          buildJobId,
          status: BuildStatus.FAILED,
          progress: 0,
          message: 'Build failed',
          error: error.message
        });
      });

    // Return immediate response
    res.json({
      projectId,
      buildJobId,
      status: BuildStatus.BUILDING,
      progress: 0,
      message: 'Build started'
    });

  } catch (error) {
    console.error('Build submission error:', error);
    res.status(500).json({
      error: 'Failed to submit build',
      message: error.message
    });
  }
});

// Get build status
router.get('/:buildJobId/status', (req, res) => {
  try {
    const { buildJobId } = req.params;
    const status = getBuildStatus(buildJobId);

    if (!status) {
      return res.status(404).json({
        error: 'Build job not found',
        buildJobId
      });
    }

    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to get build status',
      message: error.message
    });
  }
});

// Download APK
router.get('/:buildJobId/apk', (req, res) => {
  try {
    const { buildJobId } = req.params;
    const apkPath = buildService.getApkPath(buildJobId);

    if (!apkPath) {
      return res.status(404).json({
        error: 'APK not found'
      });
    }

    res.download(apkPath, `app-${buildJobId}.apk`);
  } catch (error) {
    console.error('APK download error:', error);
    res.status(500).json({
      error: 'Failed to download APK',
      message: error.message
    });
  }
});

// Download AAB
router.get('/:buildJobId/aab', (req, res) => {
  try {
    const { buildJobId } = req.params;
    const aabPath = buildService.getAabPath(buildJobId);

    if (!aabPath) {
      return res.status(404).json({
        error: 'AAB not found'
      });
    }

    res.download(aabPath, `app-${buildJobId}.aab`);
  } catch (error) {
    console.error('AAB download error:', error);
    res.status(500).json({
      error: 'Failed to download AAB',
      message: error.message
    });
  }
});

module.exports = router;
