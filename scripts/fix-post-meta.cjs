// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const SITE_URL = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "..", "posts"); // ✅ Wrapped HTML output
const outputPath = path.join(__dirname, "..", "data", "post-meta.js");

console.log("🔍 Checking posts directory:", postsDir);

// ---------------------
// 1️⃣ Ensure posts directory exists
// ---------------------
if (!fs.existsSync(postsDir)) {
  console.error(`❌ ERROR: posts directory not found at ${postsDir}`);
  console.error("💡 You must run your wrapping/build step before generating post metadata.");
  process.exit(1);
}

// ---------------------
// 2️⃣ Load existing metadata
// ---------------------
let postMetadata = {};
if (fs.existsSync(outputPath)) {
  try {
    const existing = require(outputPath);
    if (existing && typeof existing.postMetadata === "object") {
      postMetadata = existing.postMetadata;
      console.log(`📦 Loaded existing metadata for ${Object.keys(postMetadata).length} posts`);
    }
  } catch (err) {
    console.warn("⚠ Could not load existing post metadata:", err.message);
  }
}

// ---------------------
// 3️⃣ Scan posts
// ---------------------
const htmlFiles = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error("❌ No HTML posts found in posts/ directory.");
  process.exit(1);
}

let updatedCount = 0;

htmlFiles.forEach(file => {
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

  const stats = fs.statSync(filePath);
  const fileModifiedTime = stats.mtimeMs || 0;
  const savedMeta = postMetadata[slug] || {};

  // Skip unchanged files
  if (savedMeta.sourceLastModified === fileModifiedTime) {
    return;
  }

  // ---------------------
  // 📅 Detect datePublished
  // ---------------------
  let datePublished = savedMeta.datePublished;

  // From meta tag (case-insensitive)
  const metaDatePub = $('meta[name="datePublished" i]').attr("content")?.trim();

  // From JSON-LD
  let jsonDatePub;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      if (typeof data === "object" && data.datePublished && !jsonDatePub) {
        jsonDatePub = data.datePublished.trim();
      }
    } catch {}
  });

  if (metaDatePub && !isNaN(Date.parse(metaDatePub))) {
    datePublished = new Date(metaDatePub).toISOString();
  } else if (jsonDatePub && !isNaN(Date.parse(jsonDatePub))) {
    datePublished = new Date(jsonDatePub).toISOString();
  } else if (stats.birthtimeMs && stats.birthtimeMs > 0) {
    datePublished = new Date(stats.birthtime).toISOString();
  } else if (stats.ctimeMs && stats.ctimeMs > 0) {
    datePublished = new Date(stats.ctime).toISOString();
  } else {
    datePublished = new Date(fileModifiedTime).toISOString();
  }

  // ---------------------
  // 📅 Detect dateModified
  // ---------------------
  let dateModified = savedMeta.dateModified;

  const metaDateMod = $('meta[name="dateModified" i]').attr("content")?.trim();

  let jsonDateMod;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      if (typeof data === "object" && data.dateModified && !jsonDateMod) {
        jsonDateMod = data.dateModified.trim();
      }
    } catch {}
  });

  if (metaDateMod && !isNaN(Date.parse(metaDateMod))) {
    dateModified = new Date(metaDateMod).toISOString();
  } else if (jsonDateMod && !isNaN(Date.parse(jsonDateMod))) {
    dateModified = new Date(jsonDateMod).toISOString();
  } else {
    dateModified = new Date(fileModifiedTime).toISOString();
  }

  // ---------------------
  // 🕒 Extract timestamp (optional)
  // ---------------------
  let timestamp = $('meta[name="timestamp"]').attr("content")?.trim();
  if (!timestamp || isNaN(Date.parse(timestamp))) {
    timestamp = new Date(fileModifiedTime).toISOString();
  } else {
    timestamp = new Date(timestamp).toISOString();
  }

  // ---------------------
  // 📝 Save metadata
  // ---------------------
  postMetadata[slug] = {
    title,
    description,
    keywords,
    ogImage,
    canonical: `${SITE_URL}/posts/${slug}.html`,
    datePublished,
    dateModified, // ✅ Now included
    timestamp,
    sourceLastModified: fileModifiedTime
  };

  updatedCount++;
});

// ---------------------
// 4️⃣ Save metadata
// ---------------------
const output = `// Auto-generated metadata\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;
fs.writeFileSync(outputPath, output, "utf8");

console.log(`✅ Metadata updated → ${outputPath}`);
console.log(`📄 Total posts in metadata: ${Object.keys(postMetadata).length}`);
console.log(`🆕 Updated posts this run: ${updatedCount}`);
if (updatedCount === 0) {
  console.log("ℹ No changes detected — RSS and sitemap will be unchanged unless forced to regenerate.");
}