#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load base template
const rawTemplate = fs.readFileSync(templatePath, "utf8");

// Track hashes to skip duplicates
const seenHashes = new Set();

fs.readdirSync(postsDir).forEach((fileName) => {
  const filePath = path.join(postsDir, fileName);
  if (!fileName.endsWith(".html")) return;

  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // ❌ Remove previous templates or wrappers
  $("main").remove();

  // ❌ Remove duplicate <article> tags, keep first only
  const articles = $("article");
  if (articles.length > 1) {
    articles.slice(1).remove();
  }

  // ❌ Remove duplicate <h1>, keep first only
  const h1s = $("h1");
  if (h1s.length > 1) {
    h1s.slice(1).remove();
  }

  // ❌ Remove all script tags and inline styles
  $("script").remove();
  $("[style]").removeAttr("style");

  // ✅ Clean and fallback content
  let content = $("article").html() ||
                $("body").html() ||
                $.root().html() ||
                rawHtml;
  content = content.trim();

  // ⛔ Skip duplicate HTML contents
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${fileName}`);
    return;
  }
  seenHashes.add(hash);

  // 📦 Metadata for this post
  const postId = path.basename(fileName, ".html");
  const meta = postMetadata[postId] || {};
  const escapedDescription = (meta.description || "").replace(/"/g, "");

  // 🧠 Inject into template
  const finalHtml = rawTemplate
    .replace(/{{TITLE}}/g, meta.title || "Untitled")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapedDescription)
    .replace(/{{KEYWORDS}}/g, meta.keywords || "")
    .replace(/{{AUTHOR}}/g, meta.author || "Unknown")
    .replace(/{{CANONICAL}}/g, meta.canonical || "")
    .replace(/{{OG_IMAGE}}/g, meta.ogImage || "")
    .replace(/{{CONTENT}}/g, content);

  // 💾 Save to /dist
  const outputPath = path.join(distDir, fileName);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped and saved: ${fileName}`);
});