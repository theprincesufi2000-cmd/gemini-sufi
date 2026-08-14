# Gemini Sufi V4 — GitHub Ready

- Android package: `com.ai.sufi`
- Firebase project: `gemini-ff6e0`
- Node: 22
- GitHub Actions: Debug APK + Release APK/AAB
- Firebase Auth + Realtime Database
- Gemini streaming + long-term memory

## GitHub
Push this repository to GitHub, then:
**Actions → Android Debug APK → Run workflow**

The workflow deliberately uses `npm install` instead of npm cache, so a `package-lock.json` is not required.

## Backend
Set `GEMINI_API_KEY` and Firebase Admin credentials on the backend. Do not put the Gemini key inside the APK.

## Release
For signed release, add:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`.
