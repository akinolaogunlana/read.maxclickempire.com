// scripts/internal-linker.cjs
const fs = require("fs");
const path = require("path");

// Directory containing HTML posts
const postsDir = path.join(__dirname, "..", "posts");

// Load metadata safely from CommonJS-compatible post-meta.js
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load post metadata:", err.message);
  process.exit(1);
}

const LINK_LIMIT = 3;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Get all post HTML files
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  const filePath = path.join(postsDir, filename);
  let html = fs.readFileSync(filePath, "utf8");

  const currentSlug = filename.replace(".html", "").toLowerCase();
  const usedLinks = new Set();
  let inserted = 0;

  // Build potential links excluding the current post
  const potentialLinks = Object.entries(metadata)
    .filter(([slug]) => slug !== currentSlug)
    .map(([slug, data]) => ({
      keyword: (data.keyword || data.title.split(" ")[0]).toLowerCase(),
      href: `/posts/${slug}.html`,
      title: data.title,
    }));

  // Insert internal links in <p> tags
  html = html.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
    if (inserted >= LINK_LIMIT || /<a\s/i.test(content)) return match;

    for (const link of potentialLinks) {
      if (usedLinks.has(link.href)) continue;

      const keywordRegex = new RegExp(`\\b(${escapeRegExp(link.keyword)})\\b`, "i");
      if (keywordRegex.test(content)) {
        content = content.replace(keywordRegex, `<a href="${link.href}" title="${link.title}">$1</a>`);
        usedLinks.add(link.href);
        inserted++;
        if (inserted >= LINK_LIMIT) break;
      }
    }

    return `<p>${content}</p>`;
  });

  // Write the updated HTML back to file
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`🔗 ${filename} — inserted ${inserted} internal links`);
});