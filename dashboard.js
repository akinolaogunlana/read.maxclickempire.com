// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCqgfH_fX69EqBe5iOmN7F1E09gGj4zW60",
  authDomain: "animated-way-426007-p6.firebaseapp.com",
  databaseURL: "https://animated-way-426007-p6-default-rtdb.firebaseio.com",
  projectId: "animated-way-426007-p6",
  storageBucket: "animated-way-426007-p6.appspot.com",
  messagingSenderId: "33587602209",
  appId: "1:33587602209:web:818e58f30a2886eb4b9460",
  measurementId: "G-LGG4K6E22F"
};

// 🔧 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🎯 DOM Elements
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginError = document.getElementById("login-error");
const postForm = document.getElementById("post-form");
const previewContent = document.getElementById("preview-content");

// 👤 Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
  } else {
    loginScreen.style.display = "block";
    dashboard.style.display = "none";
  }
});

// 🔑 Login Function
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    loginError.textContent = "";
  } catch (err) {
    loginError.textContent = "Login failed. Check credentials.";
  }
});

// 🚪 Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ✍️ Post Submission
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const slug = document.getElementById("slug").value;
  const summary = document.getElementById("summary").value;
  const content = document.getElementById("content").value;

  try {
    await addDoc(collection(db, "posts"), {
      title,
      slug,
      summary,
      content,
      createdAt: serverTimestamp(),
    });
    alert("✅ Post submitted successfully!");
    postForm.reset();
    previewContent.innerHTML = "";
  } catch (err) {
    alert("❌ Failed to submit post.");
    console.error(err);
  }
});

// 🔍 Live Preview
document.getElementById("content").addEventListener("input", (e) => {
  previewContent.innerHTML = e.target.value;
});
