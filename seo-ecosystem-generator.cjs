// seo-ecosystem-generator.cjs
// MaxClickEmpire SEO Ecosystem Generator — robust, debug-friendly, with safe fallbacks

const fs = require("fs");
const path = require("path");
const https = require("https");
const { create } = require("xmlbuilder2");
const { execSync } = require("child_process");

const siteUrl = "https://read.maxclickempire.com";
const indexNowKey = "9b1fb73319b04fb3abb5ed09be53d65e";
const rssLimit = 20;

const distDir = path.join(__dirname, "dist");

// Output files now at project root, not in dist/
const sitemapFile = path.join(__dirname, "sitemap.xml");
const rssFile = path.join(__dirname, "rss.xml");
const robotsFile = path.join(__dirname, "robots.txt");
const noJekyllFile = path.join(__dirname, ".nojekyll");
const indexNowKeyFile = path.join(__dirname, indexNowKey);

fs.mkdirSync(distDir, { recursive: true });

// ---------- Helpers ----------
function safeParseDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function readPostMetaFile(filePath) {
  // Try require (fresh), then fallback to parsing the file as text
  try {
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    // Accept module.exports = { postMetadata } OR module.exports = postMetadata
    if (mod && typeof mod === "object") {
      if (mod.postMetadata && typeof mod.postMetadata === "object") return mod.postMetadata;
      // Some versions may export the object directly
      return mod;
    }
  } catch (e) {
    // fallback to parsing file content
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      // Match patterns like:
      // let postMetadata = { ... };
      // const postMetadata = { ... };
      // module.exports = { postMetadata };
      let m = raw.match(/(?:let|const|var)\s+postMetadata\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
      m = raw.match(/module\.exports\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
      // Try last resort: entire file contains the object directly
      m = raw.match(/^\s*(\{[\s\S]*\})\s*;?\s*$/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
    } catch (e2) {
      console.warn("⚠️ Could not parse post-meta.js via fallback:", e2.message);
    }
  }
  return null;
}

function extractFromHtml(html, slug, fileStats) {
  // Extract title, description, keywords, dates, images from HTML content
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const descriptionTag = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const keywordsTag = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  const dateMeta = html.match(/<meta\s+name=["']date(?:published|Published|Date)?["']\s+content=["']([^"']+)["']/i);

  // OG and Twitter images
  const ogImage = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
  const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

  // First <img> src fallback
  let firstImg = null;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) firstImg = imgMatch[1];

  // JSON-LD datePublished
  let ldDate = null;
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      if (ld) {
        if (ld.datePublished) ldDate = ld.datePublished;
        else if (Array.isArray(ld)) {
          for (const entry of ld) {
            if (entry && entry.datePublished) {
              ldDate = entry.datePublished;
              break;
            }
          }
        }
      }
    } catch (e) {}
  }

  const title = (titleTag && titleTag[1].trim()) ||
                (h1 && h1[1].replace(/<\/?[^>]+(>|$)/g, "").trim()) ||
                slug.replace(/-/g, " ");

  const description = descriptionTag ? descriptionTag[1].trim() : "";
  const keywords = keywordsTag ? keywordsTag[1].trim() : "";

  const image = (ogImage && ogImage[1].trim()) ||
                (twitterImage && twitterImage[1].trim()) ||
                firstImg || "";

  const published = safeParseDate(dateMeta ? dateMeta[1] : (ldDate || null))
    || (fileStats && fileStats.birthtime ? fileStats.birthtime.toISOString() : null)
    || (fileStats && fileStats.mtime ? fileStats.mtime.toISOString() : null);

  const modified = (fileStats && fileStats.mtime ? fileStats.mtime.toISOString() : null) || published || new Date().toISOString();

  return {
    title,
    description,
    keywords,
    ogImage: image,
    published,
    modified,
  };
}

// ---------- Load metadata (primary source: data/post-meta.js) ----------
const postMetaModulePath = path.resolve(__dirname, "data", "post-meta.js");
let postMetadata = {};
let usedSource = null;

if (fs.existsSync(postMetaModulePath)) {
  const loaded = readPostMetaFile(postMetaModulePath);
  if (loaded && typeof loaded === "object" && Object.keys(loaded).length > 0) {
    postMetadata = loaded;
    usedSource = "data/post-meta.js";
    console.log("ℹ️ Loaded post metadata from data/post-meta.js (" + Object.keys(postMetadata).length + " entries).");
  } else {
    console.warn("⚠️ post-meta.js found but could not load entries (it may be empty). Will attempt to scan dist/ as fallback.");
  }
} else {
  console.warn("⚠️ data/post-meta.js not found. Will attempt to scan dist/ for posts.");
}

// ---------- Fallback: scan dist/ for HTML posts if postMetadata is empty or missing entries ----------
function scanDistAndFillMeta() {
  const files = fs.readdirSync(distDir).filter(f => f.endsWith(".html"));
  if (!files.length) {
    console.warn("⚠️ No HTML files found in dist/. Nothing to generate.");
    return {};
  }
  const generated = {};
  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    try {
      const raw = fs.readFileSync(path.join(distDir, f), "utf8");
      const stats = fs.statSync(path.join(distDir, f));
      const extracted = extractFromHtml(raw, slug, stats);
      generated[slug] = {
        title: extracted.title,
        description: extracted.description,
        keywords: extracted.keywords,
        ogImage: extracted.ogImage,
        canonical: `${siteUrl}/posts/${slug}.html`,
        published: extracted.published,
        modified: extracted.modified,
      };
      console.log(`ℹ️ Scanned dist/${f} → title="${extracted.title}", published=${generated[slug].published}`);
    } catch (err) {
      console.warn(`⚠️ Failed to scan ${f}: ${err.message}`);
    }
  }
  return generated;
}

if (!postMetadata || Object.keys(postMetadata).length === 0) {
  // Build metadata from dist
  const fallback = scanDistAndFillMeta();
  if (Object.keys(fallback).length === 0) {
    console.error("❌ No posts available to generate sitemap/rss. Exiting.");
    process.exit(1);
  }
  postMetadata = fallback;

  // write to data/post-meta.js for persistence (safe auto-generated, will be used next run)
  try {
    const content = `// Auto-generated fallback post-meta\nlet postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };\n`;
    fs.mkdirSync(path.dirname(postMetaModulePath), { recursive: true });
    fs.writeFileSync(postMetaModulePath, content, "utf8");
    console.log("✅ Wrote fallback metadata to data/post-meta.js");
    usedSource = "scanned dist/ (written to data/post-meta.js)";
  } catch (e) {
    console.warn("⚠️ Failed to persist fallback post-meta.js:", e.message);
    usedSource = "scanned dist/ (in-memory)";
  }
}

// ---------- Build normalized allMetadata array ----------
const allMetadata = Object.entries(postMetadata).map(([slug, meta]) => {
  const canonicalUrl = meta.canonical || `${siteUrl}/posts/${slug}.html`;
  const datePublished = safeParseDate(meta.published || meta.datePublished || meta.publishedDate) || null;
  const dateModified = safeParseDate(meta.modified || meta.dateModified || meta.updated) || datePublished || null;
  return {
    ...meta,
    slug,
    url: canonicalUrl,
    datePublished,
    dateModified,
    title: meta.title || slug.replace(/-/g, " "),
    description: meta.description || "",
  };
});

// Sanity: filter out entries without a URL or title or published date (log the reasons)
const usable = [];
const skipped = [];
for (const p of allMetadata) {
  const problems = [];
  if (!p.url) problems.push("missing url");
  if (!p.title) problems.push("missing title");
  if (!p.datePublished) problems.push("missing datePublished");
  if (problems.length) {
    skipped.push({ slug: p.slug, reasons: problems });
  } else {
    usable.push(p);
  }
}
console.log(`🧠 Source of metadata: ${usedSource || "unknown"}`);
console.log(`ℹ️ Total entries loaded: ${allMetadata.length}. Usable for RSS/sitemap: ${usable.length}. Skipped: ${skipped.length}`);
if (skipped.length) {
  skipped.slice(0, 10).forEach(s => console.warn(`⚠️ Skipped ${s.slug}: ${s.reasons.join(", ")}`));
}

// ---------- Generate sitemap.xml ----------
const sitemapRoot = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});
usable.forEach((post) => {
  const lastmod = post.dateModified || post.datePublished || new Date().toISOString();
  sitemapRoot.ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(new Date(lastmod).toISOString()).up()
    .up();
});
fs.writeFileSync(sitemapFile, sitemapRoot.end({ prettyPrint: true }), "utf8");
console.log(`✅ sitemap.xml generated (${fs.statSync(sitemapFile).size} bytes)`);

