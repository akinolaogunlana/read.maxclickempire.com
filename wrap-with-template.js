#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Directories
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dirs exist
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Load template
const template = fs.readFileSync(templatePath, "utf8");

// Utility: Slugify
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Utility: Generate SHA256 hash
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const seenHashes = new Set();

// Process HTML files
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const filePath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // Extract title
  const title = $("h1").first().text().trim() || "Untitled Post";

  // Description from meta or first paragraph
  const description =
    $("meta[name='description']").attr("content") ||
    $("p").first().text().trim().replace(/\s+/g, " ") ||
    "Post from MaxClickEmpire.";

  // Clean up raw HTML
  $("script").remove();
  $("[style]").removeAttr("style");
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Extract main content
  const contentHTML = $("article").html() || $("body").html() || rawHtml;
  const content$ = cheerio.load(contentHTML);

  // Remove repeated title again if inside article
  content$("h1").each((i, el) => {
    if (content$(el).text().trim() === title && i === 0) {
      content$(el).remove();
    }
  });

  // Remove "Introduction" heading
  const firstTag = content$.root().children().first();
  if (
    firstTag.text().trim().toLowerCase() === "introduction" &&
    firstTag[0]?.tagName?.match(/^h\d$/)
  ) {
    firstTag.remove();
  }

  const cleanedContent = content$
    .html()
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/g, "")
    .trim();

  const hash = generateHash(cleanedContent);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  const date = new Date().toISOString().split("T")[0];
  const filename = slugify(title);

  // Generate keywords
  const keywords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 10)
    .join(", ");

  // Build final HTML
  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, cleanedContent);

  // Output
  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Processed: ${filename}.html`);
});