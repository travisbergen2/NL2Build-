# NL2Build Setup Guide

Complete setup guide for NL2Build from scratch.

## Prerequisites

- Computer with Android Studio installed
- Android device (Samsung S23 or any Android 8.0+ device)
- Anthropic API account
- Server for backend (or local testing)

## Step-by-Step Setup

### Part 1: Get Your Anthropic API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy the API key (starts with `sk-ant-api03-...`)
6. Save it securely - you'll need it later

### Part 2: Set Up the Backend

#### Option A: Quick Local Testing

1. **Install Node.js** (if not already installed):
   - Download from [https://nodejs.org](https://nodejs.org)
   - Install version 18 or higher

2. **Set up Android SDK** (if not using Docker):
   ```bash
   # On macOS/Linux
   export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

   # On Windows (PowerShell)
   $env:ANDROID_SDK_ROOT="C:\Users\YourUsername\AppData\Local\Android\Sdk"
   ```

3. **Start the backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

4. **Test it**:
   - Open browser to `http://localhost:3000/api/health`
   - You should see: `{"status":"OK","message":"NL2Build Backend is running"}`

#### Option B: Deploy to Cloud (Production)

##### Deploy to Google Cloud Run

```bash
cd backend

# Install Google Cloud SDK first
# Then run:
gcloud run deploy nl2build-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BASE_URL=https://your-service-url
```

Your backend URL will be something like:
`https://nl2build-backend-xxxxx-uc.a.run.app`

##### Deploy to Railway.app (Easiest)

1. Go to [https://railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your forked repository
5. Select the `backend` directory as root
6. Add environment variables:
   - `PORT=3000`
   - `BASE_URL=https://your-railway-url`
7. Deploy!

### Part 3: Build the Android App

#### Using Android Studio

1. **Open the project**:
   - Launch Android Studio
   - Click "Open"
   - Navigate to the `NL2Build-` folder
   - Click "OK"

2. **Sync Gradle**:
   - Android Studio will automatically start syncing
   - Wait for it to complete (may take a few minutes)
   - If prompted, accept any SDK installations

3. **Connect your device**:
   - Enable Developer Options on your Samsung S23:
     - Go to Settings → About Phone
     - Tap "Build Number" 7 times
     - Go back to Settings → Developer Options
     - Enable "USB Debugging"
   - Connect your phone via USB
   - Accept the debugging prompt on your phone

4. **Run the app**:
   - Click the green "Run" button in Android Studio
   - Select your Samsung S23 from the device list
   - Wait for the app to build and install

#### Using Command Line

```bash
# From project root
./gradlew assembleDebug

# Install on connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Part 4: Configure the App

1. **Launch NL2Build** on your Samsung S23

2. **Navigate to Settings** (bottom navigation bar)

3. **Enter Configuration**:
   - **Anthropic API Key**: Paste the key from Part 1
   - **Backend URL**: Enter your backend URL:
     - Local testing: `http://YOUR_COMPUTER_IP:3000/api`
     - Cloud: `https://your-backend-url.com/api`
   - Tap "Save Settings"

4. **Finding your computer's IP** (for local testing):
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet "

   # On Windows
   ipconfig
   ```
   Look for something like `192.168.1.x`

### Part 5: Create Your First App!

1. **Go to Home** tab

2. **Describe your app**:
   ```
   Create a simple note-taking app where I can:
   - Add new notes with title and content
   - Edit existing notes
   - Delete notes with a swipe gesture
   - Search through my notes
   - Use Material 3 design with a nice purple theme
   ```

3. **Tap "Generate App"**

4. **Wait** (approximately 2 minutes):
   - Layer 1 AI analyzes your description
   - Layer 2 AI generates the Android project
   - Backend builds and signs the app

5. **Install**:
   - When complete, tap "Install on Device"
   - Accept the installation prompt
   - Your generated app is now installed!

## Troubleshooting

### "Network Error" in the app

- **Local backend**: Make sure you're using your computer's IP, not `localhost`
- **Firewall**: Check that port 3000 is open
- **Same network**: Ensure phone and computer are on the same WiFi

### "Please configure your API key"

- Go to Settings tab
- Make sure API key is entered correctly
- Tap "Save Settings" button

### Backend won't start

```bash
# Check Node.js version
node --version  # Should be 18+

# Check for port conflicts
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Check Android SDK
echo $ANDROID_SDK_ROOT  # Should show path to SDK
```

### Build fails in backend

- Ensure Android SDK is installed
- Ensure `ANDROID_SDK_ROOT` is set correctly
- Check backend logs for specific errors

### App crashes on launch

- Check Android Studio Logcat
- Ensure your device is Android 8.0+ (API 26+)
- Reinstall the app

## Network Setup for Local Testing

### Option 1: USB Tethering

1. Connect phone via USB
2. Enable USB tethering on phone
3. Use `http://localhost:3000/api` as backend URL

### Option 2: WiFi (Same Network)

1. Connect phone and computer to same WiFi
2. Find computer's local IP address
3. Use `http://192.168.x.x:3000/api` as backend URL

### Option 3: ngrok (Easiest for local testing)

```bash
# Install ngrok from https://ngrok.com
ngrok http 3000
```

Use the provided HTTPS URL (e.g., `https://abc123.ngrok.io/api`) in your app settings.

## Next Steps

- Try different app descriptions
- Explore the Projects tab to see your history
- Upload AAB files to Google Play Console
- Share generated APKs with friends

## Getting Help

- Check the main [README.md](README.md)
- Open an issue on GitHub
- Check backend logs: `backend/npm-debug.log`
- Check Android logcat in Android Studio

---

Happy building! 🚀
