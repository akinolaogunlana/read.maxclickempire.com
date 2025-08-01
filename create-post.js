// create-post.js
const db = require("./firebase");

async function createPost() {
  const slug = "my-first-post";
  const title = "My First Dynamic Post";
  const description = "This is the first post stored in Firebase.";
  const content = "<p>This is my content for the first post.</p>";
  const created = new Date().toISOString();

  const postRef = db.collection("posts").doc(slug);
  await postRef.set({
    slug,
    title,
    description,
    content,
    created,
    modified: created,
    keywords: ["first", "blog", "firebase"],
    canonical: `https://read.maxclickempire.com/posts/${slug}.html`
  });

  console.log("✅ Post saved to Firebase");
}

createPost();
