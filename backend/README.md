# NL2Build Backend

Backend service for NL2Build that handles Android app building, signing, and packaging.

## Features

- RESTful API for build job management
- Automated Android app compilation
- APK and AAB generation
- Build status tracking
- Artifact storage and delivery

## Setup

### Using Docker (Recommended)

```bash
# Build the image
docker build -t nl2build-backend .

# Run the container
docker run -p 3000:3000 \
  -e BASE_URL=http://your-domain.com \
  -e PORT=3000 \
  nl2build-backend
```

### Manual Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Android SDK**:
   - Download from: https://developer.android.com/studio
   - Set `ANDROID_SDK_ROOT` environment variable

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start Server**:
   ```bash
   npm start
   ```

## API Documentation

### POST /api/build

Submit a new build job.

**Request Body**:
```json
{
  "projectId": "uuid",
  "buildJobId": "uuid",
  "projectStructure": {
    "files": {
      "app/build.gradle.kts": "...",
      "app/src/main/AndroidManifest.xml": "..."
    },
    "dependencies": ["androidx.core:core-ktx:1.12.0"]
  }
}
```

**Response**:
```json
{
  "projectId": "uuid",
  "buildJobId": "uuid",
  "status": "BUILDING",
  "progress": 0,
  "message": "Build started"
}
```

### GET /api/build/:buildJobId/status

Get build job status.

**Response**:
```json
{
  "projectId": "uuid",
  "buildJobId": "uuid",
  "status": "READY",
  "progress": 100,
  "message": "Build completed",
  "apkUrl": "http://example.com/api/build/uuid/apk",
  "aabUrl": "http://example.com/api/build/uuid/aab"
}
```

### GET /api/build/:buildJobId/apk

Download the built APK file.

### GET /api/build/:buildJobId/aab

Download the built AAB file.

## Environment Variables

```env
PORT=3000                          # Server port
NODE_ENV=production                # Environment
BASE_URL=http://localhost:3000     # Base URL for download links
ANDROID_SDK_ROOT=/path/to/sdk      # Android SDK location
```

## Build Process

1. **Receive build request** with project structure
2. **Create temporary workspace** for the project
3. **Write all project files** from the structure
4. **Set up Gradle** wrapper
5. **Build APK** using `./gradlew assembleRelease`
6. **Build AAB** using `./gradlew bundleRelease`
7. **Sign artifacts** (currently copies unsigned for testing)
8. **Store in output directory**
9. **Cleanup workspace**
10. **Serve download links**

## Production Considerations

### Signing

Currently, the service copies unsigned builds. For production:

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in environment:
   ```env
   KEYSTORE_PATH=/path/to/release.keystore
   KEYSTORE_PASSWORD=your_password
   KEY_ALIAS=my-key-alias
   KEY_PASSWORD=your_key_password
   ```

3. Update `buildService.js` to use `jarsigner` or `apksigner`

### Persistence

Current implementation uses in-memory storage. For production:

- Use PostgreSQL, MongoDB, or Redis for build job tracking
- Use S3, GCS, or similar for artifact storage
- Implement cleanup jobs for old builds

### Scalability

- Use a job queue (Bull, RabbitMQ) for build distribution
- Deploy multiple backend instances
- Use container orchestration (Kubernetes, ECS)
- Implement build caching

### Monitoring

- Add logging (Winston, Bunyan)
- Add metrics (Prometheus)
- Add tracing (OpenTelemetry)
- Set up alerts for build failures

## Troubleshooting

### Build fails with "Android SDK not found"

Set the `ANDROID_SDK_ROOT` environment variable:
```bash
export ANDROID_SDK_ROOT=/path/to/android/sdk
```

### Permission denied on gradlew

Make sure gradlew is executable:
```bash
chmod +x gradlew
```

### Out of memory during build

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## License

MIT
