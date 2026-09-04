/**
 * Server-side Firebase configuration values.
 *
 * The API verifies Firebase ID tokens through the Identity Toolkit REST endpoint
 * in server.mjs. Structured application persistence is provided by the server-only
 * REST adapter in firestore.mjs. Keep this module free of browser-only Firebase
 * Analytics imports.
 */
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
