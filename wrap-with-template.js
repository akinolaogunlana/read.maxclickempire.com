#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load the base HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Replace placeholders
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

  const contentPath = path.join(postsDir, file);
  let content = fs.readFileSync(contentPath, "utf8");

  // Clean previous wrapping if accidentally already wrapped
  content = content
    .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>\s*<\/html>/i, "");

  const finalHtml = placeholderReplacer(template, metadata, content.trim());

  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

// After wrapping, clean posts/ folder
postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  fs.unlinkSync(filePath);
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped and cleaned successfully.");