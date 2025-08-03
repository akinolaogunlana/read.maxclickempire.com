// create-post.js
import readline from "readline";
import { db, admin } from "./firebase.js"; // `admin` used for Timestamp

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
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // ⏱️ Proper timestamp
  };

  try {
    const docRef = await db.collection("posts").add(post); // ✅ Admin SDK usage
    console.log(`✅ Post stored with ID: ${docRef.id}`);
  } catch (err) {
    console.error("❌ Failed to save post:", err);
  } finally {
    rl.close();
  }
})();