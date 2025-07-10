#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure required folders exist
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Read template
const template = fs.readFileSync(templatePath, "utf8");

// Hash generator for deduplication
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Slugify title for filename
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const seenHashes = new Set();

// Process HTML files
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));
files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");
  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";
  const description = $("meta[name='description']").attr("content") || $("p").first().text().trim() || "Post from MaxClickEmpire.";
  const bodyContent = $("article").html() || $("body").html() || rawHtml;
  const cleanContent = bodyContent
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/g, "");

  const hash = generateHash(cleanContent);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  const date = new Date().toISOString().split("T")[0];
  const filename = slugify(title);
  const outputPath = path.join(distDir, `${filename}.html`);

  const keywordList = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 10)
    .join(", ");

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywordList)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, cleanContent);

  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped & Cleaned: ${filename}.html`);
});
