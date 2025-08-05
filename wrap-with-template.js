#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data", "post-meta.js");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Load previous metadata or initialize fresh object
let postMetadata = {};
try {
  const rawMeta = fs.readFileSync(metaPath, "utf8");
  const match = rawMeta.match(/const postMetadata = (.*);\nmodule\.exports/);
  if (match && match[1]) {
    postMetadata = Function('"use strict";return ' + match[1])();
  }
} catch (e) {
  console.warn("⚠️ Could not load post-meta.js. Starting fresh.");
}

// Helper: hash content for checksum comparison
function hashContent(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

// Get all HTML files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

// Template injection function
function applyTemplate(template, metadata, content) {
  return template
    .replace("{{TITLE}}", metadata.title || "")
    .replace("{{DESCRIPTION}}", metadata.description || "")
    .replace("{{KEYWORDS}}", metadata.keywords || "")
    .replace("{{CANONICAL}}", metadata.canonical || "")
    .replace("{{OG_IMAGE}}", metadata.ogImage || "")
    .replace("{{DATE_PUBLISHED}}", metadata.datePublished || "")
    .replace("{{DATE_MODIFIED}}", metadata.dateModified || "")
    .replace("{{CONTENT}}", content || "");
}

postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");

  // Extract <title>, <meta name="description">, and <meta name="keywords">
  const titleMatch = rawHtml.match(/<title>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']\s*\/?>/i);
  const datetimeMatch = rawHtml.match(/datetime=["']([^"']+)["']/i);

  const title = titleMatch?.[1] || "";
  const description = descMatch?.[1] || "";
  const keywords = keywordsMatch?.[1] || "";

  const slug = file.replace(/\.html$/, "");
  const stats = fs.statSync(filePath);
  const existing = postMetadata[slug];
  const datePublished = existing?.datePublished || datetimeMatch?.[1] || stats.birthtime.toISOString();
  const dateModified = stats.mtime.toISOString();

  // Clean original post content
  const cleanedContent = rawHtml
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?(main|article|html|body|!doctype)[^>]*>/gi, "");

  // Inject into template
  const finalHtml = applyTemplate(template, {
    ...(existing || {}),
    title,
    description,
    keywords,
    slug,
    canonical: `https://read.maxclickempire.com/posts/${file}`,
    ogImage: `https://read.maxclickempire.com/assets/og-image.jpg`,
    datePublished,
    dateModified
  }, cleanedContent.trim());

  // Write to dist/
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped and saved to dist/: ${file}`);

  // Update metadata object
  postMetadata[slug] = {
    ...(existing || {}),
    title,
    description,
    keywords,
    slug,
    canonical: `https://read.maxclickempire.com/posts/${file}`,
    ogImage: `https://read.maxclickempire.com/assets/og-image.jpg`,
    datePublished,
    dateModified
  };
});

// Save metadata to JS file only if changed
const newMetaJs = `// Auto-generated metadata\nconst postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };`;
const existingMetaJs = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, "utf8") : "";

if (newMetaJs !== existingMetaJs) {
  fs.writeFileSync(metaPath, newMetaJs, "utf8");
  console.log("💾 Updated data/post-meta.js");
} else {
  console.log("✅ No changes to post-meta.js");
}

// Optional: Clean up original HTML posts
// 🔥 Optional: Remove this block if you want to keep original posts
/*
postFiles.forEach(file => {
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});
*/