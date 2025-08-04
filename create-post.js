// create-post.js
import readline from "readline";
import { db, admin } from "./firebase.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

(async () => {
  console.log("📝 Let's create a new blog post...\n");

  const title = await ask("Post Title: ");
  if (!title) return console.log("❌ Title cannot be empty"), rl.close();

  let slug = await ask("Slug (leave blank to auto-generate): ");
  slug = slug || generateSlug(title);

  const summary = await ask("Summary: ");
  if (!summary) return console.log("❌ Summary cannot be empty"), rl.close();

  console.log("🪄 You can paste markdown or HTML content below:");
  const content = await ask("Content: ");
  if (!content) return console.log("❌ Content cannot be empty"), rl.close();

  const post = {
    title,
    slug,
    summary,
    content,
    createdAt: admin.firestore.Timestamp.now(), // ⏱️ Timestamp
  };

  try {
    const docRef = await db.collection("posts").add(post);
    console.log(`✅ Post created successfully! ID: ${docRef.id}`);
  } catch (err) {
    console.error("❌ Failed to save post:", err.message);
  } finally {
    rl.close();
  }
})();