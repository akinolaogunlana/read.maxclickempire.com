// MaxClickEmpire SEO Ecosystem Generator (Improved Date Handling + Debug Logging)

const fs = require("fs");
const path = require("path");
const https = require("https");
const { create } = require("xmlbuilder2");
const { execSync } = require("child_process");

const siteUrl = "https://read.maxclickempire.com";
const indexNowKey = "9b1fb73319b04fb3abb5ed09be53d65e";
const rssLimit = 20;

const distDir = path.join(__dirname, "dist");
const sitemapFile = path.join(distDir, "sitemap.xml");
const rssFile = path.join(distDir, "rss.xml");
const robotsFile = path.join(distDir, "robots.txt");
const noJekyllFile = path.join(distDir, ".nojekyll");

fs.mkdirSync(distDir, { recursive: true });

// Force reload post-meta.js without cache
const postMetaModulePath = path.resolve(__dirname, "data", "post-meta.js");
if (!fs.existsSync(postMetaModulePath)) {
  console.error("❌ post-meta.js file not found at:", postMetaModulePath);
  process.exit(1);
}
delete require.cache[require.resolve(postMetaModulePath)];
const postMetadataRaw = require(postMetaModulePath);
const postMetadata = postMetadataRaw.postMetadata || postMetadataRaw;

if (!postMetadata || typeof postMetadata !== "object") {
  console.error("❌ postMetadata is undefined or invalid in post-meta.js");
  process.exit(1);
}

// Convert postMetadata to enriched array with full URLs
const allMetadata = Object.entries(postMetadata).map(([slug, meta]) => {
  if (!meta.title) console.warn(`⚠️ Missing title for slug: ${slug}`);
  if (!meta.description) console.warn(`⚠️ Missing description for slug: ${slug}`);

  const canonicalUrl = meta.canonical || `${siteUrl}/${slug}`;
  const datePublished = meta.published || meta.datePublished || null;
  const dateModified = meta.modified || meta.dateModified || datePublished;

  if (!datePublished) console.warn(`⚠️ Missing published date for slug: ${slug}`);

  return {
    ...meta,
    slug,
    url: canonicalUrl,
    datePublished,
    dateModified
  };
});

console.log(`🧠 Loaded ${allMetadata.length} posts from post-meta.js`);

// Generate Sitemap
const sitemap = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});

allMetadata.forEach((post) => {
  if (!post.dateModified) return;
  sitemap
    .ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(new Date(post.dateModified).toISOString()).up()
    .up();
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log(`✅ sitemap.xml generated (${fs.statSync(sitemapFile).size} bytes)`);

// Generate RSS Feed
const latestPosts = allMetadata
  .filter(p => p.datePublished)
  .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished))
  .slice(0, rssLimit);

const rssItems = latestPosts.map((post) => `
  <item>
    <title><![CDATA[${(post.title || "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]></title>
    <description><![CDATA[${(post.description || "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]></description>
    <link>${post.url}</link>
    <guid>${post.url}</guid>
    <pubDate>${new Date(post.datePublished).toUTCString()}</pubDate>
  </item>
`).join("\n");

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

// Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log(`✅ robots.txt generated (${fs.statSync(robotsFile).size} bytes)`);

// Create .nojekyll
fs.writeFileSync(noJekyllFile, "");
console.log("✅ .nojekyll created");

// Google Indexing + IndexNow
(async () => {
  const indexedUrls = [];
  try {
    const { google } = require("googleapis");
    const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/indexing"]
    );

    const indexing = google.indexing({ version: "v3", auth });
    for (const post of allMetadata) {
      if (!post.url) continue;
      try {
        await indexing.urlNotifications.publish({
          requestBody: {
            url: post.url,
            type: "URL_UPDATED",
          },
        });
        console.log(`📢 Google Indexed: ${post.url}`);
        indexedUrls.push(post.url);
      } catch (err) {
        console.error(`❌ Failed to index ${post.url}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn("⚠️ Skipping Google Indexing API:", err.message);
  }

  function pingIndexNow(urls) {
    if (urls.length === 0) return;
    const payload = {
      host: "read.maxclickempire.com",
      key: indexNowKey,
      keyLocation: `${siteUrl}/${indexNowKey}`,
      urlList: urls,
    };
    const data = JSON.stringify(payload);
    const options = {
      hostname: "api.indexnow.org",
      path: "/indexnow",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };
    const req = https.request(options, (res) => {
      console.log(`📡 IndexNow: Sent ${urls.length} URLs → Status: ${res.statusCode}`);
    });
    req.on("error", (e) => console.error("❌ IndexNow Ping Error:", e.message));
    req.write(data);
    req.end();
  }
  pingIndexNow(indexedUrls);

  try {
    execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" });
    console.log("✅ post-meta.js fixed for Node.js + browser environments");
  } catch (err) {
    console.error("❌ Error fixing post-meta.js:", err.message);
  }
})();