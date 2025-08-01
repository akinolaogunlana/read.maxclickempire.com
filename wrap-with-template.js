#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure dist/ directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Load previous metadata or initialize a fresh object
let postMetadata = {};
try {
  const rawMeta = fs.readFileSync(metaPath, "utf8");
  const match = rawMeta.match(/const postMetadata\s*=\s*({[\s\S]*?});/);
  if (match) {
    postMetadata = Function('"use strict";return ' + match[1])();
  }
} catch (e) {
  console.warn("⚠️ Could not load post-meta.js. Starting with a fresh metadata object.");
}

// Replace placeholders in the template
function applyTemplate(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{DATE_PUBLISHED}}/g, metadata.datePublished || "")
    .replace(/{{DATE_MODIFIED}}/g, metadata.dateModified || "")
    .replace(/{{CONTENT}}/g, content || "");
}

// Process each post
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const filePath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");

  // Extract metadata
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
  const datetimeMatch = rawHtml.match(/datetime=["'](.*?)["']/i);

  const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, " ");
  const description = descMatch?.[1]?.trim() || "";
  const keywords = keywordsMatch?.[1]?.trim() || "";

  // File timestamps
  const stats = fs.statSync(filePath);
  const datePublished = datetimeMatch?.[1] || stats.birthtime.toISOString();
  const dateModified = stats.mtime.toISOString();

  // Update metadata object
  postMetadata[slug] = {
    ...(postMetadata[slug] || {}),
    title,
    description,
    keywords,
    slug,
    canonical: `https://read.maxclickempire.com/posts/${file}`,
    ogImage: `https://read.maxclickempire.com/assets/og-image.jpg`,
    datePublished,
    dateModified
  };

  // Clean original post content
  const cleanedContent = rawHtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article|html|body|!doctype)[^>]*>/gi, "");

  // Inject into template
  const finalHtml = applyTemplate(template, postMetadata[slug], cleanedContent.trim());
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

// Save metadata to JS file
const metaJs = `// Auto-generated metadata\nconst postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };`;
fs.writeFileSync(metaPath, metaJs, "utf8");
console.log("💾 Updated data/post-meta.js");

// Optional: Clean up original HTML posts
postFiles.forEach(file => {
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped, metadata updated, and cleaned up successfully.");
