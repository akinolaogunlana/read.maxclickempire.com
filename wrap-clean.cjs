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

// Load template
const template = fs.readFileSync(templatePath, "utf8");

// Utility: hash content
const generateHash = (content) =>
  crypto.createHash("sha256").update(content).digest("hex");

// Utility: slugify
const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "post";

// Track seen hashes and descriptions
const seenHashes = new Set();
const seenDescriptions = new Set();

// Quality checker
function isLowQuality(desc) {
  return (
    desc.length < 50 ||
    /^read about/i.test(desc.toLowerCase()) ||
    seenDescriptions.has(desc)
  );
}

// Process posts
const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));
let count = 0;

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(rawPath, "utf8");
  const $ = cheerio.load(rawHtml);

  const title = $("h1").first().text().trim() || "Untitled Post";

  // Prefer existing meta description in raw HTML
  let description = $('meta[name="description"]').attr("content")?.trim();

  // Fallback to first <p> or generic message
  if (!description || isLowQuality(description)) {
    description = $("p").first().text().trim().replace(/\s+/g, " ");
  }
  if (!description || isLowQuality(description)) {
    description = `Read: ${title}. A useful article on MaxClickEmpire.`;
  }

  seenDescriptions.add(description);

  const filename = slugify(title);
  const date = new Date().toISOString().split("T")[0];

  // Prefer <article> > <body> > full HTML
  let content = $("article").html() || $("body").html() || rawHtml;

  // Clean: remove inline <meta>, <script>, and inline style
  content = content
    .replace(/<meta[^>]+>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/gi, "");

  // Remove duplicate title <p>
  const rawTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dupTitleRegex = new RegExp(`<p[^>]*>${rawTitle}</p>`, "gi");
  content = content.replace(dupTitleRegex, "");

  // Skip duplicate content
  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Duplicate skipped: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Structured Data
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
  "image": "https://read.maxclickempire.com/assets/og-image.jpg",
  "author": {
    "@type": "Person",
    "name": "Ogunlana Akinola Okikiola"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://read.maxclickempire.com/assets/favicon.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://read.maxclickempire.com/posts/${filename}.html"
  }
}
</script>`.trim();

  // Final HTML render
  let outputHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(/\s+/).join(", "))
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, content.trim())
    .replace(/{{STRUCTURED_DATA}}/g, structuredData);

  // Final safety check: ensure only one meta description tag
  outputHtml = outputHtml.replace(/<meta name="description"[^>]+>/gi, (match, offset, str) => {
    if (str.indexOf(match) !== offset) return ""; // remove duplicates
    return match; // keep first only
  });

  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, outputHtml, "utf8");
  console.log(`✅ Processed: ${filename}.html`);
  count++;
});

console.log(`\n🎉 Done. ${count} posts wrapped cleanly.`);