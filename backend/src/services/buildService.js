const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { updateBuildStatus, BuildStatus } = require('../models/buildJob');

const execAsync = promisify(exec);

const WORKSPACE_DIR = path.join(__dirname, '../../workspace');
const OUTPUT_DIR = path.join(__dirname, '../../output');

class BuildService {
  async buildProject(projectId, buildJobId, projectStructure) {
    const projectDir = path.join(WORKSPACE_DIR, buildJobId);
    const outputDir = path.join(OUTPUT_DIR, buildJobId);

    try {
      // Step 1: Create project directory
      updateBuildStatus(buildJobId, {
        status: BuildStatus.BUILDING,
        progress: 10,
        message: 'Setting up project structure...'
      });

      await fs.ensureDir(projectDir);
      await fs.ensureDir(outputDir);

      // Step 2: Write all project files
      updateBuildStatus(buildJobId, {
        progress: 20,
        message: 'Writing project files...'
      });

      await this.writeProjectFiles(projectDir, projectStructure.files);

      // Step 3: Create gradle wrapper if not present
      updateBuildStatus(buildJobId, {
        progress: 30,
        message: 'Setting up Gradle...'
      });

      await this.setupGradle(projectDir);

      // Step 4: Build the project
      updateBuildStatus(buildJobId, {
        progress: 40,
        message: 'Building APK...'
      });

      await this.buildApk(projectDir, buildJobId);

      // Step 5: Build AAB (App Bundle)
      updateBuildStatus(buildJobId, {
        progress: 60,
        message: 'Building AAB...'
      });

      await this.buildAab(projectDir, buildJobId);

      // Step 6: Sign the APK and AAB
      updateBuildStatus(buildJobId, {
        status: BuildStatus.SIGNING,
        progress: 80,
        message: 'Signing APK and AAB...'
      });

      const apkPath = await this.signApk(projectDir, outputDir, buildJobId);
      const aabPath = await this.signAab(projectDir, outputDir, buildJobId);

      // Step 7: Done
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      updateBuildStatus(buildJobId, {
        status: BuildStatus.READY,
        progress: 100,
        message: 'Build completed successfully!',
        apkUrl: `${baseUrl}/api/build/${buildJobId}/apk`,
        aabUrl: `${baseUrl}/api/build/${buildJobId}/aab`
      });

      // Cleanup project directory (keep output)
      await fs.remove(projectDir);

    } catch (error) {
      console.error('Build error:', error);
      updateBuildStatus(buildJobId, {
        status: BuildStatus.FAILED,
        progress: 0,
        message: 'Build failed',
        error: error.message
      });
      throw error;
    }
  }

