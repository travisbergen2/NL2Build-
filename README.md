# NL2Build - Natural Language to Android App Builder

Transform your ideas into Android apps using natural language! NL2Build uses a two-layer AI system to analyze your description, generate a complete Android project, build it, sign it, and deliver a ready-to-install app - all automatically.

## 🚀 Features

- **Natural Language Input**: Describe your app in plain English
- **Two-Layer AI System**:
  - **Layer 1 AI**: Analyzes your description and creates a structured app specification
  - **Layer 2 AI**: Generates a complete, production-ready Android project
- **Automated CI/CD**: Builds, signs, and packages your app automatically
- **Zero Configuration**: No need to handle keys, errors, or complex build processes
- **Direct Installation**: Install APK directly on your Samsung S23 or any Android device
- **Play Console Ready**: Download AAB files for Google Play Console upload

## 📱 System Architecture

```
┌─────────────────┐
│  User Input     │
│  (Natural Lang) │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Layer 1 AI    │
│  (Claude API)   │
│  Specification  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Layer 2 AI    │
│  (Claude API)   │
│  Code Generation│
└────────┬────────┘
         │
         v
┌─────────────────┐
│   CI/CD Build   │
│  (Backend)      │
│  Compile & Sign │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  APK/AAB Ready  │
│  Download/      │
│  Install        │
└─────────────────┘
```

## 📋 Prerequisites

### For the Android App:
- Android Studio (for development)
- Android device (API 26+) or emulator
- Anthropic API key ([Get one here](https://console.anthropic.com))

### For the Backend:
- Node.js 18+ (or Docker)
- Android SDK (if not using Docker)
- Java 17+

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/NL2Build-.git
cd NL2Build-
```

### 2. Set Up the Backend

#### Option A: Using Docker (Recommended)

```bash
cd backend
docker build -t nl2build-backend .
docker run -p 3000:3000 -e BASE_URL=http://your-server:3000 nl2build-backend
```

#### Option B: Manual Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and configure your settings

# Set ANDROID_SDK_ROOT environment variable
export ANDROID_SDK_ROOT=/path/to/android/sdk

# Start the server
npm start
```

The backend will run on `http://localhost:3000`

### 3. Build and Install the Android App

#### Option A: Using Android Studio

1. Open the project in Android Studio
2. Sync Gradle files
3. Build and run on your device/emulator

#### Option B: Using Command Line

```bash
# From project root
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## ⚙️ Configuration

### Android App Configuration

1. Launch the app
2. Navigate to **Settings** tab
3. Enter your **Anthropic API Key**
4. Enter your **Backend URL** (e.g., `http://your-server:3000/api`)
5. Tap **Save Settings**

### Backend Configuration

Edit `backend/.env`:

```env
PORT=3000
BASE_URL=http://your-domain.com
ANDROID_SDK_ROOT=/path/to/android/sdk
```

## 🎯 Usage

### Creating Your First App

1. **Open the App**: Launch NL2Build on your Android device

2. **Describe Your App**: In the text field, describe the app you want:
   ```
   I want a todo list app with the following features:
   - Add, edit, and delete tasks
   - Mark tasks as complete
   - Organize tasks by categories
   - Set due dates and reminders
   - Clean Material 3 design with dark mode support
   - Swipe to delete functionality
   ```

3. **Generate**: Tap "Generate App" button

4. **Wait**: The system will:
   - Analyze your description (Layer 1 AI) - ~10 seconds
   - Generate Android project (Layer 2 AI) - ~30 seconds
   - Build and sign the app (CI/CD) - ~60-90 seconds

5. **Install or Upload**:
   - Tap "Install on Device" to install the APK immediately
   - Tap "Download AAB for Play Console" to get the bundle for uploading to Google Play

### Example App Descriptions

**Weather App:**
```
Create a weather app that shows current weather and 7-day forecast.
Include location detection, beautiful weather animations, and
temperature in both Celsius and Fahrenheit.
```

**Fitness Tracker:**
```
Build a fitness tracking app with step counter, workout logger,
water intake tracker, and progress charts. Use Material 3 design
with motivational quotes on the home screen.
```

**Recipe Manager:**
```
I need a recipe manager where I can save recipes with photos,
ingredients list, cooking instructions, and preparation time.
Include search and filter by category features.
```

## 🏗️ Project Structure

```
NL2Build-/
├── app/                          # Android application
│   ├── src/main/
│   │   ├── java/com/nl2build/app/
│   │   │   ├── data/            # Data layer (repositories, preferences)
│   │   │   ├── models/          # Data models
│   │   │   ├── services/        # AI and Build services
│   │   │   ├── ui/              # UI components
│   │   │   │   ├── screens/     # Main screens
│   │   │   │   └── theme/       # Material 3 theming
│   │   │   ├── viewmodels/      # ViewModels
│   │   │   ├── MainActivity.kt
│   │   │   └── NL2BuildApplication.kt
│   │   └── res/                 # Resources
│   └── build.gradle.kts
│
├── backend/                      # Backend CI/CD service
│   ├── src/
│   │   ├── models/              # Build job models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Build service
│   │   └── utils/               # Utilities
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

## 🔧 API Endpoints

### Backend API

- **POST** `/api/build` - Submit a new build job
- **GET** `/api/build/:buildJobId/status` - Get build status
- **GET** `/api/build/:buildJobId/apk` - Download APK
- **GET** `/api/build/:buildJobId/aab` - Download AAB
- **GET** `/api/health` - Health check

## 🔐 Security & Privacy

- API keys are stored locally on your device using encrypted DataStore
- All communication uses HTTPS (in production)
- Build artifacts are temporary and cleaned up after download
- No app descriptions or generated code are permanently stored

## 🚀 Deployment

### Backend Deployment Options

1. **Deploy to Cloud Run (Google Cloud)**:
   ```bash
   gcloud run deploy nl2build-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Deploy to Heroku**:
   ```bash
   heroku create nl2build-backend
   heroku container:push web
   heroku container:release web
   ```

3. **Deploy to AWS ECS**:
   - Build Docker image
   - Push to ECR
   - Create ECS task definition
   - Deploy to ECS cluster

### Android App Distribution

1. **Direct APK**: Share the generated APK directly
2. **Google Play Console**: Upload the AAB file
3. **Firebase App Distribution**: Use for beta testing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Anthropic Claude](https://www.anthropic.com/) for the AI capabilities
- [Jetpack Compose](https://developer.android.com/jetpack/compose) for the modern Android UI
- [Material 3](https://m3.material.io/) for the design system

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

## 🎯 Roadmap

- [ ] Support for more complex app types (Firebase integration, APIs, etc.)
- [ ] Template library for common app patterns
- [ ] Visual preview of generated apps before building
- [ ] Direct Google Play Console upload from the app
- [ ] Team collaboration features
- [ ] Cost estimation before generation
- [ ] Multi-language support

---

**Made with ❤️ for rapid Android app development**
