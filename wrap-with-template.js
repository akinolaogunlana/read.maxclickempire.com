const fs = require("fs");
const path = require("path");
const metaPath = path.join(__dirname, "data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load base HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Load existing post metadata from JS file if available
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
    .replace(/{{DESCRIPTION}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, content || "");
};

// Get HTML files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const contentPath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(contentPath, "utf8");

  // Extract metadata
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);

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

  // Clean HTML content
  let content = rawHtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|body)[^>]*>/gi, "");

  // Wrap with template
  const finalHtml = placeholderReplacer(template, postMetadata[slug], content.trim());
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

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
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped, metadata updated, and cleaned up successfully.");