#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Load metadata from post-meta.js
const { postMetadata } = require("./data/post-meta.js");

// Define paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Load template HTML
const template = fs.readFileSync(templatePath, "utf8");

// Helper functions
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

// Get all raw .html files
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  let rawHtml = fs.readFileSync(rawPath, "utf8");

  // 🚫 Remove hidden Unicode characters (e.g., \uE000–\uF8FF)
  rawHtml = rawHtml.replace(/[\uE000-\uF8FF]/g, "");

  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  // 🧼 CLEANUP SECTION
  $("html, head, link, title, meta").remove(); // Remove unwanted tags
  $("script").remove();                        // Remove scripts
  $("[style]").removeAttr("style");            // Remove inline styles

  // Remove inline JS event handlers (onclick, etc.)
  $("*").each((_, el) => {
    const attribs = el.attribs || {};
    Object.keys(attribs).forEach(attr => {
      if (attr.startsWith("on")) $(el).removeAttr(attr);
    });
  });

  // Fix broken <a href> tags
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("<a")) $(el).removeAttr("href");
  });

  // Remove meta description in body if any
  $("body meta[name='description']").remove();

  // Metadata
  const title = $("h1").first().text().trim() || "Untitled Post";
  const filename = slugify(title);

  let description =
    $("meta[name='description']").attr("content")?.trim() ||
    postMetadata[filename]?.description ||
    $("p").first().text().trim().replace(/\s+/g, " ") ||
    "Post from MaxClickEmpire.";

  const date = new Date().toISOString();

  // Remove <h1> from <article> or <body>
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Extract main content
  let content = $("article").html()?.trim();
  if (!content) content = $("body").html()?.trim() || rawHtml;

  // Prevent duplicate output
  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⚠️  Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Structured Data (JSON-LD)
  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${title}",
  "description": "${description}",
  "url": "https://read.maxclickempire.com/posts/${filename}.html",
  "datePublished": "${date}",
  "dateModified": "${date}",
  "author": {
    "@type": "Organization",
    "name": "MaxClickEmpire"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://read.maxclickempire.com/assets/og-image.jpg"
    }
  },
  "mainEntityOfPage": "https://read.maxclickempire.com/posts/${filename}.html"
}
</script>`.trim();

  // Replace tokens in template
  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(" ").join(", "))
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{CONTENT}}/g, content);

  // Write to output directory
  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");

  console.log(`✅ Wrapped & Cleaned: ${filename}.html`);
});