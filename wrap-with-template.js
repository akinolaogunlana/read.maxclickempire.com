#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure directories exist
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Load template
const template = fs.readFileSync(templatePath, "utf8");

// Hash to avoid duplicates
function generateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Slugify title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const seenHashes = new Set();

// Process each file in "raw"
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");
  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";
  const description = $("meta[name='description']").attr("content") || $("p").first().text().trim().replace(/\s+/g, " ") || "Post from MaxClickEmpire.";

  // Remove scripts and inline styles
  $("script").remove();
  $("[style]").removeAttr("style");

  // Remove duplicated h1s inside content
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Extract content
  const mainContent = $("article").html() || $("body").html() || rawHtml;
  const content$ = cheerio.load(mainContent);

  // Remove repeated h1 if present again
  content$("h1").each((i, el) => {
    if (content$(el).text().trim() === title && i === 0) {
      content$(el).remove();
    }
  });

  // Optional: remove heading "Introduction"
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

  // Generate keywords from title
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
    .replace(/{{CONTENT}}/g, cleanedContent);

  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Processed: ${filename}.html`);
});