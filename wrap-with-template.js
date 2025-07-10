#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Read HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Helper: Slugify title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper: Hash to detect duplicates
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const seenHashes = new Set();

const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");
  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";
  const description = $("p").first().text().trim().replace(/\s+/g, " ") || "A helpful post from MaxClickEmpire.";
  const rawContent = $("article").html() || $("body").html() || rawHtml;

  // Remove <script> tags and inline styles
  const $clean = cheerio.load(rawContent);
  $clean("script").remove();
  $clean("[style]").removeAttr("style");

  // ❌ Remove first <h1> and <p> (they go in the hero)
  $clean("h1").first().remove();
  $clean("p").first().remove();

  const finalContent = $clean.html();
  const hash = generateHash(finalContent);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  const date = new Date().toISOString().split("T")[0];
  const slug = slugify(title);
  const outputPath = path.join(distDir, `${slug}.html`);

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.toLowerCase().split(/\s+/).filter(w => w.length > 2).join(", "))
    .replace(/{{FILENAME}}/g, slug)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, finalContent);

  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped & Cleaned: ${slug}.html`);
});