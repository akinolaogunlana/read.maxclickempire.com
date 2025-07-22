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
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Load template.html once
const rawTemplate = fs.readFileSync(templatePath, "utf8");

// To prevent duplicate posts
const seenHashes = new Set();

fs.readdirSync(postsDir).forEach((fileName) => {
  if (!fileName.endsWith(".html")) return;

  const filePath = path.join(postsDir, fileName);
  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // Strict cleanup: remove scripts, inline styles, classes, events
  $("script").remove();
  $("[style]").removeAttr("style");
  $("[class]").removeAttr("class");
  $("[onclick],[onload],[onmouseover],[onerror]").removeAttr("onclick onload onmouseover onerror");

  // Remove first h1 inside article/body to prevent duplication
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Use content from article or body
  const contentHtml = $("article").html() || $("body").html() || rawHtml;
  const content = contentHtml.trim();

  // Generate hash for duplicate check
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${fileName}`);
    return;
  }
  seenHashes.add(hash);

  const postId = path.basename(fileName, ".html");
  const meta = postMetadata[postId] || {};

  // Basic text content for fallback description and keywords
  const plainText = cheerio.load(content).text().replace(/\s+/g, " ").trim();
  const fallbackDescription = plainText.slice(0, 160);
  const fallbackKeywords = [...new Set(plainText.match(/\b[a-z]{5,}\b/gi) || [])]
    .slice(0, 10)
    .join(", ");

  const escapedDescription = (meta.description || fallbackDescription || "").replace(/"/g, "&quot;");
  const escapedKeywords = (meta.keywords || fallbackKeywords || "").replace(/"/g, "&quot;");

  const finalHtml = rawTemplate
    .replace(/{{TITLE}}/g, meta.title || "Untitled")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapedDescription)
    .replace(/{{KEYWORDS}}/g, escapedKeywords)
    .replace(/{{AUTHOR}}/g, meta.author || "Unknown")
    .replace(/{{CANONICAL}}/g, meta.canonical || "")
    .replace(/{{OG_IMAGE}}/g, meta.ogImage || "")
    .replace(/{{CONTENT}}/g, content);

  const outputPath = path.join(distDir, fileName);
  fs.writeFileSync(outputPath, finalHtml, "utf8");

  console.log(`✅ Wrapped and saved: ${fileName}`);
});