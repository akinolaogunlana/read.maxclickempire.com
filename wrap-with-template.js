#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load template.html once
const rawTemplate = fs.readFileSync(templatePath, "utf8");

fs.readdirSync(postsDir).forEach((fileName) => {
  const filePath = path.join(postsDir, fileName);
  if (!fileName.endsWith(".html")) return;

  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // Clean any previously wrapped content
  let postContent = $("main").length ? $("main").html() : $("body").html() || $.root().html();

  // Fallback cleanup for double-wrapped pages or full HTML pages
  const $clean = cheerio.load(postContent || rawHtml);
  const cleanedContent = $clean.root().html();

  const postId = path.basename(fileName, ".html");
  const meta = postMetadata[postId] || {};

  // Escape quotes in description
  const escapedDescription = (meta.description || "").replace(/"/g, "&quot;");

  // Inject into template
  const finalHtml = rawTemplate
    .replace(/{{TITLE}}/g, meta.title || "Untitled")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapedDescription)
    .replace(/{{KEYWORDS}}/g, meta.keywords || "")
    .replace(/{{AUTHOR}}/g, meta.author || "Unknown")
    .replace(/{{CANONICAL}}/g, meta.canonical || "")
    .replace(/{{OG_IMAGE}}/g, meta.ogImage || "")
    .replace(/{{CONTENT}}/g, cleanedContent || "");

  // Save to dist/
  const outputPath = path.join(distDir, fileName);
  fs.writeFileSync(outputPath, finalHtml, "utf8");

  console.log(`✅ Wrapped and saved: ${fileName}`);
});