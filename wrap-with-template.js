#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

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

const formatDate = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const seenHashes = new Set();
const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".html"));

files.forEach((file) => {
  const rawPath = path.join(rawDir, file);
  let rawHtml = fs.readFileSync(rawPath, "utf8").replace(/[\uE000-\uF8FF]/g, "");

  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  // Remove unsafe tags/attributes
  $("script, link, title, meta").remove();
  $("[style]").removeAttr("style");
  $("*").each((_, el) => {
    for (const attr in el.attribs) {
      if (attr.startsWith("on")) $(el).removeAttr(attr);
    }
  });

  // Extract title and generate filename
  const title = $("h1").first().text().trim() || "Untitled Post";
  const filename = slugify(title);
  const filenameEncoded = encodeURIComponent(filename);

  // Description logic
  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    postMetadata[filename]?.description ||
    extractFirstParagraph($) ||
    "Post from MaxClickEmpire.";

  const dateISO = new Date().toISOString();
  const dateHuman = formatDate(dateISO);

  $("h1").first().remove();

  // Extract article content
  let content = $("article").html()?.trim() || $("body").html()?.trim() || rawHtml;
  if (!content || content.length < 10) {
    console.warn(`⚠️  Skipping empty or invalid: ${file}`);
    return;
  }

  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⏭️  Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // JSON-LD structured data
  const structuredData = `
<script type="application/ld+json">
${JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: `https://read.maxclickempire.com/posts/${filenameEncoded}.html`,
    datePublished: dateISO,
    dateModified: dateISO,
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
      "@id": `https://read.maxclickempire.com/posts/${filenameEncoded}.html`,
    },
  },
  null,
  2
)}
</script>`.trim();

  const keywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .join(", ");

  const descriptionEscaped = escapeHtml(description);

  // Inject data into the template
  const finalHtml = baseTemplate
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION_ESCAPED}}/g, descriptionEscaped)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename) // if still used
    .replace(/{{FILENAME_ENCODED}}/g, filenameEncoded)
    .replace(/{{PUBLISHED_DATE_ISO}}/g, dateISO)
    .replace(/{{PUBLISHED_DATE_HUMAN}}/g, dateHuman)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{CONTENT}}/g, content);

  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Generated: ${filename}.html`);
});