const fs = require('fs-extra');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, '../../workspace');
const OUTPUT_DIR = path.join(__dirname, '../../output');

function initializeDirectories() {
  fs.ensureDirSync(WORKSPACE_DIR);
  fs.ensureDirSync(OUTPUT_DIR);
  console.log('Initialized workspace and output directories');
}

module.exports = {
  initializeDirectories,
  WORKSPACE_DIR,
  OUTPUT_DIR
};
