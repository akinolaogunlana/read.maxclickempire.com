// wrap-with-template.js — robust, CI-friendly, local-watch safe
const fs = require("fs");
const path = require("path");

// Detect CI environment (GitHub Actions sets CI=true)
const isCI = process.env.CI === "true";

// Conditionally require chokidar only when running locally (so CI won't fail if not installed)
let chokidar = null;
if (!isCI) {
  try {
    chokidar = require("chokidar");
  } catch (err) {
    console.warn("⚠️ chokidar not installed — live watch disabled. Run `npm install chokidar` to enable.");
  }
}

// Config
const SITE_URL = process.env.SITE_URL || "https://read.maxclickempire.com";
const templatePath = path.join(process.cwd(), "template.html");

// Swap these as requested:
const rawPostsDir = path.join(process.cwd(), "dist");     // now source folder
const wrappedPostsDir = path.join(process.cwd(), "posts"); // now output folder

const metaPath = path.join(process.cwd(), "data", "post-meta.js");

// === SAFETY CHECKS ===
if (!fs.existsSync(templatePath)) {
  console.error(`❌ template.html not found at ${templatePath}`);
  process.exit(1);
}
if (!fs.existsSync(rawPostsDir)) {
  console.error(`❌ dist directory not found at ${rawPostsDir}`);
  process.exit(1);
}
fs.mkdirSync(wrappedPostsDir, { recursive: true });
fs.mkdirSync(path.dirname(metaPath), { recursive: true });

// Helpers: parse meta tags robustly (handles attribute order & quoting)
function parseMetaTags(html) {
  const out = [];
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = {};
    const attrPairs = tag.match(/([a-zA-Z\-:]+)\s*=\s*(".*?"|'.*?'|\S+)/g) || [];
    for (const pair of attrPairs) {
      const eqIdx = pair.indexOf('=');
      const key = pair.slice(0, eqIdx).trim().toLowerCase();
      let val = pair.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      attrs[key] = val;
    }
    out.push(attrs);
  }
  return out;
}

// Extract metadata (supports <!-- Meta description: ... --> style comments + <meta> tags + <h1> fallback)
function extractMetadataFromHtml(html, slug) {
  const commentDesc = html.match(/<!--\s*(?:Meta|meta)\s+description\s*[:\-\s]\s*([\s\S]*?)\s*-->/i);
  const commentKeys = html.match(/<!--\s*(?:Meta|meta)\s+keywords\s*[:\-\s]\s*([\s\S]*?)\s*-->/i);

  const metas = parseMetaTags(html);
  let description = "";
  let keywords = "";
  let ogImage = "";

  for (const m of metas) {
    if (m.name && m.name.toLowerCase() === "description" && m.content) {
      description = description || m.content;
    }
    if (m.name && m.name.toLowerCase() === "keywords" && m.content) {
      keywords = keywords || m.content;
    }
    if ((m.property && m.property.toLowerCase() === "og:image") || (m.name && m.name.toLowerCase() === "og:image")) {
      ogImage = ogImage || m.content || m["content"];
    }
  }

  if (!description && commentDesc) {
    description = commentDesc[1].trim();
  }
  if (!keywords && commentKeys) {
    keywords = commentKeys[1].trim();
  }

  let title = "";
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) title = titleTag[1].trim();
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) title = h1[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
  }
  if (!title) title = slug.replace(/-/g, " ");

  return {
    title: title || "",
    description: (description || "").trim(),
    keywords: (keywords || "").trim(),
    ogImage: (ogImage || "").trim(),
  };
}

// Load metadata: try require first, fallback to parsing file content
function loadMetadata() {
  if (!fs.existsSync(metaPath)) return {};
  try {
    const resolved = require.resolve(metaPath);
    delete require.cache[resolved];
    const mod = require(resolved);
    return mod && mod.postMetadata && typeof mod.postMetadata === "object" ? mod.postMetadata : (typeof mod === "object" ? mod : {});
  } catch (err) {
    try {
      const raw = fs.readFileSync(metaPath, "utf8");
      const match = raw.match(/let postMetadata\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        return eval(`(${match[1]})`);
      }
    } catch (e) {}
  }
  return {};
}

