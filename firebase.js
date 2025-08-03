// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔁 Use your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyCqgfH_fX69EqBe5iOmN7F1E09gGj4zW60",
  authDomain: "animated-way-426007-p6.firebaseapp.com",
  databaseURL: "https://animated-way-426007-p6-default-rtdb.firebaseio.com",
  projectId: "animated-way-426007-p6",
  storageBucket: "animated-way-426007-p6.firebasestorage.app",
  messagingSenderId: "33587602209",
  appId: "1:33587602209:web:818e58f30a2886eb4b9460",
  measurementId: "G-LGG4K6E22F"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };