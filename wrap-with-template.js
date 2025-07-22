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

// Clean raw HTML content and eliminate duplication
function cleanUpContent(rawHtml, postTitle) {
  const $ = cheerio.load(rawHtml);

  // Remove <title> if present
  $("title").remove();

  // Remove any <h1> that exactly matches the post title
  $("h1").filter((_, el) => $(el).text().trim() === postTitle).remove();

  // Remove hero titles or known duplicate classes
  $(".hero-title, .post-title, .title-heading").remove();

  return $.html();
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
    // Cleanup old version if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`🧹 Removed old wrapped file: ${file}`);
    }

    // Load and clean raw HTML
    const rawContent = fs.readFileSync(filePath, "utf8");
    const cleanedContent = cleanUpContent(rawContent, metadata.title);

    // Inject cleaned content into template
    const finalHtml = injectMetadata(template, metadata, cleanedContent);

    // Write to dist
    fs.writeFileSync(outputPath, finalHtml);
    console.log(`✅ Wrapped clean content into: ${file}`);
  } catch (err) {
    console.error(`❌ Failed processing ${file}:`, err.message);
  }
});