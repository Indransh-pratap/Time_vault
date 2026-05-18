# TimeVault Android Build Pipeline

This project is converted to a native Android app using Capacitor.

## Prerequisites
- Android Studio installed
- Java SDK 17+ installed
- Node.js installed

## Development Workflow

### 1. Build the web project
```bash
npm run build
```

### 2. Sync with Android project
```bash
npx cap sync
```

### 3. Open in Android Studio
```bash
npx cap open android
```

---

## Building APKs

### Build Debug APK
1. Open the project in Android Studio.
2. Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
3. The APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Build Release APK (Unsigned)
1. Open the project in Android Studio.
2. Go to `Build` > `Select Build Variant`.
3. Change the active build variant to `release`.
4. Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.

### Export Signed APK (For Play Store/Distribution)
1. Go to `Build` > `Generate Signed Bundle / APK...`.
2. Select `APK`.
3. Create or select your Key Store.
4. Select `release` destination.
5. Finish the wizard.

---

## Capacitor Commands

- `npx cap sync`: Copies web assets and updates plugins.
- `npx cap update`: Updates native dependencies only.
- `npx cap copy`: Copies web assets only.
- `npx cap open android`: Opens the native project in Android Studio.
