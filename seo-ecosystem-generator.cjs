// MaxClickEmpire SEO Ecosystem Generator (Final Working Version)

const fs = require("fs");
const path = require("path");
const https = require("https");
const { create } = require("xmlbuilder2");
const { execSync } = require("child_process");

// === CONFIGURATION ===
const siteUrl = "https://read.maxclickempire.com";
const indexNowKey = "9b1fb73319b04fb3abb5ed09be53d65e";
const rssLimit = 20;

// === PATHS ===
const postsDir = path.join(__dirname, "posts");
const publicDir = path.join(__dirname, "public");
const sitemapFile = path.join(publicDir, "sitemap.xml");
const rssFile = path.join(publicDir, "rss.xml");
const robotsFile = path.join(publicDir, "robots.txt");
const metaPath = path.join(__dirname, "data/post-meta.js");

// === Ensure /public directory exists ===
fs.mkdirSync(publicDir, { recursive: true });

// === Load post metadata ===
let postMetadata = {};
if (fs.existsSync(metaPath)) {
  try {
    const rawMeta = fs.readFileSync(metaPath, "utf8");
    const match = rawMeta.match(/let postMetadata\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      postMetadata = eval(`(${match[1]})`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to load post-meta.js. Proceeding without metadata.");
  }
}

// === READ POSTS ===
const posts = fs.readdirSync(postsDir);
const allMetadata = [];

posts.forEach((file) => {
  const fullPath = path.join(postsDir, file);
  let html = fs.readFileSync(fullPath, "utf8");
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️ No metadata found for ${slug}. Skipping...`);
    return;
  }

  const { title, description, datePublished, canonical } = metadata;

  fs.writeFileSync(fullPath, html, "utf8");
  console.log(`✅ Enhanced ${file}`);

  allMetadata.push({
    title,
    description,
    published: datePublished,
    url: canonical,
    slug,
  });
});

// === GENERATE SITEMAP ===
const sitemap = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});

allMetadata.forEach((post) => {
  sitemap.ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(new Date(post.published).toISOString()).up()
    .up();
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// === GENERATE RSS FEED ===
const latestPosts = allMetadata
  .sort((a, b) => new Date(b.published) - new Date(a.published))
  .slice(0, rssLimit);

const rssItems = latestPosts.map((post) => `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <description><![CDATA[${post.description}]]></description>
    <link>${post.url}</link>
    <guid>${post.url}</guid>
    <pubDate>${new Date(post.published).toUTCString()}</pubDate>
  </item>`).join("\n");

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
console.log("✅ rss.xml generated");

// === GENERATE robots.txt ===
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log("✅ robots.txt generated");

// === INDEXING APIs: Google & IndexNow ===
(async () => {
  const indexedUrls = [];

  // === GOOGLE INDEXING API ===
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
    console.warn("⚠️ Skipping Google Indexing API: " + err.message);
  }

  // === INDEXNOW API ===
  function pingIndexNow(urls) {
    if (urls.length === 0) return;

    const payload = {
      host: "read.maxclickempire.com",
      key: indexNowKey,
      keyLocation: `https://read.maxclickempire.com/${indexNowKey}`,
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

    req.on("error", (e) => {
      console.error("❌ IndexNow Ping Error:", e.message);
    });

    req.write(data);
    req.end();
  }

  pingIndexNow(indexedUrls);

  // === FIX post-meta.js script ===
  try {
    execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" });
    console.log("✅ post-meta.js fixed for Node.js + browser environments");
  } catch (err) {
    console.error("❌ Error fixing post-meta.js:", err.message);
  }
})();