import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqgfH_fX69EqBe5iOmN7F1E09gGj4zW60",
  authDomain: "animated-way-426007-p6.firebaseapp.com",
  projectId: "animated-way-426007-p6",
  storageBucket: "animated-way-426007-p6.firebasestorage.app",
  messagingSenderId: "33587602209",
  appId: "1:33587602209:web:818e58f30a2886eb4b9460",
  measurementId: "G-LGG4K6E22F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize TinyMCE
tinymce.init({
  selector: '#content',
  plugins: 'preview code link lists',
  toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | preview code',
  setup: function (editor) {
    editor.on('keyup change', function () {
      document.getElementById("previewContent").innerHTML = editor.getContent();
    });
  }
});

window.publishPost = async () => {
  const title = document.getElementById("title").value;
  const content = tinymce.get("content").getContent();
  
  if (!title || !content) return alert("Title and content required");

  try {
    await addDoc(collection(db, "posts"), {
      title,
      content,
      createdAt: serverTimestamp(),
      author: auth.currentUser?.email || "admin"
    });
    alert("Post Published!");
    document.getElementById("title").value = "";
    tinymce.get("content").setContent("");
    document.getElementById("previewContent").innerHTML = "";
  } catch (error) {
    alert("Error publishing: " + error.message);
  }
};