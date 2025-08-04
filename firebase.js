// firebase.js
import admin from "firebase-admin";

// Auto-initialize from base64-encoded GOOGLE_APPLICATION_CREDENTIALS_JSON
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "base64").toString("utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export { admin, db };