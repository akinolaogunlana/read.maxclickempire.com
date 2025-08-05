#!/usr/bin/env node

// Required modules
const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

// Define paths
const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Read and store the base template
const template = fs.readFileSync(templatePath, "utf8");

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
    .replace(/{{CONTENT}}/g, content || "");
}

// Process all .html post files
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️  Skipped: No metadata found for slug '${slug}'`);
    return;
  }

  const contentPath = path.join(postsDir, file);
  const content = fs.readFileSync(contentPath, "utf8");

  const finalHtml = applyTemplate(template, metadata, content);
  const outputPath = path.join(distDir, file);

  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Processed and saved: ${file}`);
});