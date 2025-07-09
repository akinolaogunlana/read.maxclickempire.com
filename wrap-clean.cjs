// ✅ Supreme Wrap-Clean Engine (MaxClickEmpire)

#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dist exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Read template
const template = fs.readFileSync(templatePath, "utf8");

// Helper: Generate hash of cleaned content to detect duplicates
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Helper: Slugify title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Track unique hashes to avoid duplicates
const seenHashes = new Set();

// Begin processing raw posts
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));
files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  let rawHtml = fs.readFileSync(rawPath, "utf8");

  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";
  const description = $("p").first().text().trim().replace(/\s+/g, " ") || "Post from MaxClickEmpire.";
  const content = $("article").html() || $("body").html() || rawHtml;
  const cleanContent = content.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/style="[^"]*"/g, "");

  const hash = generateHash(cleanContent);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  const date = new Date().toISOString().split("T")[0];
  const filename = slugify(title);
  const outputPath = path.join(distDir, `${filename}.html`);

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(" ").join(", "))
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, cleanContent);

  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped & Cleaned: ${filename}.html`);
});