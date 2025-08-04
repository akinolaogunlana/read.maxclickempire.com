// firebase.js
import admin from "firebase-admin";

let credentials;

try {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON in environment variables.");
  }

  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} catch (err) {
  console.error("❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", err.message);
  process.exit(1); // Exit on failure
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
}

const db = admin.firestore();

export { admin, db };