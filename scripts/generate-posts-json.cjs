// scripts/generate-posts-json.cjs
const fs = require("fs");
const path = require("path");
const posts = require("../data/post-meta.js"); // must export an array

const apiDir = path.join(process.cwd(), "api");
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir);

// ---------- MASTER FEED ----------
const masterFeed = posts.map(post => ({
  title: post.title,
  slug: post.slug,
  url: `https://read.maxclickempire.com/posts/${post.slug}.html`,
  date: post.date,
  description: post.description || "",
  tags: post.tags || []
}));

fs.writeFileSync(path.join(apiDir, "posts.json"), JSON.stringify(masterFeed, null, 2));
console.log("✅ api/posts.json generated");

// ---------- INDIVIDUAL POSTS ----------
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
    content
  };

  fs.writeFileSync(path.join(apiDir, `${post.slug}.json`), JSON.stringify(postData, null, 2));
  console.log(`✅ api/${post.slug}.json generated`);
});
