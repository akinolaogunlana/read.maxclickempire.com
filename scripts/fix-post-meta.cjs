// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const postsDir = path.join(__dirname, "..", "posts");
const outputPath = path.join(__dirname, "../data/post-meta.js");

if (!fs.existsSync(postsDir)) {
  console.error(`❌ Posts directory not found: ${postsDir}`);
  process.exit(1);
}

const postMetadata = {};

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  const slug = file.replace(".html", "");
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);

  const title = $("head title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    "https://read.maxclickempire.com/assets/og-image.jpg";

  if (!title || !description) {
    console.warn(`⚠ Skipping "${slug}" (missing title or description)`);
    return;
  }

  const stats = fs.statSync(filePath);
  const publishedDate =
    stats.birthtimeMs && stats.birthtimeMs > 0
      ? new Date(stats.birthtime).toISOString()
      : new Date(stats.mtime).toISOString(); // fallback to modified time

  postMetadata[slug] = {
    title,
    description,
    keywords,
    image: ogImage,
    published: publishedDate,
  };
});

const output = `// Auto-generated. Do not edit.
const postMetadata = ${JSON.stringify(postMetadata, null, 2)};

if (typeof module !== 'undefined') {
  module.exports = postMetadata;
}`;

fs.writeFileSync(outputPath, output);
console.log(`✅ post-meta.js generated with ${Object.keys(postMetadata).length} posts → ${outputPath}`);