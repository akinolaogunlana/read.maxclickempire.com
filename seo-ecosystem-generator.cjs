const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");
const { google } = require("googleapis");

const siteUrl = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "posts");
const sitemapFile = path.join(__dirname, "sitemap.xml");
const rssFile = path.join(__dirname, "rss.xml");
const robotsFile = path.join(__dirname, "robots.txt");
const metaScriptPath = path.join(postsDir, "post-meta.js");
const enhancerScript = `<script src="https://read.maxclickempire.com/assets/seo-enhancer.js" defer></script>`;

// === 🔁 Shuffle Helper
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// === 🔐 Google Indexing Auth
async function indexUrlToGoogle(url) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

  const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/indexing']
  );

  await jwtClient.authorize();

  const indexing = google.indexing({ version: 'v3', auth: jwtClient });

  try {
    await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: "URL_UPDATED"
      }
    });
    console.log(`📤 Indexed to Google: ${url}`);
  } catch (err) {
    console.error(`❌ Failed to index ${url}`, err.message);
  }
}

// === 🧠 Process Posts
(async () => {
  const posts = fs.readdirSync(postsDir)
    .filter(file => file.endsWith(".html"))
    .map(file => {
      const fullPath = path.join(postsDir, file);
      let html = fs.readFileSync(fullPath, "utf8");

      const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || file.replace(".html", "");
      const description = (html.match(/<meta name="description" content="(.*?)"/) || [])[1] || "";
      const published = (html.match(/datetime="(.*?)"/) || [])[1] || new Date().toISOString();
      const slug = file.replace(".html", "");
      const url = `${siteUrl}/posts/${file}`;

      // 🌀 Refresh every 60 days
      const ageInDays = (Date.now() - new Date(published).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 60 && html.includes("<article")) {
        html = html.replace(/<article([\s\S]*?)>([\s\S]*?)<\/article>/, (match, attr, inner) => {
          const parts = inner.split(/(?=<p[ >])/);
          if (parts.length > 3) {
            const first = parts[0];
            const last = parts[parts.length - 1];
            const middle = shuffle(parts.slice(1, -1));
            return `<article${attr}>\n${[first, ...middle, last].join("\n")}\n</article>`;
          }
          return match;
        });
      }

      if (!html.includes("seo-enhancer.js")) {
        html = html.replace("</body>", `${enhancerScript}\n</body>`);
      }

      if (!html.includes("<link rel=\"canonical\"")) {
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
          "logo": {
            "@type": "ImageObject",
            "url": `${siteUrl}/assets/og-image.jpg`
          }
        },
        "mainEntityOfPage": url
      };

      if (!html.includes('"@type":"BlogPosting"')) {
        html = html.replace("</head>", `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n</head>`);
      }

      fs.writeFileSync(fullPath, html, "utf8");
      console.log(`✅ Enhanced ${slug}.html`);

      return { title, description, published, url, slug, html };
    });

  // === 🗺️ Sitemap.xml
  const sitemap = create({ version: "1.0" })
    .ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });

  posts.forEach(post => {
    sitemap.ele("url")
      .ele("loc").txt(post.url).up()
      .ele("lastmod").txt(new Date().toISOString()).up()
      .ele("changefreq").txt("weekly").up()
      .ele("priority").txt("0.8").up().up();
  });

  fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
  console.log("✅ sitemap.xml generated");

  // === 📡 rss.xml
  const rssItems = posts.map(post => `
    <item>
      <title>${post.title}</title>
      <link>${post.url}</link>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.published).toUTCString()}</pubDate>
      <guid>${post.url}</guid>
    </item>`).join("");

  const rssFeed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>MaxClickEmpire Feed</title>
    <link>${siteUrl}</link>
    <description>Latest digital guides, tools, and growth hacks from MaxClickEmpire.</description>
    <language>en-us</language>
    ${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
  console.log("✅ rss.xml generated");

  // === 🧠 post-meta.js
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

  // === 🤖 robots.txt
  const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
  console.log("✅ robots.txt generated");

  // === 🔁 Submit to Google Indexing
  for (const post of posts) {
    await indexUrlToGoogle(post.url);
  }
})();
