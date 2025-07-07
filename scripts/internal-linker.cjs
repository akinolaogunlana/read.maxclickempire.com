// scripts/internal-linker.cjs

const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "..", "posts");
const metadataPath = path.join(__dirname, "..", "data", "post-meta.js");

console.log(`[${new Date().toISOString()}] 🧠 Reading metadata from: ${metadataPath}`);

let metadata = {};
try {
  metadata = require(metadataPath).postMetadata || {};
} catch (err) {
  console.error(`[${new Date().toISOString()}] ❌ Failed to load metadata: ${err.message}`);
  process.exit(1);
}

const LINK_LIMIT = 3;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  try {
    const filePath = path.join(postsDir, filename);
    let html = fs.readFileSync(filePath, "utf8");

    const currentSlug = filename.replace(".html", "").toLowerCase();

    const potentialLinks = Object.entries(metadata)
      .filter(([slug]) => slug !== currentSlug)
      .map(([slug, data]) => ({
        keyword: (data.keyword || data.title.split(" ")[0]).toLowerCase(),
        href: `/posts/${slug}.html`,
        title: data.title,
      }));

    let inserted = 0;
    const linkedHrefs = new Set();

    html = html.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
      if (inserted >= LINK_LIMIT || /<a\s/i.test(content)) return match;

      for (const link of potentialLinks) {
        if (linkedHrefs.has(link.href)) continue;

        const regex = new RegExp(`\\b(${escapeRegex(link.keyword)})\\b`, "i");

        if (regex.test(content)) {
          content = content.replace(regex, `<a href="${link.href}" title="${link.title}">$1</a>`);
          linkedHrefs.add(link.href);
          inserted++;
          if (inserted >= LINK_LIMIT) break;
        }
      }

      return `<p>${content}</p>`;
    });

    fs.writeFileSync(filePath, html, "utf8");
    console.log(`[${new Date().toISOString()}] ✅ Added ${inserted} internal links → ${filename}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Error processing ${filename}: ${err.message}`);
  }
});