#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cheerio = require("cheerio");

// Load metadata
const { postMetadata } = require("./data/post-meta.js");

// Paths
const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Create dist if needed
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Load template
const baseTemplate = fs.readFileSync(templatePath, "utf8");

// Helpers
const generateHash = content =>
  crypto.createHash("sha256").update(content).digest("hex");

const slugify = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const seenHashes = new Set();

const files = fs.readdirSync(rawDir).filter(f => f.endsWith(".html"));

files.forEach(file => {
  const rawPath = path.join(rawDir, file);
  let rawHtml = fs.readFileSync(rawPath, "utf8");

  // Clean invisible chars
  rawHtml = rawHtml.replace(/[\uE000-\uF8FF]/g, "");

  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  // Cleanup: strip problematic tags
  $("html, head, link, title, meta, script").remove();
  $("[style]").removeAttr("style");

  $("*").each((_, el) => {
    for (const attr in el.attribs) {
      if (attr.startsWith("on")) $(el).removeAttr(attr);
    }
  });

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("<a")) $(el).removeAttr("href");
  });

  $("body meta[name='description']").remove();

  // Extract metadata
  const title = $("h1").first().text().trim() || "Untitled Post";
  const filename = slugify(title);

  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    postMetadata[filename]?.description ||
    $("p").first().text().trim().replace(/\s+/g, " ") ||
    "Post from MaxClickEmpire.";

  const date = new Date().toISOString();

  // Remove duplicate h1
  $("article h1").first().remove();
  $("body h1").first().remove();

  // Final content
  let content = $("article").html()?.trim();
  if (!content) content = $("body").html()?.trim() || rawHtml;

  if (!content || content.length < 10) {
    console.warn(`⚠️ Empty or invalid content in: ${file}`);
    return;
  }

  const hash = generateHash(content);
  if (seenHashes.has(hash)) {
    console.log(`⏭️  Skipped duplicate: ${file}`);
    return;
  }
  seenHashes.add(hash);

  // Structured Data
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
    author: { "@type": "Organization", name: "MaxClickEmpire" },
    publisher: {
      "@type": "Organization",
      name: "MaxClickEmpire",
      logo: {
        "@type": "ImageObject",
        url: "https://read.maxclickempire.com/assets/og-image.jpg",
      },
    },
    mainEntityOfPage: `https://read.maxclickempire.com/posts/${filename}.html`,
  },
  null,
  2
)}
</script>`.trim();

  // Replace placeholders
  let finalHtml = baseTemplate
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(" ").join(", "))
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, date)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{CONTENT}}/g, content);

  // Basic validation
  if (!finalHtml.includes("</html>") || !finalHtml.includes("</body>")) {
    console.error(`❌ Broken final HTML in: ${file}`);
    return;
  }

  // Save to dist
  const outputPath = path.join(distDir, `${filename}.html`);
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Generated: ${filename}.html`);
});