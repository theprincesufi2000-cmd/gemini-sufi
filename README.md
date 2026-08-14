# Gemini Sufi V4.1 — Render Ready

## Deploy Backend
1. Push this repository to GitHub.
2. In Render choose **New Web Service** and select the repository.
3. Render can also use `render.yaml`.
4. Required environment variables:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-3.5-flash`
   - `FIREBASE_DATABASE_URL=https://gemini-ff6e0-default-rtdb.firebaseio.com`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the complete Firebase Admin service-account JSON on one line
5. Deploy.
6. Open `/api/health` on your Render HTTPS URL.

## Connect the app
Edit `public/config.js`:
`BACKEND_URL: "https://YOUR-SERVICE.onrender.com"`

Then commit/push and build the APK.

## Firebase
Enable Email/Password in Authentication. Apply `firebase/database.rules.json` to Realtime Database.

## Security
The Gemini key and Firebase Admin credentials stay on Render. Do not commit them.
