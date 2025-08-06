const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure output directory exists
// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load base HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Replaces placeholders in the HTML template
// Load old metadata or fallback
let postMetadata = {};
try {
  const rawMeta = fs.readFileSync(metaPath, "utf8");
  const match = rawMeta.match(/const postMetadata\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    postMetadata = eval(`(${match[1]})`);
  }
} catch (e) {
  console.warn("⚠️ Failed to load post-meta.js, starting fresh.");
}

// Helper: Replace placeholders
const placeholderReplacer = (template, metadata, content) => {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
@@ -29,49 +41,59 @@ const placeholderReplacer = (template, metadata, content) => {
    .replace(/{{CONTENT}}/g, content || "");
};

// Get HTML files in posts/
// Read post files
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];
  const contentPath = path.join(postsDir, file);
  let rawHtml = fs.readFileSync(contentPath, "utf8");

  if (!metadata) {
    console.warn(`⚠️ No metadata found for slug: ${slug}, skipping...`);
    return;
  }
  // Extract <title> and <meta name="description">
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);

  const contentPath = path.join(postsDir, file);
  let content = fs.readFileSync(contentPath, "utf8");
  const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, ' ');
  const description = descMatch?.[1]?.trim() || "";
  const keywords = keywordsMatch?.[1]?.trim() || "";

  // Update metadata
  postMetadata[slug] = {
    ...(postMetadata[slug] || {}),
    title,
    description,
    keywords,
    slug,
  };

  // 🧹 Step 1: Remove everything from <head>, <title>, <meta>, <script>, and duplicated tags
  content = content
    // Remove entire <head> blocks if any
  // Remove <head>, <meta>, <script>, <title>, etc.
  let content = rawHtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    // Remove individual <title> or <meta> tags
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove duplicated <main> or <article>
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    // Remove stray DOCTYPE or <html>, <body>, etc.
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|body)[^>]*>/gi, "");

  // 🧱 Final wrapping
  const finalHtml = placeholderReplacer(template, metadata, content.trim());
    .replace(/<\/?(main|article|html|body|doctype)[^>]*>/gi, "");

  // Write to dist/
  // Wrap with template
  const finalHtml = placeholderReplacer(template, postMetadata[slug], content.trim());
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

// 🧼 Clean posts/ folder after wrapping
// Save updated metadata
const metaJs = `// Auto-generated metadata
const postMetadata = ${JSON.stringify(postMetadata, null, 2)};
module.exports = { postMetadata };`;

fs.writeFileSync(metaPath, metaJs);
console.log("💾 Updated data/post-meta.js");

// Clean up posts/
postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  fs.unlinkSync(filePath);
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped and cleaned successfully.");
console.log("🎉 All posts wrapped, metadata updated, and cleaned up successfully.");