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
} catch {
  console.warn("⚠️ Could not load post-meta.js. Starting fresh.");
}

// Helper: escape HTML for meta tags
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

// Replace placeholders in the template
function applyTemplate(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION}}/g, metadata.description || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapeHtml(metadata.description || ""))
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "Ogunlana Akinola Okikiola")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{DATE_PUBLISHED}}/g, metadata.datePublished || "")
    .replace(/{{DATE_MODIFIED}}/g, metadata.dateModified || "")
    .replace(/{{CONTENT}}/g, content || "");
}

// Get all HTML files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");

  // Extract content and meta
  const titleMatch = rawHtml.match(/<title>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
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

  const metadata = {
    ...(existing || {}),
    title,
    description,
    keywords,
    author: "Ogunlana Akinola Okikiola",
    slug,
    canonical: `https://read.maxclickempire.com/posts/${file}`,
    ogImage: `https://read.maxclickempire.com/assets/og-image.jpg`,
    datePublished,
    dateModified
  };

  // Generate final HTML
  const finalHtml = applyTemplate(template, metadata, cleanedContent.trim());

  // Save to dist
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

// Optional: clean up posts (disabled by default)
/*
postFiles.forEach(file => {
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});
*/