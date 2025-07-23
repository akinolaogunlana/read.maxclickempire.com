#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load base HTML template
const template = fs.readFileSync(templatePath, "utf8");

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
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, content || "");
};

// Read post files
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const contentPath = path.join(postsDir, file);
  let rawHtml = fs.readFileSync(contentPath, "utf8");

  // Extract <title> and <meta name="description">
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

  // Remove <head>, <meta>, <script>, <title>, etc.
  let content = rawHtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article|html|body|doctype)[^>]*>/gi, "");

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
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped, metadata updated, and cleaned up successfully.");