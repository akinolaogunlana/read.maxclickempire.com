const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");

const siteUrl = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "posts");
const sitemapFile = path.join(__dirname, "sitemap.xml");
const rssFile = path.join(__dirname, "rss.xml");

// === 🔍 Gather Posts
const posts = fs
  .readdirSync(postsDir)
  .filter(file => file.endsWith(".html"))
  .map(file => {
    const content = fs.readFileSync(path.join(postsDir, file), "utf8");
    const title = (content.match(/<title>(.*?)<\/title>/) || [])[1] || file.replace(".html", "");
    const description = (content.match(/<meta name="description" content="(.*?)"/) || [])[1] || "";
    const published = (content.match(/datetime="(.*?)"/) || [])[1] || new Date().toISOString();
    const url = `${siteUrl}/posts/${file}`;
    const slug = file.replace(".html", "");
    return { title, description, url, published, slug };
  });

// === 🌐 Inject SEO Enhancer
const enhancerScript = `<script src="https://cdn.jsdelivr.net/gh/akinolaogunlana/read.maxclickempire.com@main/seo-enhancer.js" defer></script>`;
posts.forEach(post => {
  const filePath = path.join(postsDir, `${post.slug}.html`);
  let html = fs.readFileSync(filePath, "utf8");

  if (!html.includes("seo-enhancer.js")) {
    html = html.replace("</body>", `${enhancerScript}\n</body>`);
    fs.writeFileSync(filePath, html, "utf8");
    console.log(`✅ Injected SEO Enhancer into ${post.slug}.html`);
  }
});

// === 🗺️ Generate Sitemap
const sitemap = create({ version: "1.0" })
  .ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });

posts.forEach(post => {
  sitemap.ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(post.published).up()
    .ele("changefreq").txt("weekly").up()
    .ele("priority").txt("0.8").up()
    .up();
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// === 📡 Generate RSS
const rssItems = posts.map(post => `
  <item>
    <title>${post.title}</title>
    <link>${post.url}</link>
    <description><![CDATA[${post.description}]]></description>
    <pubDate>${new Date(post.published).toUTCString()}</pubDate>
    <guid>${post.url}</guid>
  </item>
`).join("");

const rssFeed = `
<rss version="2.0">
  <channel>
    <title>MaxClickEmpire Feed</title>
    <link>${siteUrl}</link>
    <description>Latest digital guides, tools, and growth hacks from MaxClickEmpire.</description>
    <language>en-us</language>
    ${rssItems}
  </channel>
</rss>
`;

fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
console.log("✅ rss.xml generated");

// === 🧠 Inject Metadata Map (optional)
const metadata = {};
posts.forEach(post => {
  metadata[post.slug] = {
    title: post.title,
    description: post.description,
    image: `${siteUrl}/assets/og-image.jpg`,
    published: post.published
  };
});
const metadataJS = `window.postMetadata = ${JSON.stringify(metadata, null, 2)};`;

const metaScriptPath = path.join(postsDir, "post-meta.js");
fs.writeFileSync(metaScriptPath, metadataJS, "utf8");
console.log("✅ post-meta.js generated");
