#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Load template
if (!fs.existsSync(templatePath)) {
  console.error("❌ template.html not found!");
  process.exit(1);
}
const template = fs.readFileSync(templatePath, "utf8");

// Utility: hash generator
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Utility: slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Track duplicates
const seenHashes = new Set();

// Process each raw HTML file
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));
files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");

  const $ = cheerio.load(rawHtml);

  // Extract important elements
  const title = $("h1").first().text().trim() || "Untitled Post";
  const firstParagraph = $("p").first().text().trim().replace(/\s+/g, " ");
  const description = firstParagraph.length > 40 ? firstParagraph : title;
  const slug = slugify(title);
  const date = new Date().toISOString().split("T")[0];

  // Clean content
  $("h1").first().remove(); // Remove duplicate heading
  const cleanedContent = $("body").html() || rawHtml;
  const cleanHTML = cleanedContent
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const hash = generateHash(cleanHTML);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Keywords from title (no repetition)
  const keywords = [...new Set(title.toLowerCase().split(/\s+/).filter(w => w.length > 2))].join(", ");

  // Wrap in template
  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, slug)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, cleanHTML);

  const outputPath = path.join(distDir, `${slug}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped & Saved: ${slug}.html`);
});