// seo-ecosystem-generator.cjs
// MaxClickEmpire SEO Ecosystem Generator — with RSS enclosure length fix

const fs = require("fs");
const path = require("path");
const https = require("https");
const { create } = require("xmlbuilder2");
const { execSync } = require("child_process");

const siteUrl = "https://read.maxclickempire.com";
const indexNowKey = "9b1fb73319b04fb3abb5ed09be53d65e";
const rssLimit = 20;

const distDir = path.join(__dirname, "dist");

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
  try {
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    if (mod && typeof mod === "object") {
      if (mod.postMetadata && typeof mod.postMetadata === "object") return mod.postMetadata;
      return mod;
    }
  } catch (e) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      let m = raw.match(/(?:let|const|var)\s+postMetadata\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
      m = raw.match(/module\.exports\s*=\s*(\{[\s\S]*\});?/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
      m = raw.match(/^\s*(\{[\s\S]*\})\s*;?\s*$/m);
      if (m && m[1]) return eval("(" + m[1] + ")");
    } catch (e2) {
      console.warn("⚠️ Could not parse post-meta.js via fallback:", e2.message);
    }
  }
  return null;
}

function extractFromHtml(html, slug, fileStats) {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const descriptionTag = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const keywordsTag = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  const dateMeta = html.match(/<meta\s+name=["']date(?:published|Published|Date)?["']\s+content=["']([^"']+)["']/i);

  const ogImage = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
  const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

  let firstImg = null;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) firstImg = imgMatch[1];

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

// Helper: get file size for enclosure
function getFileSize(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, { method: "HEAD" }, (res) => {
        const length = res.headers["content-length"];
        resolve(length ? parseInt(length, 10) : 0);
      }).on("error", () => resolve(0));
    } catch {
      resolve(0);
    }
  });
}

// ---------- Load metadata ----------
const postMetaModulePath = path.resolve(__dirname, "data", "post-meta.js");
let postMetadata = {};
let usedSource = null;

if (fs.existsSync(postMetaModulePath)) {
  const loaded = readPostMetaFile(postMetaModulePath);
  if (loaded && typeof loaded === "object" && Object.keys(loaded).length > 0) {
    postMetadata = loaded;
    usedSource = "data/post-meta.js";
    console.log("ℹ️ Loaded post metadata from data/post-meta.js (" + Object.keys(postMetadata).length + " entries).");
  }
}

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
    } catch (err) {
      console.warn(`⚠️ Failed to scan ${f}: ${err.message}`);
    }
  }
  return generated;
}

if (!postMetadata || Object.keys(postMetadata).length === 0) {
  const fallback = scanDistAndFillMeta();
  postMetadata = fallback;
}

// ---------- Normalize ----------
const allMetadata = Object.entries(postMetadata).map(([slug, meta]) => {
  const canonicalUrl = meta.canonical || `${siteUrl}/posts/${slug}.html`;
  const datePublished = safeParseDate(meta.published) || null;
  const dateModified = safeParseDate(meta.modified) || datePublished || null;
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

const usable = allMetadata.filter(p => p.url && p.title && p.datePublished);

// ---------- Sitemap ----------
const sitemapRoot = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
  "xmlns:image": "http://www.google.com/schemas/sitemap-image/1.1"
});
usable.forEach((post) => {
  const lastmod = post.dateModified || post.datePublished || new Date().toISOString();
  const urlEle = sitemapRoot.ele("url");
  urlEle.ele("loc").txt(post.url);
  urlEle.ele("lastmod").txt(new Date(lastmod).toISOString());
  urlEle.ele("changefreq").txt("weekly");
  urlEle.ele("priority").txt("0.7");
  if (post.ogImage) {
    const imgUrl = post.ogImage.startsWith("http") ? post.ogImage : siteUrl + post.ogImage;
    urlEle.ele("image:image")
      .ele("image:loc").txt(imgUrl).up()
      .ele("image:title").txt(post.title).up();
  }
});
fs.writeFileSync(sitemapFile, sitemapRoot.end({ prettyPrint: true }));

// ---------- RSS ----------
(async () => {
  const sorted = usable
    .slice()
    .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
    .slice(0, rssLimit);

  const rssItems = [];
  for (const post of sorted) {
    const safeTitle = (post.title || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
    const safeDesc = (post.description || "").replace(/\]\]>/g, "]]]]><![CDATA[>");
    const pubDate = new Date(post.datePublished).toUTCString();
    const categories = (post.keywords || "").split(",").map(k => k.trim()).filter(Boolean);
    const categoryTags = categories.map(cat => `<category><![CDATA[${cat}]]></category>`).join("\n    ");

    let imageTag = "";
    if (post.ogImage) {
      const length = await getFileSize(post.ogImage);
      imageTag = `<enclosure url="${post.ogImage}" length="${length}" type="image/jpeg" />`;
    }

    rssItems.push(`
  <item>
    <title><![CDATA[${safeTitle}]]></title>
    <description><![CDATA[${safeDesc}]]></description>
    <link>${post.url}</link>
    <guid isPermaLink="true">${post.url}</guid>
    <pubDate>${pubDate}</pubDate>
    <author><![CDATA[webmaster@maxclickempire.com (MaxClickEmpire)]]></author>
    ${categoryTags}
    ${imageTag}
    <content:encoded><![CDATA[${safeDesc}]]></content:encoded>
  </item>`);
  }

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MaxClickEmpire Blog</title>
    <description>Latest blog posts and updates from MaxClickEmpire</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${rssItems.join("\n")}
  </channel>
</rss>`;

  fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
})();