// ---------- Generate rss.xml ----------
const sorted = usable
  .slice()
  .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
  .slice(0, rssLimit);

const rssItems = sorted.map(post => {
  const safeTitle = (post.title || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
  const safeDesc = (post.description || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
  const pubDate = new Date(post.datePublished).toUTCString();
  // Include image as <enclosure> if present (image/jpeg fallback, might not always be jpeg)
  const imageTag = post.ogImage ? `<enclosure url="${post.ogImage}" type="image/jpeg" />` : "";
  return `
  <item>
    <title><![CDATA[${safeTitle}]]></title>
    <description><![CDATA[${safeDesc}]]></description>
    <link>${post.url}</link>
    <guid>${post.url}</guid>
    <pubDate>${pubDate}</pubDate>
    ${imageTag}
  </item>`;
}).join("\n");

const rssFeed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>MaxClickEmpire Blog</title>
    <description>Latest blog posts and updates from MaxClickEmpire</description>
    <link>${siteUrl}</link>
    ${rssItems}
  </channel>
</rss>`;
fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
console.log(`✅ rss.xml generated (${fs.statSync(rssFile).size} bytes)`);

// ---------- robots.txt & .nojekyll & IndexNow key file ----------
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log(`✅ robots.txt generated (${fs.statSync(robotsFile).size} bytes)`);

fs.writeFileSync(noJekyllFile, "");
console.log("✅ .nojekyll created");

// Write IndexNow key file at site root for verification (some IndexNow setups expect this)
try {
  fs.writeFileSync(indexNowKeyFile, indexNowKey, "utf8");
  console.log(`✅ IndexNow key file written: ${path.basename(indexNowKeyFile)}`);
} catch (e) {
  console.warn("⚠️ Could not write IndexNow key file:", e.message);
}

// ---------- Notify Indexing APIs ----------
const urlList = usable.map(p => p.url);

(async () => {
  // Resolve Google credentials file: prefer env var then common filenames
  const googleCredEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_PATH;
  const candidatePaths = [
    googleCredEnv,
    path.join(__dirname, "google-credentials.json"),
    path.join(__dirname, "credentials.json")
  ].filter(Boolean);
  let googleCredPath = null;
  for (const c of candidatePaths) {
    if (c && fs.existsSync(c)) { googleCredPath = c; break; }
  }

  if (googleCredPath) {
    try {
      const { google } = require("googleapis");
      const credentials = JSON.parse(fs.readFileSync(googleCredPath, "utf8"));

      const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ["https://www.googleapis.com/auth/indexing"]
      );

      const indexing = google.indexing({ version: "v3", auth });

      for (const u of urlList) {
        try {
          await indexing.urlNotifications.publish({
            requestBody: { url: u, type: "URL_UPDATED" }
          });
          console.log(`📢 Google: notified ${u}`);
        } catch (err) {
          console.warn(`⚠️ Google indexing failed for ${u}: ${err.message}`);
        }
      }
    } catch (err) {
      console.warn("⚠️ Skipping Google Indexing — error loading client/credentials:", err.message);
    }
  } else {
    console.log("ℹ️ Google credentials not found — skipping Google Indexing.");
  }

  // IndexNow (send all urls)
  if (urlList.length) {
    const payload = JSON.stringify({
      host: new URL(siteUrl).host,
      key: indexNowKey,
      keyLocation: `${siteUrl}/${indexNowKey}`,
      urlList
    });

    const options = {
      hostname: "api.indexnow.org",
      path: "/indexnow",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, res => {
      console.log(`📡 IndexNow ping status: ${res.statusCode}`);
      res.on("data", () => {});
    });
    req.on("error", e => console.warn("⚠️ IndexNow error:", e.message));
    req.write(payload);
    req.end();
  } else {
    console.log("ℹ️ No URLs to send to IndexNow.");
  }

  // Optional: run fix-post-meta.cjs to create browser-friendly export (safe to ignore errors)
  try {
    if (fs.existsSync(path.join(__dirname, "scripts", "fix-post-meta.cjs"))) {
      execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" });
      console.log("✅ Ran scripts/fix-post-meta.cjs");
    }
  } catch (e) {
    console.warn("⚠️ Running fix-post-meta.cjs failed:", e.message);
  }
})();