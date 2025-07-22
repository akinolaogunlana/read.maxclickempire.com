#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

// Define paths
const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load template.html once
let template;
try {
  template = fs.readFileSync(templatePath, "utf8");
} catch (err) {
  console.error("❌ Failed to load template.html:", err.message);
  process.exit(1);
}

// Function to sanitize and clean raw HTML content
function cleanUpContent(rawHtml, postTitle) {
  const $ = cheerio.load(rawHtml);

  // Remove potential duplicates or irrelevant tags
  $("title").remove();
  $("h1").filter((_, el) => $(el).text().trim() === postTitle).remove();
  $(".hero-title, .post-title, .title-heading").remove();

  return $("body").html() || ""; // Return only body content if available
}

// Function to inject metadata into the HTML template
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

// Get all post HTML files
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

if (postFiles.length === 0) {
  console.warn("⚠️ No HTML posts found in /posts.");
}

// Process each post
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
    // Remove existing version if any
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`🧹 Removed existing version of: ${file}`);
    }

    // Read and sanitize raw content
    const rawContent = fs.readFileSync(filePath, "utf8");
    const cleanedContent = cleanUpContent(rawContent, metadata.title);

    // Inject content into template
    const finalHtml = injectMetadata(template, metadata, cleanedContent);

    // Save to dist directory
    fs.writeFileSync(outputPath, finalHtml);
    console.log(`✅ Successfully wrapped and saved: ${file}`);
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});