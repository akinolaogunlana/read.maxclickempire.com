const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");

const siteUrl = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "posts");
const sitemapFile = path.join(__dirname, "sitemap.xml");
const rssFile = path.join(__dirname, "rss.xml");
const robotsFile = path.join(__dirname, "robots.txt");
const metaScriptPath = path.join(postsDir, "post-meta.js");

// === 🔍 Gather Posts
const posts = fs.readdirSync(postsDir)
  .filter(file => file.endsWith(".html"))
  .map(file => {
    const fullPath = path.join(postsDir, file);
    const html = fs.readFileSync(fullPath, "utf8");

    const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || file.replace(".html", "");
    const description = (html.match(/<meta name="description" content="(.*?)"/) || [])[1] || "";
    const published = (html.match(/datetime="(.*?)"/) || [])[1] || new Date().toISOString();
    const slug = file.replace(".html", "");
    const url = `${siteUrl}/posts/${file}`;

    return { title, description, published, url, slug, filePath: fullPath, html };
  });

// === 🧠 SEO Enhancer & Metadata Injection
const enhancerScript = `<script src="https://cdn.jsdelivr.net/gh/akinolaogunlana/read.maxclickempire.com@main/seo-enhancer.js" defer></script>`;

posts.forEach(post => {
  let updatedHtml = post.html;

  // Inject enhancer script
  if (!updatedHtml.includes("seo-enhancer.js")) {
    updatedHtml = updatedHtml.replace("</body>", `${enhancerScript}\n</body>`);
  }

  // Inject canonical tag
  if (!updatedHtml.includes('<link rel="canonical"')) {
    updatedHtml = updatedHtml.replace("</head>", `<link rel="canonical" href="${post.url}" />\n</head>`);
  }

  // Inject JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "url": post.url,
    "datePublished": post.published,
    "author": {
      "@type": "Organization",
      "name": "MaxClickEmpire"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MaxClickEmpire",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/assets/og-image.jpg`
      }
    },
    "mainEntityOfPage": post.url
  };

  if (!updatedHtml.includes('"@type":"BlogPosting"')) {
    updatedHtml = updatedHtml.replace("</head>", `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n</head>`);
  }

  fs.writeFileSync(post.filePath, updatedHtml, "utf8");
  console.log(`✅ Enhanced ${post.slug}.html`);
});

// === 🗺️ Generate sitemap.xml
const sitemap = create({ version: "1.0" }).ele("urlset", {
  xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
});

posts.forEach(post => {
  sitemap
    .ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(post.published).up()
    .ele("changefreq").txt("weekly").up()
    .ele("priority").txt("0.8").up()
    .up();
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// === 📡 Generate rss.xml
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

// === 🧠 Create post-meta.js
const metadata = {};
posts.forEach(post => {
  metadata[post.slug] = {
    title: post.title,
    description: post.description,
    image: `${siteUrl}/assets/og-image.jpg`,
    published: post.published
  };
});
fs.writeFileSync(metaScriptPath, `window.postMetadata = ${JSON.stringify(metadata, null, 2)};`, "utf8");
console.log("✅ post-meta.js generated");

// === 🤖 Generate robots.txt
const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log("✅ robots.txt generated");

// === 📡 Ping Search Engines (to be optionally triggered in workflow)
console.log("📡 You can now ping:");
console.log(`🔔 Google: https://www.google.com/ping?sitemap=${siteUrl}/sitemap.xml`);
console.log(`🔔 Bing: https://www.bing.com/ping?sitemap=${siteUrl}/sitemap.xml`);
console.log(`🔔 IndexNow: https://yandex.com/indexnow?url=${siteUrl}&key=9b1fb73319b04fb3abb5ed09be53d65e`);
