
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Added this line
};

// Firebase config is ready for initialization

let app: FirebaseApp;
if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    console.error(
      "Firebase Initialization Error: API Key is missing or undefined. " +
      "Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly set in your .env.local file and the development server was restarted."
    );
  } else {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Error initializing Firebase app:", error);
      console.error("Firebase config at time of error (excluding API key for security):", {
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        // ... other relevant, non-sensitive fields
      });
    }
  }
} else {
  app = getApps()[0]!;
}

const auth = app! ? getAuth(app!) : null;
const db = app! ? getFirestore(app!) : null;
const storage = app! ? getStorage(app!) : null;

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  if (window.location.hostname === "localhost") {
    try {
      if (auth && !auth.emulatorConfig) {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      }
      // @ts-ignore
      if (db && db.INTERNAL && db.INTERNAL.settings && !db.INTERNAL.settings.host.includes('localhost')) {
         connectFirestoreEmulator(db, "localhost", 8080);
      }
      if (storage && !(storage as any).emulatorConfig) { // Check if storage is initialized and not already connected
        connectStorageEmulator(storage, "localhost", 9199);
      }
    } catch (error) {
      console.warn("Error connecting to Firebase emulators:", error);
    }
  }
}

export { app, auth, db, storage };
