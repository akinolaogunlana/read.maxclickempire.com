//MaxClickEmpire SEO Ecosystem Generator (Final Fixed Version)
const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");
@@ -32,6 +32,13 @@ const posts = fs.readdirSync(postsDir)
    const fullPath = path.join(postsDir, file);
    let html = fs.readFileSync(fullPath, "utf8");

    // Cleanup previous injected content
    html = html
      .replace(/<link rel="canonical"[^>]*>\s*/gi, "")
      .replace(/<script[^>]+post-meta\.js[^>]*><\/script>\s*/gi, "")
      .replace(/<script[^>]+seo-enhancer\.js[^>]*><\/script>\s*/gi, "")
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");

    let title = (html.match(/<title>(.*?)<\/title>/i) || [])[1];
    let description = (html.match(/<meta name="description" content="(.*?)"/i) || [])[1];

@@ -64,43 +71,41 @@ const posts = fs.readdirSync(postsDir)
      });
    }

    if (!html.includes("post-meta.js")) {
      html = html.replace("</body>", `${metaScript}\n${enhancerScript}\n</body>`);
    // Inject canonical and enhancer/meta scripts
    html = html.replace("</head>", `
<link rel="canonical" href="${url}" />
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": title,
  "description": description,
  "url": url,
  "datePublished": published,
  "dateModified": new Date().toISOString(),
  "author": { "@type": "Organization", "name": "MaxClickEmpire" },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": `${siteUrl}/assets/og-image.jpg`
    }
  },
  "mainEntityOfPage": url
}, null, 2)}
</script>
</head>`);

    if (!html.includes('<link rel="canonical"')) {
      html = html.replace("</head>", `<link rel="canonical" href="${url}" />\n</head>`);
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "url": url,
      "datePublished": published,
      "dateModified": new Date().toISOString(),
      "author": { "@type": "Organization", "name": "MaxClickEmpire" },
      "publisher": {
        "@type": "Organization",
        "name": "MaxClickEmpire",
        "logo": { "@type": "ImageObject", "url": `${siteUrl}/assets/og-image.jpg` }
      },
      "mainEntityOfPage": url
    };

    if (!html.includes('"@type":"BlogPosting"')) {
      html = html.replace("</head>", `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n</head>`);
    }
    html = html.replace("</body>", `${metaScript}\n${enhancerScript}\n</body>`);

    fs.writeFileSync(fullPath, html, "utf8");
    console.log(`✅ Enhanced ${file}`);
    return { title, description, published, url, slug };
  });

// Sitemap generation
const sitemap = create({ version: "1.0" })
  .ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });
const sitemap = create({ version: "1.0" }).ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });
posts.forEach(post => {
  sitemap.ele("url")
    .ele("loc").txt(post.url).up()
@@ -111,7 +116,7 @@ posts.forEach(post => {
fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// Metadata JS file (raw)
// Metadata JS file
const metadata = {};
posts.forEach(post => {
  metadata[post.slug] = {
@@ -144,7 +149,6 @@ const rssFeed = `<?xml version="1.0"?>
    ${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
console.log("✅ rss.xml generated");

@@ -158,7 +162,7 @@ Sitemap: ${siteUrl}/sitemap.xml
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log("✅ robots.txt generated");

// Google Indexing
// Google Indexing API
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
@@ -202,7 +206,6 @@ async function indexUrlToGoogle(url) {
    }
  }

  // ✅ Fix post-meta.js for Node.js + browser environments
  try {
    execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" });
  } catch (e) {