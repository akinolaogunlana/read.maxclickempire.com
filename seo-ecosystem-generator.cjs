const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");
const { google } = require("googleapis");
const axios = require("axios");

const siteUrl = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "posts");
const sitemapFile = path.join(__dirname, "sitemap.xml");
const rssFile = path.join(__dirname, "rss.xml");
const robotsFile = path.join(__dirname, "robots.txt");
const metaScriptPath = path.join(postsDir, "post-meta.js");

const enhancerScript = `<script src="${siteUrl}/assets/seo-enhancer.js" defer></script>`;

// 🌀 Shuffle helper
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// 🚀 Enhance posts
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

    fs.writeFileSync(fullPath, html, "utf8");
    console.log(`✅ Enhanced ${file}`);
    return { title, description, published, url, slug };
  });

// 🗺️ Sitemap
const sitemap = create({ version: "1.0" }).ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });
posts.forEach(post => {
  sitemap.ele("url")
    .ele("loc").txt(post.url).up()
    .ele("lastmod").txt(new Date().toISOString()).up()
    .ele("changefreq").txt("weekly").up()
    .ele("priority").txt("0.8").up().up();
});
fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8");
console.log("✅ sitemap.xml generated");

// 📡 RSS
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

// 📁 Metadata JS
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

// 🤖 robots.txt
const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log("✅ robots.txt generated");

// 🔐 Load credentials for Google Indexing API
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
} catch (err) {
  console.error("❌ credentials.json is invalid or missing:", err.message);
  process.exit(1);
}

// 🧠 Google Indexing + IndexNow Ping
const jwt = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/indexing"]
});

async function indexUrlToGoogle(url) {
  try {
    const token = await jwt.authorize();
    await axios.post("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      url: url,
      type: "URL_UPDATED"
    }, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`✅ Indexed on Google: ${url}`);
  } catch (err) {
    console.error(`❌ Failed to index ${url} on Google:`, err.message);
  }
}

(async () => {
  for (const post of posts) {
    await indexUrlToGoogle(post.url);
    try {
      await axios.get(`https://yandex.com/indexnow?url=${encodeURIComponent(post.url)}&key=9b1fb73319b04fb3abb5ed09be53d65e`);
      console.log(`✅ Pinged IndexNow: ${post.url}`);
    } catch (err) {
      console.error(`❌ IndexNow failed for ${post.url}:`, err.message);
    }
  }
})();
