// MaxClickEmpire SEO Ecosystem Generator (Final Working Version)

const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");
const { execSync } = require("child_process");

// === PATHS ===
const postsDir = path.join(__dirname, "posts");
const publicDir = path.join(__dirname, "public");
const sitemapFile = path.join(publicDir, "sitemap.xml");
const rssFile = path.join(publicDir, "rss.xml");
const robotsFile = path.join(publicDir, "robots.txt");
const siteUrl = "https://read.maxclickempire.com";

// === Ensure /public directory exists ===
fs.mkdirSync(publicDir, { recursive: true });

// === READ POSTS ===
const posts = fs.readdirSync(postsDir);
const allMetadata = [];

posts.forEach((file) => {
  const fullPath = path.join(postsDir, file);
  let html = fs.readFileSync(fullPath, "utf8");

  // Clean up any previously injected content
  html = html
    .replace(/<link rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<script[^>]+post-meta\.js[^>]*><\/script>\s*/gi, "")
    .replace(/<script[^>]+seo-enhancer\.js[^>]*><\/script>\s*/gi, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");

  const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || "Untitled";
  const description = (html.match(/<meta name="description" content="(.*?)"/i) || [])[1] || "";
  const slug = file.replace(/\.html$/, "");
  const url = `${siteUrl}/${slug}.html`;
  const published = new Date().toISOString();

  const metaScript = `<script src="/scripts/post-meta.js" type="module" async></script>`;
  const enhancerScript = `<script src="/assets/seo-enhancer.js" defer></script>`;

  

  // Inject metadata into <head> and scripts into <body>
  html = html.replace("</head>", `
<link rel="canonical" href="${url}" />
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>`);

  html = html.replace("</body>", `${metaScript}\n${enhancerScript}\n</body>`);

  // Save enhanced HTML
  fs.writeFileSync(fullPath, html, "utf8");
  console.log(`✅ Enhanced ${file}`);

  // Collect post metadata
  allMetadata.push({ title, description, published, url, slug });
});

// === GENERATE SITEMAP ===
const sitemap = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});

allMetadata.forEach((post) => {
  sitemap.ele("url").ele("loc").txt(post.url).up().up();
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// === GENERATE RSS FEED ===
const rssItems = allMetadata.map(post => `
  <item>
    <title>${post.title}</title>
    <description>${post.description}</description>
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

// === OPTIONAL: GOOGLE INDEXING API ===
try {
  const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
  // Google Indexing logic goes here (if needed)
} catch (e) {
  console.warn("⚠️ Google Indexing API credentials not found or unreadable.");
}

// === FIX post-meta.js script ===
try {
  execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" });
  console.log("✅ post-meta.js fixed for Node.js + browser environments");
} catch (err) {
  console.error("❌ Error fixing post-meta.js:", err.message);
}