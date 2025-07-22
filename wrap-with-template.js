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
  fs.mkdirSync(distDir, { recursive: true });
}

// Load template once
let template;
try {
  template = fs.readFileSync(templatePath, "utf8");
} catch (err) {
  console.error("❌ Failed to load template.html:", err.message);
  process.exit(1);
}

// Hash tracker to avoid duplicates
const seenHashes = new Set();

// Generate SHA-256 hash
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Clean raw HTML content
function cleanUpContent(rawHtml, postTitle) {
  const $ = cheerio.load(rawHtml);

  // Remove <title> tag
  $("title").remove();

  // Remove any <h1> that exactly matches the post title
  $("h1").filter((_, el) => $(el).text().trim() === postTitle).remove();

  // Remove script tags and inline styles
  $("script").remove();
  $("[style]").removeAttr("style");

  // Remove common hero titles
  $(".hero-title, .post-title, .title-heading").remove();

  // Remove first <h1> inside article or body
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Use <article> or fallback to <body> or raw HTML
  const content = $("article").html() || $("body").html() || rawHtml;
  return content.trim();
}

// Inject metadata into the template
function injectMetadata(template, metadata, cleanedContent) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, cleanedContent || "");
}

// Get all post files
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

if (postFiles.length === 0) {
  console.warn("⚠️ No HTML posts found in /posts.");
}

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️ Skipping ${file} — no metadata found.`);
    return;
  }

  const filePath = path.join(postsDir, file);
  const outputPath = path.join(distDir, file);

  try {
    const rawContent = fs.readFileSync(filePath, "utf8");
    const cleanedContent = cleanUpContent(rawContent, metadata.title);

    const hash = generateHash(cleanedContent);
    if (seenHashes.has(hash)) {
      console.log(`⚠️ Duplicate skipped: ${file}`);
      return;
    }
    seenHashes.add(hash);

    // Remove previous version if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`🧹 Removed old wrapped file: ${file}`);
    }

    const finalHtml = injectMetadata(template, metadata, cleanedContent);
    fs.writeFileSync(outputPath, finalHtml);

    console.log(`✅ Wrapped clean content into: ${file}`);
  } catch (err) {
    console.error(`❌ Failed processing ${file}:`, err.message);
  }
});