// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const SITE_URL = "https://read.maxclickempire.com";

// Paths
// ✅ Change to posts directory, not dist
const postsDir = path.join(__dirname, "..", "posts");
const outputPath = path.join(__dirname, "..", "data", "post-meta.js");

// Load existing metadata (for persistence)
let postMetadata = {};
if (fs.existsSync(outputPath)) {
  try {
    const existing = require(outputPath);
    if (existing && typeof existing.postMetadata === "object") {
      postMetadata = existing.postMetadata;
    }
  } catch (err) {
    console.warn("⚠ Could not load existing post metadata:", err.message);
  }
}

if (!fs.existsSync(postsDir)) {
  console.error(`❌ posts directory not found: ${postsDir}`);
  process.exit(1);
}

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  const slug = file.replace(/\.html$/, "");
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);

  const title = $("head title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    `${SITE_URL}/assets/og-image.jpg`;

  if (!title || !description) {
    console.warn(`⚠ Skipping "${slug}" (missing title or description)`);
    return;
  }

  // Detect file modification time
  const stats = fs.statSync(filePath);
  const fileModifiedTime = stats.mtimeMs || 0;

  // Use saved metadata if no change in source file
  const savedMeta = postMetadata[slug] || {};
  if (savedMeta.sourceLastModified === fileModifiedTime) {
    return;
  }

  // Accurate datePublished
  let datePublished = savedMeta.datePublished;
  if (!datePublished || savedMeta.sourceLastModified !== fileModifiedTime) {
    const metaDate = $('meta[name="datePublished"]').attr("content")?.trim();
    if (metaDate && !isNaN(Date.parse(metaDate))) {
      datePublished = new Date(metaDate).toISOString();
    } else if (stats.birthtimeMs && stats.birthtimeMs > 0) {
      datePublished = new Date(stats.birthtime).toISOString();
    } else if (stats.ctimeMs && stats.ctimeMs > 0) {
      datePublished = new Date(stats.ctime).toISOString();
    } else {
      datePublished = new Date(fileModifiedTime).toISOString();
    }
  }

  postMetadata[slug] = {
    title,
    description,
    keywords,
    ogImage,
    canonical: `${SITE_URL}/posts/${slug}.html`,
    datePublished,
    sourceLastModified: fileModifiedTime
  };
});

const output = `// Auto-generated metadata\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;
fs.writeFileSync(outputPath, output, "utf8");

console.log(`✅ post-meta.js updated with ${Object.keys(postMetadata).length} posts → ${outputPath}`);