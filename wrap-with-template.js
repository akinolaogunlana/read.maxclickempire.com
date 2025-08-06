const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "template.html");
const rawPostsDir = path.join(__dirname, "dist");       // Raw HTML source
const wrappedPostsDir = path.join(__dirname, "posts");  // Final output
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure output directory exists
fs.mkdirSync(wrappedPostsDir, { recursive: true });

// Load HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Load metadata if available
let postMetadata = {};
if (fs.existsSync(metaPath)) {
  try {
    const rawMeta = fs.readFileSync(metaPath, "utf8");
    const match = rawMeta.match(/let postMetadata\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      postMetadata = eval(`(${match[1]})`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to load post-meta.js. Starting fresh.");
  }
}

// Escape double quotes and angle brackets for safe injection
const escapeQuotes = (str = "") =>
  str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace placeholders in template with metadata and content
const injectTemplate = (html, metadata, content) =>
  html
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION}}/g, metadata.description || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapeQuotes(metadata.description || ""))
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "Ogunlana Akinola Okikiola")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{DATE_PUBLISHED}}/g, metadata.datePublished || "")
    .replace(/{{DATE_MODIFIED}}/g, metadata.dateModified || "")
    .replace(/{{CONTENT}}/g, content || "");

// Process all .html files from /dist
const rawFiles = fs.readdirSync(rawPostsDir).filter(file => file.endsWith(".html"));

rawFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const rawPath = path.join(rawPostsDir, file);
  const outputPath = path.join(wrappedPostsDir, file);

  if (fs.existsSync(outputPath)) {
    console.log(`⏩ Skipped (already exists): posts/${file}`);
    return;
  }

  const rawHtml = fs.readFileSync(rawPath, "utf8");

  // Metadata extraction
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
  const ogImageMatch = rawHtml.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);

  const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, ' ');
  const description = descMatch?.[1]?.trim() || "";
  const keywords = keywordsMatch?.[1]?.trim() || "";
  const ogImage = ogImageMatch?.[1]?.trim() || "";
  const canonical = `https://read.maxclickempire.com/${slug}`;
  const now = new Date().toISOString();

  postMetadata[slug] = {
    ...(postMetadata[slug] || {}),
    title,
    description,
    keywords,
    ogImage,
    canonical,
    slug,
    author: "Ogunlana Akinola Okikiola",
    datePublished: postMetadata[slug]?.datePublished || now,
    dateModified: now
  };

  // Clean up raw HTML content
  const cleaned = rawHtml
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .trim();

  // Inject content and metadata into template
  const finalHtml = injectTemplate(template, postMetadata[slug], cleaned);

  // Write wrapped file
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  console.log(`✅ Built: posts/${file}`);
});

// Save metadata
const metaContent = `// Auto-generated metadata
let postMetadata = ${JSON.stringify(postMetadata, null, 2)};
module.exports = { postMetadata };
`;
fs.writeFileSync(metaPath, metaContent);
console.log("💾 Updated metadata in data/post-meta.js");

console.log("🎉 Wrap complete. Manual posts preserved.");