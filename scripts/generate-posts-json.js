// scripts/generate-posts-json.js
import fs from "fs";
import path from "path";
import posts from "../data/post-meta.js"; // ✅ metadata file

const apiDir = path.join(process.cwd(), "api");

// Ensure /api directory exists
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir);
}

// ---------- MASTER FEED (posts.json) ----------
const masterFeed = posts.map(post => ({
  title: post.title,
  slug: post.slug,
  url: `https://read.maxclickempire.com/posts/${post.slug}.html`,
  date: post.date,
  description: post.description || "",
  tags: post.tags || []
}));

fs.writeFileSync(
  path.join(apiDir, "posts.json"),
  JSON.stringify(masterFeed, null, 2)
);
console.log("✅ api/posts.json generated");

// ---------- INDIVIDUAL POSTS (slug.json) ----------
posts.forEach(post => {
  const postPath = path.join(process.cwd(), "posts", `${post.slug}.html`);

  let content = "";
  if (fs.existsSync(postPath)) {
    content = fs.readFileSync(postPath, "utf-8");
  } else {
    console.warn(`⚠️ Missing file: posts/${post.slug}.html`);
  }

  const postData = {
    title: post.title,
    slug: post.slug,
    url: `https://read.maxclickempire.com/posts/${post.slug}.html`,
    date: post.date,
    description: post.description || "",
    tags: post.tags || [],
    content: content
  };

  fs.writeFileSync(
    path.join(apiDir, `${post.slug}.json`),
    JSON.stringify(postData, null, 2)
  );
  console.log(`✅ api/${post.slug}.json generated`);
});
