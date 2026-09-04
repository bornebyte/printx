/**
 * Server-side Firebase configuration values.
 *
 * The API currently verifies Firebase ID tokens through the Identity Toolkit
 * REST endpoint in server.mjs. Keep this module free of browser-only Firebase
 * Analytics imports so it can safely be used by Node services later.
 */
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
