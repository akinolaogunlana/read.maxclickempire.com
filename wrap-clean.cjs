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

const isLowQuality = (desc) =>
  !desc || desc.length < 50 || /^read about/i.test(desc.toLowerCase());

const seenHashes = new Set();
const seenDescriptions = new Set();

let count = 0;

const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".html"));

files.forEach((file) => {
  const filePath = path.join(rawDir, file);
  const rawHtml = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(rawHtml);

  // Extract title
  const title = $("h1").first().text().trim() || "Untitled Post";

  // Get description
  let description = $('meta[name="description"]').attr("content")?.trim();
  if (!description || isLowQuality(description) || seenDescriptions.has(description)) {
    description = $("p").first().text().trim().replace(/\s+/g, " ");
  }
  if (!description || isLowQuality(description)) {
    description = `Read: ${title}. A useful article on MaxClickEmpire.`;
  }
  seenDescriptions.add(description);

  const slug = slugify(title);

  // Always use file creation & modification times
  const stats = fs.statSync(filePath);
  const datePublished = stats.birthtime.toISOString();
  const dateModified = stats.mtime.toISOString();

  // Extract main content
  let content =
    $("article").html() ||
    $("main").html() ||
    $("body").html() ||
    rawHtml;

  if (!content) {
    console.warn(`⚠️  No valid content found in: ${file}`);
    return;
  }

  // Clean up content
  content = content
    .replace(/<meta[^>]+>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/style="[^"]*"/gi, "");

  // Remove repeated <p>Title</p>
  const safeTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleDupRegex = new RegExp(`<p[^>]*>${safeTitle}</p>`, "gi");
  content = content.replace(titleDupRegex, "");

  // Remove duplicate <h1>
  let seenHeadings = new Set();
  $("article h1, body h1").each((i, el) => {
    const text = $(el).text().trim();
    if (seenHeadings.has(text)) {
      $(el).remove();
    } else {
      seenHeadings.add(text);
    }
  });

  // Skip duplicate hashes
  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⚠️ Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Wrap in <main><article>
  content = `<main><article datetime="${datePublished}">\n${content.trim()}\n</article></main>`;

  // Generate keywords
  const keywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .join(", ");

  // Structured data
  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${title}",
  "description": "${description}",
  "url": "https://read.maxclickempire.com/posts/${slug}.html",
  "datePublished": "${datePublished}",
  "dateModified": "${dateModified}",
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
    "@id": "https://read.maxclickempire.com/posts/${slug}.html"
  }
}
</script>
`.trim();

  // Final HTML
  let finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{POST_SLUG}}/g, slug)
    .replace(/{{DATE}}/g, datePublished.split("T")[0])
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{CONTENT}}/g, content);

  // Only keep first <meta name="description">
  const metaMatches = finalHtml.match(/<meta name="description"[^>]+>/gi) || [];
  if (metaMatches.length > 1) {
    finalHtml = finalHtml.replace(/<meta name="description"[^>]+>/gi, (match, i) =>
      i === 0 ? match : ""
    );
  }

  // Write to dist
  const outputPath = path.join(distDir, `${slug}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Processed: ${slug}.html`);
  count++;
});

console.log(`\n🎉 Done. ${count} posts processed and wrapped.`);