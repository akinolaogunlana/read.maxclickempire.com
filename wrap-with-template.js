#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load the HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Replace placeholders in the template
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

// Read all HTML files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️ No metadata found for slug: ${slug}, skipping...`);
    return;
  }

  const rawPath = path.join(postsDir, file);
  let content = fs.readFileSync(rawPath, "utf8");

  // Remove old <html>, <head>, <body>, </html>, </body>, meta tags if any
  content = content
    .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, "") // remove everything before <body>
    .replace(/<\/body>\s*<\/html>/i, "")                // remove everything after </body>
    .replace(/<meta[^>]*name=["']description["'][^>]*>/gi, "") // remove duplicate description tags
    .trim();

  const finalHtml = placeholderReplacer(template, metadata, content);

  const distPath = path.join(distDir, file);
  fs.writeFileSync(distPath, finalHtml);
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

// After wrapping, clean posts/ folder
postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  fs.unlinkSync(filePath);
  console.log(`🧹 Deleted raw post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped and cleaned successfully.");