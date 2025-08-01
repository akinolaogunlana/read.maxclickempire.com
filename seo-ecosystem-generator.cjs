// ✅ MaxClickEmpire SEO Ecosystem Generator (Final Fixed Version) const fs = require("fs"); const path = require("path"); const { create } = require("xmlbuilder2"); const { google } = require("googleapis"); const axios = require("axios"); const { execSync } = require("child_process");

const siteUrl = "https://read.maxclickempire.com"; const postsDir = path.join(__dirname, "posts"); const sitemapFile = path.join(__dirname, "sitemap.xml"); const rssFile = path.join(__dirname, "rss.xml"); const robotsFile = path.join(__dirname, "robots.txt"); const metaScriptPath = path.join(__dirname, "data/post-meta.js");

function shuffle(array) { let currentIndex = array.length, randomIndex; while (currentIndex !== 0) { randomIndex = Math.floor(Math.random() * currentIndex); currentIndex--; [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]; } return array; }

const posts = fs.readdirSync(postsDir) .filter(file => file.endsWith(".html")) .map(file => { const fullPath = path.join(postsDir, file); let html = fs.readFileSync(fullPath, "utf8");

html = html
  .replace(/<link rel="canonical"[^>]*>\s*/gi, "")
  .replace(/<script[^>]+post-meta\.js[^>]*><\/script>\s*/gi, "")
  .replace(/<script[^>]+seo-enhancer\.js[^>]*><\/script>\s*/gi, "")
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");

let title = (html.match(/<title>(.*?)<\/title>/i) || [])[1];
let description = (html.match(/<meta name="description" content="(.*?)"/i) || [])[1];

if (!title) {
  title = (html.match(/<h1[^>]*>(.*?)<\/h1>/i) || [])[1] || file.replace(".html", "");
}

if (!description) {
  const commentMatch = html.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  description = commentMatch ? commentMatch[1].trim() : "A post from MaxClickEmpire.";
}

const stats = fs.statSync(fullPath);
const lastModified = stats.mtime.toISOString();

let published = (html.match(/datetime="(.*?)"/) || [])[1];
if (!published || isNaN(Date.parse(published))) {
  published = stats.birthtime.toISOString();
}

const slug = file.replace(".html", "").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "").toLowerCase();
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

fs.writeFileSync(fullPath, html, "utf8");
console.log(`✅ Enhanced ${file}`);
return { title, description, published, url, slug };

});

// Sitemap const sitemap = create({ version: "1.0" }).ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" }); posts.forEach(post => { sitemap.ele("url") .ele("loc").txt(post.url).up() .ele("lastmod").txt(post.published).up() .ele("changefreq").txt("weekly").up() .ele("priority").txt("0.8").up().up(); }); fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }), "utf8"); console.log("✅ sitemap.xml generated");

// Metadata JS const metadata = {}; posts.forEach(post => { metadata[post.slug] = { title: post.title, description: post.description, image: ${siteUrl}/assets/og-image.jpg, published: post.published }; }); fs.writeFileSync(metaScriptPath, window.postMetadata = ${JSON.stringify(metadata, null, 2)};, "utf8"); console.log("✅ post-meta.js generated");

// RSS
const rssItems = posts.map(post => {
  const html = fs.readFileSync(path.join(postsDir, `${post.slug}.html`), "utf8");
  const keywordMatch = html.match(/<meta name="keywords" content="(.*?)"/i);
  const tags = keywordMatch ? keywordMatch[1].split(",").map(t => t.trim()) : [];
  const categories = tags.map(tag => `<category>${tag}</category>`).join("\n");

  return `
    <item>
      <title>${post.title}</title>
      <link>${post.url}</link>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.published).toUTCString()}</pubDate>
      <guid>${post.url}</guid>
      ${categories}
    </item>`;
}).join("\n");

const rssFeed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>MaxClickEmpire Feed</title>
    <link>${siteUrl}</link>
    <description>Latest digital guides, tools, and growth hacks from MaxClickEmpire.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(rssFile, rssFeed.trim(), "utf8");
console.log("✅ rss.xml generated with categories");

// Robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;
fs.writeFileSync(robotsFile, robotsTxt.trim(), "utf8");
console.log("✅ robots.txt generated");

// Google Indexing API let credentials; try { credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8")); } catch (err) { console.error("❌ credentials.json is invalid or missing:", err.message); process.exit(1); }

const jwt = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ["https://www.googleapis.com/auth/indexing"] });

async function indexUrlToGoogle(url) { try { const token = await jwt.authorize(); await axios.post("https://indexing.googleapis.com/v3/urlNotifications:publish", { url, type: "URL_UPDATED" }, { headers: { Authorization: Bearer ${token.access_token}, "Content-Type": "application/json" } }); console.log(✅ Indexed on Google: ${url}); } catch (err) { console.error(❌ Failed to index ${url} on Google:, err.message); } }

(async () => { for (const post of posts) { await indexUrlToGoogle(post.url); try { await axios.get(https://yandex.com/indexnow?url=${encodeURIComponent(post.url)}&key=9b1fb73319b04fb3abb5ed09be53d65e); console.log(✅ Pinged IndexNow: ${post.url}); } catch (err) { console.error(❌ IndexNow failed for ${post.url}:, err.message); } }

try { execSync("node scripts/fix-post-meta.cjs", { stdio: "inherit" }); } catch (e) { console.error("❌ Failed to fix post-meta.js:", e.message); } })();

