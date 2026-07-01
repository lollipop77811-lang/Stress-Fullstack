// Firebase Admin SDK initialization.
// Used for verifying Firebase ID tokens sent by the client.
//
// Setup:
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Project Settings → Service Accounts → Generate New Private Key
//   3. Save the JSON file as `firebase-service-account.json` in the server/ dir
//      (or set FIREBASE_SERVICE_ACCOUNT env var to the JSON string)
//   4. The file is gitignored — never commit it

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

let initialized = false;
let authInstance = null;

try {
  const keyPath = path.resolve(process.cwd(), "firebase-service-account.json");
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (envKey) {
    initializeApp({ credential: cert(JSON.parse(envKey)) });
    initialized = true;
    console.log("[firebase] initialized from env var");
  } else if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    initializeApp({ credential: cert(serviceAccount) });
    initialized = true;
    console.log("[firebase] initialized from service account file");
  } else {
    console.warn("[firebase] not initialized — no service account found.");
    console.warn("[firebase] Auth endpoints will return 503 until configured.");
  }

  if (initialized) {
    authInstance = getAuth();
  }
} catch (err) {
  console.error("[firebase] init failed:", err.message);
}

export const firebaseAuth = authInstance;
export const firebaseInitialized = initialized;