// Save metadata safely
function saveMetadata(postMetadata) {
  try {
    const metaContent = `// Auto-generated metadata\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;
    fs.writeFileSync(metaPath, metaContent, "utf8");
  } catch (err) {
    console.error("❌ Failed to write post-meta.js:", err.message);
  }
}

// Clean post HTML before injection into template
function cleanPostHtml(rawHtml) {
  return rawHtml
    .replace(/<!--\s*(?:Meta|meta)\s+(?:description|keywords)\s*[:\-\s][\s\S]*?-->/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .trim();
}

// Build a single post (file should be filename e.g. my-post.html)
function buildPost(file, postMetadata) {
  try {
    if (!file || !file.endsWith(".html")) return false;
    const slug = path.basename(file, ".html");
    const rawPath = path.join(rawPostsDir, file);
    if (!fs.existsSync(rawPath)) {
      console.warn(`⚠️ raw post not found: ${rawPath}`);
      return false;
    }
    const rawHtml = fs.readFileSync(rawPath, "utf8");

    const extracted = extractMetadataFromHtml(rawHtml, slug);

    // Updated canonical URL with /posts/ path:
    const canonical = `${SITE_URL.replace(/\/$/, "")}/posts/${slug}.html`;
    const now = new Date().toISOString();

    postMetadata[slug] = postMetadata[slug] || {};

    postMetadata[slug] = {
      ...postMetadata[slug],
      title: extracted.title,
      description: extracted.description,
      keywords: extracted.keywords,
      ogImage: extracted.ogImage,
      canonical,
      slug,
      author: postMetadata[slug]?.author || "Ogunlana Akinola Okikiola",
      datePublished: postMetadata[slug]?.datePublished || now,
      dateModified: now,
    };

    const cleaned = cleanPostHtml(rawHtml);
    const template = fs.readFileSync(templatePath, "utf8");
    const finalHtml = template
      .replace(/{{TITLE}}/g, postMetadata[slug].title || "")
      .replace(/{{DESCRIPTION}}/g, postMetadata[slug].description || "")
      .replace(/{{DESCRIPTION_ESCAPED}}/g, (postMetadata[slug].description || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .replace(/{{KEYWORDS}}/g, postMetadata[slug].keywords || "")
      .replace(/{{AUTHOR}}/g, postMetadata[slug].author || "")
      .replace(/{{OG_IMAGE}}/g, postMetadata[slug].ogImage || "")
      .replace(/{{CANONICAL}}/g, postMetadata[slug].canonical || "")
      .replace(/{{DATE_PUBLISHED}}/g, postMetadata[slug].datePublished || "")
      .replace(/{{DATE_MODIFIED}}/g, postMetadata[slug].dateModified || "")
      .replace(/{{CONTENT}}/g, cleaned || "");

    const outputPath = path.join(wrappedPostsDir, file);
    fs.writeFileSync(outputPath, finalHtml, "utf8");
    console.log(`✅ Built: posts/${file}`);
    return true;
  } catch (err) {
    console.error(`❌ Error building ${file}:`, err.message);
    return false;
  }
}

// Build all posts (batch) and return summary
function buildAll() {
  const files = (fs.readdirSync(rawPostsDir) || []).filter(f => f.endsWith(".html"));
  if (!files.length) {
    console.warn("⚠️ No .html files found in dist/. Nothing to build.");
    return { processed: 0, files: [] };
  }

  const postMetadata = loadMetadata();
  const processedFiles = [];

  for (const f of files) {
    const ok = buildPost(f, postMetadata);
    if (ok) processedFiles.push(f);
  }

  saveMetadata(postMetadata);
  console.log(`\n📦 Build summary: ${processedFiles.length} / ${files.length} posts processed.`);
  return { processed: processedFiles.length, files: processedFiles };
}

// Watch single file changes (local only)
function startWatch() {
  if (!chokidar) {
    console.warn("⚠️ Live watch not available (chokidar missing). Run `npm install chokidar` locally to enable.");
    return;
  }
  const watcher = chokidar.watch(rawPostsDir, { ignoreInitial: true });
  watcher.on("add", filePath => {
    const name = path.basename(filePath);
    console.log(`🆕 Detected new post: ${name}`);
    const pm = loadMetadata();
    buildPost(name, pm);
    saveMetadata(pm);
  });
  watcher.on("change", filePath => {
    const name = path.basename(filePath);
    console.log(`✏️ Detected change in: ${name}`);
    const pm = loadMetadata();
    buildPost(name, pm);
    saveMetadata(pm);
  });
  console.log("🚀 Watching dist/ for changes (local mode)...");
}

// --- MAIN ---
if (isCI) {
  console.log("🏗️ CI mode detected — building posts once and exiting...");
  buildAll();
} else {
  console.log("👀 Local mode — building once then watching for changes...");
  buildAll();
  startWatch();
}