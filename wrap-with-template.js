#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load and cache the HTML template
let template;
try {
  template = fs.readFileSync(templatePath, "utf8");
} catch (err) {
  console.error(`❌ Failed to read template.html:`, err.message);
  process.exit(1);
}

// Replace placeholders with post-specific content
function injectMetadata(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, content || "");
}

// Get all .html files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

if (postFiles.length === 0) {
  console.warn("⚠️ No post files found in /posts.");
}

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️ Skipping "${file}" – no metadata found for slug: "${slug}"`);
    return;
  }

  const filePath = path.join(postsDir, file);
  const outputPath = path.join(distDir, file);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const finalHtml = injectMetadata(template, metadata, content);
    fs.writeFileSync(outputPath, finalHtml);
    console.log(`✅ Processed: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to process ${file}:`, err.message);
  }
});