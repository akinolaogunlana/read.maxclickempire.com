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

// Load template
const template = fs.readFileSync(templatePath, "utf8");

// Load previous metadata or start fresh
let postMetadata = {};
try {
  const rawMeta = fs.readFileSync(metaPath, "utf8");
  const match = rawMeta.match(/postMetadata\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    postMetadata = Function('"use strict";return ' + match[1])();
  }
} catch (e) {
  console.warn("⚠️ Could not load post-meta.js. Starting fresh.");
}

// Helper to hash content
function hashContent(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

// Replace all placeholders in template
function applyTemplate(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapeHtml(metadata.description || ""))
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, "Ogunlana Akinola Okikiola")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{DATE_PUBLISHED}}/g, metadata.datePublished || "")
    .replace(/{{DATE_MODIFIED}}/g, metadata.dateModified || "")
    .replace(/{{CONTENT}}/g, content);
}

// Simple HTML escape
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[match]);
}

// Process each post
const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");
  const slug = path.basename(file, ".html");

  // Try to extract title/description from <title>/<meta> if needed
  const titleMatch = rawHtml.match(/<title>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);

  const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, ' ');
  const description = descMatch?.[1]?.trim() || `Read about ${title}.`;
  const keywords = slug.split("-").join(", ");
  const canonical = `https://read.maxclickempire.com/posts/${file}`;
  const ogImage = "https://read.maxclickempire.com/assets/og-image.jpg";

  // Clean raw HTML content
  const cleanedContent = rawHtml
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<html[^>]*>|<\/html>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body[^>]*>|<\/body>/gi, "")
    .replace(/<main[^>]*>|<\/main>/gi, "")
    .replace(/<article[^>]*>|<\/article>/gi, "")
    .trim();

  const stats = fs.statSync(filePath);
  const existing = postMetadata[slug];
  const datePublished = existing?.datePublished || stats.birthtime.toISOString();
  const dateModified = stats.mtime.toISOString();

  const metadata = {
    ...(existing || {}),
    title,
    description,
    keywords,
    slug,
    canonical,
    ogImage,
    datePublished,
    dateModified,
  };

  const finalHtml = applyTemplate(template, metadata, cleanedContent);

  // Write to dist/
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped and saved to dist/: ${file}`);

  // Update metadata
  postMetadata[slug] = metadata;
});

// Save metadata only if changed
const newMetaJs = `// Auto-generated metadata\nconst postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };`;
const existingMetaJs = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, "utf8") : "";

if (newMetaJs !== existingMetaJs) {
  fs.writeFileSync(metaPath, newMetaJs, "utf8");
  console.log("💾 Updated data/post-meta.js");
} else {
  console.log("✅ No changes to post-meta.js");
}