// wrap-with-template.js
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

// Paths (relative to repo root)
const templatePath = path.join(process.cwd(), "template.html");
const rawPostsDir = path.join(process.cwd(), "posts");
const wrappedPostsDir = path.join(process.cwd(), "dist");
const metaPath = path.join(process.cwd(), "data/post-meta.js");

// ==== SAFETY CHECKS ====
if (!fs.existsSync(templatePath)) {
  console.error(`❌ template.html not found at ${templatePath}`);
  process.exit(1);
}
if (!fs.existsSync(rawPostsDir)) {
  console.error(`❌ posts directory not found at ${rawPostsDir}`);
  process.exit(1);
}

// Ensure output directory exists
fs.mkdirSync(wrappedPostsDir, { recursive: true });

// Escape HTML quotes for meta tags
const escapeQuotes = (str = "") =>
  str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inject metadata + content into template
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

// Load existing metadata if available
function loadMetadata() {
  if (fs.existsSync(metaPath)) {
    try {
      const rawMeta = fs.readFileSync(metaPath, "utf8");
      const match = rawMeta.match(/let postMetadata\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        return eval(`(${match[1]})`);
      }
    } catch {
      console.warn("⚠️ Failed to parse post-meta.js. Starting fresh.");
    }
  }
  return {};
}

// Save metadata
function saveMetadata(postMetadata) {
  const metaContent = `// Auto-generated metadata
let postMetadata = ${JSON.stringify(postMetadata, null, 2)};
module.exports = { postMetadata };
`;
  fs.writeFileSync(metaPath, metaContent);
}

// Build one post
function buildPost(file) {
  if (!file.endsWith(".html")) return;
  const template = fs.readFileSync(templatePath, "utf8");
  let postMetadata = loadMetadata();

  const slug = path.basename(file, ".html");
  const rawPath = path.join(rawPostsDir, file);
  const outputPath = path.join(wrappedPostsDir, file);

  const rawHtml = fs.readFileSync(rawPath, "utf8");

  // Extract metadata from raw HTML
  const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
  const descMatch = rawHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const keywordsMatch = rawHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
  const ogImageMatch = rawHtml.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);

  const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, " ");
  const description = descMatch?.[1]?.trim() || "";
  const keywords = keywordsMatch?.[1]?.trim() || "";
  const ogImage = ogImageMatch?.[1]?.trim() || "";
  const canonical = `https://read.maxclickempire.com/${slug}.html`;
  const now = new Date().toISOString();

  // Preserve existing datePublished if available
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
    dateModified: now,
  };

  // Strip out unnecessary wrapping tags
  const cleaned = rawHtml
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .trim();

  // Inject into template
  const finalHtml = injectTemplate(template, postMetadata[slug], cleaned);

  // Save wrapped post
  fs.writeFileSync(outputPath, finalHtml, "utf8");
  saveMetadata(postMetadata);
  console.log(`✅ Built: dist/${file}`);
}

// Build all posts initially
fs.readdirSync(rawPostsDir).forEach(buildPost);

// Watch for changes
const watcher = chokidar.watch(rawPostsDir, { ignoreInitial: true });
watcher.on("add", filePath => buildPost(path.basename(filePath)));
watcher.on("change", filePath => buildPost(path.basename(filePath)));

console.log("🚀 Watching posts/ for changes...");