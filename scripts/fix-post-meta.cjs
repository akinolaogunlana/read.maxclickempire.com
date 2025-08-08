// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// Scan dist/ directory as requested
const postsDir = path.join(__dirname, "..", "dist");
const outputPath = path.join(__dirname, "..", "data", "post-meta.js");

if (!fs.existsSync(postsDir)) {
  console.error(`❌ dist directory not found: ${postsDir}`);
  process.exit(1);
}

const postMetadata = {};

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
    "https://read.maxclickempire.com/assets/og-image.jpg";

  if (!title || !description) {
    console.warn(`⚠ Skipping "${slug}" (missing title or description)`);
    return;
  }

  // Accurate datePublished detection:
  const stats = fs.statSync(filePath);

  let datePublished = "";
  const metaDate = $('meta[name="datePublished"]').attr("content")?.trim();
  if (metaDate && !isNaN(Date.parse(metaDate))) {
    datePublished = new Date(metaDate).toISOString();
  } else if (stats.birthtimeMs && stats.birthtimeMs > 0) {
    datePublished = new Date(stats.birthtime).toISOString();
  } else if (stats.mtimeMs && stats.mtimeMs > 0) {
    datePublished = new Date(stats.mtime).toISOString();
  } else if (stats.ctimeMs && stats.ctimeMs > 0) {
    datePublished = new Date(stats.ctime).toISOString();
  } else {
    datePublished = new Date().toISOString();
  }

  postMetadata[slug] = {
    title,
    description,
    keywords,
    ogImage,
    datePublished,
  };
});

const output = `// Auto-generated metadata\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;

fs.writeFileSync(outputPath, output, "utf8");
console.log(`✅ post-meta.js generated with ${Object.keys(postMetadata).length} posts → ${outputPath}`);