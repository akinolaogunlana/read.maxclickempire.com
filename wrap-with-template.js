#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const template = fs.readFileSync(templatePath, "utf8");

function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const seenHashes = new Set();
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");
  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";
  const description =
    $("meta[name='description']").attr("content") ||
    $("p").first().text().trim() ||
    "Post from MaxClickEmpire.";

  let content = $("article").html() || $("body").html() || rawHtml;
  const content$ = cheerio.load(content);

  // 🧹 Remove repeated <h1> titles from top of content
  content$("h1").each((i, el) => {
    if (content$(el).text().trim() === title && i === 0) {
      content$(el).remove();
    }
  });

  // Remove "Introduction" if it's the first element (optional)
  const firstTag = content$.root().children().first();
  if (
    firstTag.text().trim().toLowerCase() === "introduction" &&
    firstTag[0].tagName.match(/^h\d$/)
  ) {
    firstTag.remove();
  }

  // Final cleaned content
  const cleaned = content$
    .html()
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/g, "");

  const hash = generateHash(cleaned);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  const date = new Date().toISOString().split("T")[0];
  const filename = slugify(title);
  const outputPath = path.join(distDir, `${filename}.html`);

  const keywords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 10)
    .join(", ");

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, cleaned);

  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Wrapped & Cleaned: ${filename}.html`);
});