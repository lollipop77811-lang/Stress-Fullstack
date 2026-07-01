// Firebase client SDK initialization.
// Used for email + Google authentication on the frontend.
//
// Setup:
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Project Settings → General → Your apps → Add web app
//   3. Copy the config values into a .env file at the project root:
//        VITE_FIREBASE_API_KEY=...
//        VITE_FIREBASE_AUTH_DOMAIN=...
//        VITE_FIREBASE_PROJECT_ID=...
//        VITE_FIREBASE_APP_ID=...
//   4. In Firebase Console → Authentication → Sign-in method:
//        - Enable Email/Password
//        - Enable Google

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Only initialize if config is present
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("[firebase] client initialized");
  } catch (err) {
    console.warn("[firebase] client init failed:", err);
  }
} else {
  console.warn("[firebase] not configured — set VITE_FIREBASE_* env vars to enable auth.");
}

export { auth, googleProvider };
export const firebaseEnabled = !!app;
