const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

const seenHashes = new Set();

function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function cleanUpContentStrict(rawHtml, postTitle) {
  const $ = cheerio.load(rawHtml);

  // Remove all unnecessary elements
  $("script, style, link[rel='stylesheet'], meta, title").remove();
  $("[style], [class], [id], [onclick], [onload]").removeAttr("style class id onclick onload");

  // Remove common noisy blocks
  $("header, footer, nav, aside, .hero-title, .post-title, .entry-title, .main-heading").remove();

  // Remove all <h1> that look like post titles or are short
  $("h1").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text === postTitle.toLowerCase() || text.length < 10) {
      $(el).remove();
    }
  });

  // Ensure article/body-level duplicate <h1> gone
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Extract clean main content
  let content = $("article").html() || $("main").html() || $("body").html() || rawHtml;
  return content.trim();
}

// Load the template
const template = fs.readFileSync(templatePath, "utf-8");

// Ensure dist folder exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Process each file
fs.readdirSync(rawDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const rawFilePath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawFilePath, "utf-8");

  const metadata = postMetadata[file];
  if (!metadata) {
    console.warn(`⚠️ No metadata for ${file}`);
    return;
  }

  const cleanContent = cleanUpContentStrict(rawHtml, metadata.title);
  const hash = generateHash(cleanContent);

  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }

  seenHashes.add(hash);

  // Prepare output file path
  const outputFilePath = path.join(distDir, file);

  // Remove old version if it exists
  if (fs.existsSync(outputFilePath)) {
    fs.unlinkSync(outputFilePath);
  }

  // Inject into template
  const finalHtml = template
    .replace("{{TITLE}}", metadata.title)
    .replace("{{DESCRIPTION_ESCAPED}}", metadata.description.replace(/"/g, "&quot;"))
    .replace("{{KEYWORDS}}", metadata.keywords)
    .replace("{{POST_CONTENT}}", cleanContent);

  // Save to dist
  fs.writeFileSync(outputFilePath, finalHtml);
  console.log(`✅ Generated: ${file}`);
});