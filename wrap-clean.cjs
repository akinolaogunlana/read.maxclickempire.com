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

// Helpers
const generateHash = (content) => crypto.createHash("sha256").update(content).digest("hex");

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "post";

// Memory
const seenHashes = new Set();
const seenDescriptions = new Set();

// Helpers
const isLowQuality = (desc) =>
  !desc || desc.length < 50 || /^read about/i.test(desc.toLowerCase()) || seenDescriptions.has(desc);

// Start
const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".html"));
let count = 0;

files.forEach((file) => {
  const filePath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // Extract title
  const title = $("h1").first().text().trim() || "Untitled Post";

  // Try to get valid description
  let description = $('meta[name="description"]').attr("content")?.trim();
  if (!description || isLowQuality(description)) {
    description = $("p").first().text().trim().replace(/\s+/g, " ");
  }
  if (!description || isLowQuality(description)) {
    description = `Read: ${title}. A useful article on MaxClickEmpire.`;
  }
  seenDescriptions.add(description);

  const filename = slugify(title);
  const date = new Date().toISOString().split("T")[0];

  // Extract main content
  let content = $("article").html() || $("body").html() || rawHtml;

  // Clean content: remove meta, script, style
  content = content
    .replace(/<meta[^>]+>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/gi, "");

  // Remove repeated title
  const safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleDupRegex = new RegExp(`<p[^>]*>${safeTitle}</p>`, "gi");
  content = content.replace(titleDupRegex, "");

  // Skip if duplicate
  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Structured data
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
</script>
`.trim();

  // Final HTML
  let finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(/\s+/).join(", "))
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{CONTENT}}/g, content.trim())
    .replace(/{{STRUCTURED_DATA}}/g, structuredData);

  // Safety cleanup: allow only 1 <meta name="description">
  const metaMatch = finalHtml.match(/<meta name="description"[^>]+>/gi) || [];
  if (metaMatch.length > 1) {
    finalHtml = finalHtml.replace(/<meta name="description"[^>]+>/gi, (match, i) =>
      i === 0 ? match : ""
    );
  }

  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Processed: ${filename}.html`);
  count++;
});

console.log(`\n🎉 Done. ${count} posts processed and wrapped.`);