// ✅ Supreme SEO Ecosystem Generator for MaxClickEmpire // Automatically injects SEO enhancer, sitemaps, meta tags, and internal links.

import fs from 'fs'; import path from 'path';

const postsDir = path.join("read.maxclickempire.com", "posts"); const sitemapFile = path.join("read.maxclickempire.com", "sitemap.xml"); const rssFile = path.join("read.maxclickempire.com", "rss.xml"); const enhancerScriptTag = <script src="https://cdn.jsdelivr.net/gh/akinolaogunlana/read.maxclickempire.com@main/seo-enhancer.js" defer></script>;

const baseUrl = "https://read.maxclickempire.com";

const posts = fs.readdirSync(postsDir).filter(file => file.endsWith(".html")); const urls = []; const rssItems = [];

for (const file of posts) { const filePath = path.join(postsDir, file); let html = fs.readFileSync(filePath, "utf-8");

// === Inject SEO Enhancer Script if not present if (!html.includes("seo-enhancer.js")) { html = html.replace('</body>', ${enhancerScriptTag}</body>); }

// === Collect metadata for sitemap and RSS const slug = file.replace(".html", ""); const url = ${baseUrl}/posts/${file}; const titleMatch = html.match(/<title>(.*?)</title>/i); const descMatch = html.match(/<meta name=["']description["'] content="'["']/i); const pubDate = new Date().toISOString();

urls.push(<url><loc>${url}</loc><lastmod>${pubDate}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>);

rssItems.push(<item> <title>${titleMatch?.[1] || slug}</title> <link>${url}</link> <description>${descMatch?.[1] || "Read expert insights and tools on MaxClickEmpire."}</description> <pubDate>${pubDate}</pubDate> <guid>${url}</guid> </item>);

fs.writeFileSync(filePath, html, "utf-8"); }

// === Write sitemap.xml const sitemap = <?xml version="1.0" encoding="UTF-8"?> <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"> ${urls.join("\n")}  </urlset>; fs.writeFileSync(sitemapFile, sitemap.trim(), "utf-8");

// === Write rss.xml const rss = <?xml version="1.0" encoding="UTF-8"?> <rss version="2.0"> <channel> <title>MaxClickEmpire RSS Feed</title> <link>${baseUrl}</link> <description>Strategic articles and tools from MaxClickEmpire</description> ${rssItems.join("\n")}  </channel> </rss>; fs.writeFileSync(rssFile, rss.trim(), "utf-8");

console.log("✅ SEO Ecosystem Generation Complete: Injected enhancer, updated sitemap and RSS.");

  
