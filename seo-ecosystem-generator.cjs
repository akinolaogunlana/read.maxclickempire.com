const fs = require("fs");
const path = require("path");
const builder = require("xmlbuilder2");


// === Config
const siteURL = "https://read.maxclickempire.com";
const authorName = "MaxClickEmpire";
const postsDir = path.join("read.maxclickempire.com", "posts");
const sitemapFile = path.join("read.maxclickempire.com", "sitemap.xml");
const rssFile = path.join("read.maxclickempire.com", "rss.xml");
const enhancerScriptTag = `<script src="https://cdn.jsdelivr.net/gh/akinolaogunlana/read.maxclickempire.com@main/seo-enhancer.js" defer></script>`;

// === Utilities
function getTitleFromSlug(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateMeta(slug, html) {
  const title = getTitleFromSlug(slug);
  const descriptionMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  const description = descriptionMatch ? descriptionMatch[1] : `Read expert insight on ${title} at MaxClickEmpire.`;
  const imageMatch = html.match(/<img.*?src=["'](.*?)["']/);
  const image = imageMatch ? imageMatch[1] : `${siteURL}/assets/cover.jpg`;
  const date = new Date().toISOString();

  return { title, description, image, published: date };
}

// === Main Process
const files = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));
const urls = [];
const rssItems = [];

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const html = fs.readFileSync(filePath, "utf8");
  const slug = file.replace(".html", "");
  const meta = generateMeta(slug, html);
  const postURL = `${siteURL}/posts/${file}`;

  // Inject enhancer script if missing
  if (!html.includes("seo-enhancer.js")) {
    const updatedHtml = html.replace("</body>", `${enhancerScriptTag}\n</body>`);
    fs.writeFileSync(filePath, updatedHtml, "utf8");
  }

  // === Sitemap URL entry
  urls.push({
    loc: postURL,
    lastmod: meta.published
  });

  // === RSS Feed item
  rssItems.push({
    title: meta.title,
    link: postURL,
    description: meta.description,
    pubDate: new Date(meta.published).toUTCString()
  });
});

// === Generate Sitemap XML
const sitemap = builder
  .create({ version: "1.0", encoding: "UTF-8" })
  .ele("urlset", { xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9" });

urls.forEach(u => {
  sitemap.ele("url").ele("loc").txt(u.loc).up().ele("lastmod").txt(u.lastmod);
});

fs.writeFileSync(sitemapFile, sitemap.end({ prettyPrint: true }));

// === Generate RSS XML
const rss = builder
  .create({ version: "1.0", encoding: "UTF-8" })
  .ele("rss", { version: "2.0" })
  .ele("channel");

rss.ele("title").txt("MaxClickEmpire Feed");
rss.ele("link").txt(siteURL);
rss.ele("description").txt("Latest digital growth guides and tools from MaxClickEmpire");

rssItems.forEach(item => {
  const entry = rss.ele("item");
  entry.ele("title").txt(item.title);
  entry.ele("link").txt(item.link);
  entry.ele("description").txt(item.description);
  entry.ele("pubDate").txt(item.pubDate);
});

fs.writeFileSync(rssFile, rss.end({ prettyPrint: true }));

console.log("✅ SEO metadata injected, enhancer added, sitemap.xml + rss.xml generated.");
