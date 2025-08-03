// firebase.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

// Get Firestore instance
const db = getFirestore();

export { db };