  async writeProjectFiles(projectDir, files) {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf8');
    }
  }

  async setupGradle(projectDir) {
    // Copy gradle wrapper from template or download it
    const gradleWrapperDir = path.join(__dirname, '../templates/gradle-wrapper');

    if (await fs.pathExists(gradleWrapperDir)) {
      await fs.copy(gradleWrapperDir, path.join(projectDir, 'gradle'));
      await fs.copy(
        path.join(__dirname, '../templates/gradlew'),
        path.join(projectDir, 'gradlew')
      );
      await fs.chmod(path.join(projectDir, 'gradlew'), '755');
    } else {
      // Download gradle wrapper
      await execAsync('gradle wrapper', { cwd: projectDir });
    }
  }

  async buildApk(projectDir, buildJobId) {
    try {
      const { stdout, stderr } = await execAsync(
        './gradlew assembleRelease',
        {
          cwd: projectDir,
          env: { ...process.env, ANDROID_HOME: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME }
        }
      );
      console.log('APK build output:', stdout);
      if (stderr) console.error('APK build errors:', stderr);
    } catch (error) {
      throw new Error(`APK build failed: ${error.message}`);
    }
  }

  async buildAab(projectDir, buildJobId) {
    try {
      const { stdout, stderr } = await execAsync(
        './gradlew bundleRelease',
        {
          cwd: projectDir,
          env: { ...process.env, ANDROID_HOME: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME }
        }
      );
      console.log('AAB build output:', stdout);
      if (stderr) console.error('AAB build errors:', stderr);
    } catch (error) {
      throw new Error(`AAB build failed: ${error.message}`);
    }
  }

  /**
   * Resolve the signing configuration from environment variables.
   *
   * IMPORTANT: This deliberately THROWS when signing is not configured.
   * We must never return an unsigned artifact as if it were a signed
   * release build. A build that cannot be honestly signed must fail.
   */
  getSigningConfig() {
    const keystorePath = process.env.KEYSTORE_PATH;
    const keystorePassword = process.env.KEYSTORE_PASSWORD;
    const keyAlias = process.env.KEY_ALIAS;
    // If a separate key password is not provided, fall back to the store password.
    const keyPassword = process.env.KEY_PASSWORD || keystorePassword;

    if (!keystorePath || !keystorePassword || !keyAlias) {
      throw new Error(
        'Release signing is not configured. Set KEYSTORE_PATH, KEYSTORE_PASSWORD and KEY_ALIAS ' +
        '(and optionally KEY_PASSWORD) before requesting a release build. ' +
        'Refusing to return an unsigned artifact as a signed release.'
      );
    }
    if (!fs.pathExistsSync(keystorePath)) {
      throw new Error(`Keystore not found at KEYSTORE_PATH=${keystorePath}`);
    }
    return { keystorePath, keystorePassword, keyAlias, keyPassword };
  }

  /**
   * Locate an Android build-tool (e.g. apksigner) inside the installed SDK,
   * preferring the highest available build-tools version. Falls back to
   * assuming the tool is on PATH.
   */
  resolveBuildTool(tool) {
    const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
    if (sdk) {
      const buildToolsDir = path.join(sdk, 'build-tools');
      if (fs.pathExistsSync(buildToolsDir)) {
        const versions = fs.readdirSync(buildToolsDir).sort().reverse();
        for (const version of versions) {
          const candidate = path.join(buildToolsDir, version, tool);
          if (fs.pathExistsSync(candidate)) {
            return candidate;
          }
        }
      }
    }
    return tool;
  }

  /**
   * Sign the release APK with a real keystore using apksigner, then verify
   * the signature. If verification fails, the build fails — we never hand
   * back an artifact we could not prove is signed.
   */
  async signApk(projectDir, outputDir, buildJobId) {
    const unsignedApk = path.join(projectDir, 'app/build/outputs/apk/release/app-release-unsigned.apk');
    const altApk = path.join(projectDir, 'app/build/outputs/apk/release/app-release.apk');
    const inputApk = (await fs.pathExists(unsignedApk))
      ? unsignedApk
      : (await fs.pathExists(altApk)) ? altApk : null;

    if (!inputApk) {
      throw new Error('APK not found after build');
    }

    const signing = this.getSigningConfig();
    const apksigner = this.resolveBuildTool('apksigner');
    const signedApkPath = path.join(outputDir, `app-${buildJobId}.apk`);

    // Copy the built APK to the output location, then sign it in place.
    await fs.copy(inputApk, signedApkPath);

    await execAsync(
      `"${apksigner}" sign ` +
      `--ks "${signing.keystorePath}" ` +
      `--ks-pass pass:"${signing.keystorePassword}" ` +
      `--ks-key-alias "${signing.keyAlias}" ` +
      `--key-pass pass:"${signing.keyPassword}" ` +
      `"${signedApkPath}"`
    );

    // Verify the signature. If this throws, the caller reports a FAILED build.
    await execAsync(`"${apksigner}" verify "${signedApkPath}"`);

    return signedApkPath;
  }

  /**
   * Sign the release AAB. App Bundles are signed with jarsigner (apksigner
   * does not support .aab). Same honesty rule: no keystore -> hard failure.
   */
  async signAab(projectDir, outputDir, buildJobId) {
    const aabPath = path.join(projectDir, 'app/build/outputs/bundle/release/app-release.aab');
    if (!(await fs.pathExists(aabPath))) {
      throw new Error('AAB not found after build');
    }

    const signing = this.getSigningConfig();
    const signedAabPath = path.join(outputDir, `app-${buildJobId}.aab`);

    await fs.copy(aabPath, signedAabPath);

    await execAsync(
      `jarsigner -keystore "${signing.keystorePath}" ` +
      `-storepass "${signing.keystorePassword}" ` +
      `-keypass "${signing.keyPassword}" ` +
      `"${signedAabPath}" "${signing.keyAlias}"`
    );

    return signedAabPath;
  }

  getApkPath(buildJobId) {
    const apkPath = path.join(OUTPUT_DIR, buildJobId, `app-${buildJobId}.apk`);
    return fs.pathExistsSync(apkPath) ? apkPath : null;
  }

  getAabPath(buildJobId) {
    const aabPath = path.join(OUTPUT_DIR, buildJobId, `app-${buildJobId}.aab`);
    return fs.pathExistsSync(aabPath) ? aabPath : null;
  }
}

module.exports = new BuildService();
