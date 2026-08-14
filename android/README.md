# CinemaStream Android & Android TV App

This folder contains the cross-platform Android mobile and Android TV (Leanback) application configuration.

## Features
- 📱 **Mobile & Tablet Optimized**: Responsive UI, touch gestures, picture-in-picture, portrait & landscape auto-rotation.
- 📺 **Android TV & Fire TV Leanback Mode**: D-Pad spatial remote control navigation, TV banner, hardware acceleration.
- ⚡ **Native Hardware Acceleration**: WebKit / ExoPlayer media decoder support with 4K HDR & 60fps streaming.
- 🔄 **Instant Live Sync**: Uses the central backend scraper engine for zero-delay stream updates.

## How to Build the APK / AAB

### Prerequisites
- Node.js 18+
- Android Studio Iguana / Jellyfish (or higher) with Android SDK 34+
- Java JDK 17+

### Steps to Build
1. **Install Android dependencies**:
   ```bash
   cd android
   npm.cmd install
   ```

2. **Sync Web Assets to Android**:
   ```bash
   npx.cmd cap sync android
   ```

3. **Open Project in Android Studio**:
   ```bash
   npx.cmd cap open android
   ```

4. **Build APK in Android Studio**:
   - Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - The generated `.apk` will be in `android/app/build/outputs/apk/debug/app-debug.apk`.

5. **Install on Android TV / Fire TV via ADB**:
   ```bash
   adb connect <YOUR_TV_IP_ADDRESS>:5555
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
