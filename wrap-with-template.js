#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load HTML template
const baseTemplate = fs.readFileSync(templatePath, "utf8");

const generateHash = (content) =>
  crypto.createHash("sha256").update(content).digest("hex");

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const extractFirstParagraph = ($) => {
  const p = $("p").first().text().trim();
  return p.replace(/\s+/g, " ");
};

const seenHashes = new Set();
const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".html"));

files.forEach((file) => {
  const rawPath = path.join(rawDir, file);
  let rawHtml = fs.readFileSync(rawPath, "utf8").replace(/[\uE000-\uF8FF]/g, "");

  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  // Clean potentially dangerous content
  $("script, link, title, meta").remove();
  $("[style]").removeAttr("style");
  $("*").each((_, el) => {
    for (const attr in el.attribs) {
      if (attr.startsWith("on")) $(el).removeAttr(attr);
    }
  });

  // Extract title from <h1>
  const title = $("h1").first().text().trim() || "Untitled Post";
  const filename = slugify(title);

  // Extract or generate description
  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    postMetadata[filename]?.description ||
    extractFirstParagraph($) ||
    "Post from MaxClickEmpire.";

  const date = new Date().toISOString();

  // Remove duplicate <h1>
  $("h1").first().remove();

  // Get meaningful content
  let content = $("article").html()?.trim() || $("body").html()?.trim() || rawHtml;
  if (!content || content.length < 10) {
    console.warn(`⚠️  Empty or invalid content in: ${file}`);
    return;
  }

  // Skip duplicates
  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⏭️  Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Build JSON-LD structured data
  const structuredData = `
<script type="application/ld+json">
${JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `https://read.maxclickempire.com/posts/${filename}.html`,
    datePublished: date,
    dateModified: date,
    author: {
      "@type": "Organization",
      name: "MaxClickEmpire",
    },
    publisher: {
      "@type": "Organization",
      name: "MaxClickEmpire",
      logo: {
        "@type": "ImageObject",
        url: "https://read.maxclickempire.com/assets/og-image.jpg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://read.maxclickempire.com/posts/${filename}.html`,
    },
  },
  null,
  2
)}
</script>`.trim();

  // Generate keywords from title
  const keywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .join(", ");

  const descriptionEscaped = escapeHtml(description);

  // Final output HTML
  const finalHtml = baseTemplate
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION_ESCAPED}}/g, descriptionEscaped)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{CONTENT}}/g, content);

  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Generated: ${filename}.html`);
});