// wrap-with-template.js — robust, CI-friendly, local-watch safe
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Detect CI environment (GitHub Actions sets CI=true)
const isCI = process.env.CI === "true";

// Conditionally require chokidar only when running locally (so CI won't fail if not installed)
let chokidar = null;
if (!isCI) {
  try {
    chokidar = require("chokidar");
  } catch (err) {
    console.warn("⚠️ chokidar not installed — live watch disabled. Run npm install chokidar to enable.");
  }
}

// Config
const SITE_URL = process.env.SITE_URL || "https://read.maxclickempire.com";
const templatePath = path.join(process.cwd(), "template.html");
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
    const attrPairs = tag.match(/([a-zA-Z-:]+)\s*=\s*(".*?"|'.*?'|\S+)/g) || [];
    for (const pair of attrPairs) {
      const eqIdx = pair.indexOf("=");
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

// Extract metadata from HTML, including datePublished
function extractMetadataFromHtml(html, slug) {
  const commentDesc = html.match(/<!--\s*(?:Meta|meta)\s+description\s*[:\-\s]\s*([\s\S]*?)\s*-->/i);
  const commentKeys = html.match(/<!--\s*(?:Meta|meta)\s+keywords\s*[:\-\s]\s*([\s\S]*?)\s*-->/i);
  const commentDate = html.match(/<!--\s*(?:Meta|meta)\s+datePublished\s*[:\-\s]\s*([\s\S]*?)\s*-->/i);

  const metas = parseMetaTags(html);
  let description = "";
  let keywords = "";
  let ogImage = "";
  let datePublished = null;

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
    // Extract datePublished or date meta tag
    if (m.name && (m.name.toLowerCase() === "datepublished" || m.name.toLowerCase() === "date") && m.content) {
      if (!datePublished) {
        const dt = new Date(m.content);
        if (!isNaN(dt.getTime())) {
          datePublished = dt.toISOString();
        }
      }
    }
  }

  // Fallback: extract datePublished from JSON-LD script if not found yet
  if (!datePublished) {
    const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of ldMatches) {
      try {
        const ldJson = JSON.parse(match[1]);
        if (ldJson) {
          if (ldJson.datePublished) {
            const dt = new Date(ldJson.datePublished);
            if (!isNaN(dt.getTime())) {
              datePublished = dt.toISOString();
              break;
            }
          } else if (Array.isArray(ldJson)) {
            for (const entry of ldJson) {
              if (entry && entry.datePublished) {
                const dt = new Date(entry.datePublished);
                if (!isNaN(dt.getTime())) {
                  datePublished = dt.toISOString();
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
  }

  // Fallback: extract from comment meta
  if (!datePublished && commentDate) {
    const dt = new Date(commentDate[1]);
    if (!isNaN(dt.getTime())) {
      datePublished = dt.toISOString();
    }
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
    datePublished,
  };
}

// Load metadata
function loadMetadata() {
  if (!fs.existsSync(metaPath)) return {};
  try {
    const resolved = require.resolve(metaPath);
    delete require.cache[resolved];
    const mod = require(resolved);
    return mod && mod.postMetadata && typeof mod.postMetadata === "object"
      ? mod.postMetadata
      : (typeof mod === "object" ? mod : {});
  } catch (err) {
    try {
      const raw = fs.readFileSync(metaPath, "utf8");
      const match = raw.match(/let postMetadata\s*=\s*({[\s\S]*?});/);
      if (match) {
        return eval(`(${match[1]})`);
      }
    } catch (e) {}
  }
  return {};
}

// Save metadata
function saveMetadata(postMetadata) {
  try {
    const metaContent =
      `// Auto-generated metadata\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;
    fs.writeFileSync(metaPath, metaContent, "utf8");
  } catch (err) {
    console.error("❌ Failed to write post-meta.js:", err.message);
  }
}

// Clean HTML before injecting into template
function cleanPostHtml(rawHtml) {
  return rawHtml
    .replace(/<!--\s*(?:Meta|meta)\s+(?:description|keywords|datePublished)\s*[:\-\s][\s\S]*?-->/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    .trim();
}

// Build a single post
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
    const htmlHash = crypto.createHash("md5").update(rawHtml).digest("hex");
    const extracted = extractMetadataFromHtml(rawHtml, slug);

    const stats = fs.statSync(rawPath);
    const now = new Date().toISOString();
    const existingMeta = postMetadata[slug] || {};

    // Prefer extracted datePublished, fallback to existing or file birthtime or now
    let datePublished = extracted.datePublished || existingMeta.datePublished;
    if (!datePublished) {
      datePublished =
        stats.birthtimeMs && stats.birthtimeMs > 0
          ? stats.birthtime.toISOString()
          : now;
    }

    let dateModified = existingMeta.dateModified || now;
    if (existingMeta.htmlHash !== htmlHash) {
      dateModified = now;
    }

    const canonical = `${SITE_URL.replace(/\/$/, "")}/posts/${slug}.html`;

    postMetadata[slug] = {
      ...existingMeta,
      title: extracted.title,
      description: extracted.description,
      keywords: extracted.keywords,
      ogImage: extracted.ogImage,
      canonical,
      slug,
      author: existingMeta.author || "Ogunlana Akinola Okikiola",
      datePublished,
      dateModified,
      htmlHash,
    };

    const cleaned = cleanPostHtml(rawHtml);
    const template = fs.readFileSync(templatePath, "utf8");

    // Get timestamp (milliseconds) from datePublished ISO string or 0 if invalid
    const timestamp = datePublished ? (new Date(datePublished)).getTime() : 0;

    const finalHtml = template
      .replace(/{{TITLE}}/g, postMetadata[slug].title || "")
      .replace(/{{DESCRIPTION}}/g, postMetadata[slug].description || "")
      .replace(/{{DESCRIPTION_ESCAPED}}/g, (postMetadata[slug].description || "")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"))
      .replace(/{{KEYWORDS}}/g, postMetadata[slug].keywords || "")
      .replace(/{{AUTHOR}}/g, postMetadata[slug].author || "")
      .replace(/{{OG_IMAGE}}/g, postMetadata[slug].ogImage || "")
      .replace(/{{CANONICAL}}/g, postMetadata[slug].canonical || "")
      .replace(/{{DATE_PUBLISHED}}/g, postMetadata[slug].datePublished || "")
      .replace(/{{DATE_MODIFIED}}/g, postMetadata[slug].dateModified || "")
      .replace(/{{TIMESTAMP}}/g, String(timestamp))
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

// Build all posts
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

// Watch for changes (local only)
function startWatch() {
  if (!chokidar) {
    console.warn("⚠️ Live watch not available (chokidar missing). Run npm install chokidar locally to enable.");
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