const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const outputDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Load HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Try to load existing metadata
let postMetadata = {};
if (fs.existsSync(metaPath)) {
  try {
    const rawMeta = fs.readFileSync(metaPath, "utf8");
    const match = rawMeta.match(/let postMetadata\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      postMetadata = eval(`(${match[1]})`);
    }
  } catch (err) {
    console.warn("⚠️ Could not load existing post-meta.js. Starting fresh.");
  }
}

// Escape double quotes for HTML attribute safety
const escapeQuotes = (str = "") =>
  str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace placeholders in template
const injectTemplate = (html, metadata, content) => {
  return html
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
};

// Process each HTML file in /posts
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const contentPath = path.join(postsDir, file);
  const rawHtml = fs.readFileSync(contentPath, "utf8");

  // Extract metadata
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

  // Update post metadata
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
  let cleaned = rawHtml
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|body|head)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .trim();

  // Inject into template
  const finalHtml = injectTemplate(template, postMetadata[slug], cleaned);

  // Write to /dist
  const outPath = path.join(outputDir, file);
  fs.writeFileSync(outPath, finalHtml);
  console.log(`✅ Built dist/${file}`);
});

// Write updated metadata back to file
const metaJs = `// Auto-generated metadata
let postMetadata = ${JSON.stringify(postMetadata, null, 2)};
module.exports = { postMetadata };`;

fs.writeFileSync(metaPath, metaJs);
console.log("💾 Metadata written to data/post-meta.js");

// Clean up processed posts/
postFiles.forEach(file => {
  fs.unlinkSync(path.join(postsDir, file));
  console.log(`🧹 Deleted posts/${file}`);
});

console.log("🎉 All posts wrapped successfully.");