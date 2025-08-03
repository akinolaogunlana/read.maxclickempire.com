// create-post.js
import readline from "readline";
import { collection, addDoc, serverTimestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
  console.log("📝 Let's create a blog post...");

  const title = await ask("Post Title: ");
  const slug = await ask("Slug (e.g. first-post): ");
  const summary = await ask("Summary: ");
  const content = await ask("Content (markdown/html): ");

  const post = {
    title,
    slug,
    summary,
    content,
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "posts"), post);
    console.log(`✅ Post stored with ID: ${docRef.id}`);
  } catch (err) {
    console.error("❌ Failed to save post:", err);
  } finally {
    rl.close();
  }
})();