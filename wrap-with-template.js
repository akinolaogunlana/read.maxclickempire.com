#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Paths
const rawDir = path.join(__dirname, "raw");
const distDir = path.join(__dirname, "dist");
const templatePath = path.join(__dirname, "template.html");

// Load base template
const template = fs.readFileSync(templatePath, "utf-8");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build posts
fs.readdirSync(rawDir).forEach((file) => {
  if (path.extname(file) !== ".html") return;

  const filePath = path.join(rawDir, file);
  let raw = fs.readFileSync(filePath, "utf-8");

  // Extract inline metadata
  const titleMatch = raw.match(/<!--\s*title:\s*(.*?)\s*-->/i);
  const descMatch = raw.match(/<!--\s*desc:\s*(.*?)\s*-->/i);
  const keywordsMatch = raw.match(/<!--\s*keywords:\s*(.*?)\s*-->/i);

  const title = titleMatch ? titleMatch[1].trim() : "Untitled";
  const description = descMatch ? descMatch[1].trim() : "";
  const keywords = keywordsMatch ? keywordsMatch[1].trim() : "";

  // Remove <title>, <meta>, and all metadata comments from post
  let cleanContent = raw
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<!--\s*(title|desc|keywords):.*?-->/gi, "")
    .trim();

  // Wrap in <main><article>...</article></main>
  const wrappedContent = `<main><article>\n${cleanContent}\n</article></main>`;

  // Create post slug (filename without extension)
  const postSlug = path.basename(file, ".html");

  // Replace placeholders
  let finalHtml = template
    .replace("{{TITLE}}", title)
    .replace("{{DESCRIPTION}}", description)
    .replace("{{KEYWORDS}}", keywords)
    .replace("{{POST_SLUG}}", postSlug)
    .replace("{{CONTENT}}", wrappedContent);

  // Write to /dist/
  const outputFilePath = path.join(distDir, file);
  fs.writeFileSync(outputFilePath, finalHtml, "utf-8");

  console.log(`✅ Built: ${file}`);
});