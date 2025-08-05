#!/usr/bin/env node

// ✅ MaxClickEmpire SEO Ecosystem Generator (Final Version)

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "posts");
const DIST_DIR = path.join(__dirname, "dist");
const SITEMAP_PATH = path.join(DIST_DIR, "sitemap.xml");
const RSS_PATH = path.join(DIST_DIR, "rss.xml");
const ROBOTS_PATH = path.join(DIST_DIR, "robots.txt");
const META_SCRIPT_PATH = path.join(__dirname, "data/post-meta.js");

const DOMAIN = "https://read.maxclickempire.com";

function getPostFiles(dir) {
  return fs.readdirSync(dir).filter(file => file.endsWith(".html"));
}

function extractMetaFromContent(content) {
  const titleMatch = content.match(/<title>(.*?)<\/title>/);
  const descMatch = content.match(/<meta name="description" content="(.*?)"/);
  const keywordsMatch = content.match(/<meta name="keywords" content="(.*?)"/);
  const ogImageMatch = content.match(/<meta property="og:image" content="(.*?)"/);

  return {
    title: titleMatch?.[1] || "",
    description: descMatch?.[1] || "",
    keywords: keywordsMatch?.[1] || "",
    ogImage: ogImageMatch?.[1] || ""
  };
}

function buildSitemap(urls) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n") +
    `\n</urlset>`;
}

function buildRSS(metadata) {
  const now = new Date().toUTCString();
  const items = Object.entries(metadata).map(([slug, meta]) => `
  <item>
    <title><![CDATA[${meta.title}]]></title>
    <link>${DOMAIN}/posts/${slug}.html</link>
    <description><![CDATA[${meta.description}]]></description>
    <pubDate>${now}</pubDate>
    <guid>${DOMAIN}/posts/${slug}.html</guid>
  </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>MaxClick Empire Blog</title>
  <link>${DOMAIN}</link>
  <description>Latest blog posts from MaxClick Empire</description>
  <language>en-us</language>
  <pubDate>${now}</pubDate>
  ${items}
</channel>
</rss>`;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml`;
}

function main() {
  const files = getPostFiles(POSTS_DIR);

  const metadata = {};
  const urls = [];

  for (const file of files) {
    const slug = path.basename(file, ".html");
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const meta = extractMetaFromContent(content);

    metadata[slug] = meta;
    urls.push(`${DOMAIN}/posts/${slug}.html`);
  }

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  fs.writeFileSync(SITEMAP_PATH, buildSitemap(urls), "utf8");
  fs.writeFileSync(RSS_PATH, buildRSS(metadata), "utf8");
  fs.writeFileSync(ROBOTS_PATH, buildRobotsTxt(), "utf8");

  // ✅ Fix: Write post metadata in Node.js compatible way
  fs.writeFileSync(META_SCRIPT_PATH, `exports.postMetadata = ${JSON.stringify(metadata, null, 2)};\n`, "utf8");

  console.log("✅ SEO ecosystem generated successfully.");
}

main();