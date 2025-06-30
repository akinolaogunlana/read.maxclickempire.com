// ✅ SEO Ecosystem Generator Script v1.0 — MaxClickEmpire
// Scans your /posts directory and builds sitemap.xml, rss.xml, and robots.txt

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteUrl = "https://read.maxclickempire.com";
const postsDir = path.join(__dirname, "posts");

// Helper to generate post metadata from file name
const getPosts = () => {
  const files = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));
  return files.map(file => {
    const slug = file.replace(/\.html$/, "");
    const url = `${siteUrl}/posts/${file}`;
    const stats = fs.statSync(path.join(postsDir, file));
    const date = stats.mtime.toISOString().split("T")[0];

    return { slug, url, date };
  });
};

const posts = getPosts();

// --- Generate sitemap.xml ---
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${posts.map(post => `
  <url>
    <loc>${post.url}</loc>
    <lastmod>${post.date}</lastmod>
    <priority>0.8</priority>
  </url>`).join("\n")}
</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap.trim());

// --- Generate rss.xml ---
const rssItems = posts.map(post => `
  <item>
    <title>${post.slug.replace(/-/g, " ")}</title>
    <link>${post.url}</link>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
  </item>`).join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>MaxClickEmpire RSS Feed</title>
  <link>${siteUrl}</link>
  <description>Stay updated with MaxClickEmpire's latest guides and strategies.</description>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`;

fs.writeFileSync("rss.xml", rss.trim());

// --- Generate robots.txt ---
const robots = `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml`;

fs.writeFileSync("robots.txt", robots.trim());

console.log("✅ SEO files generated: sitemap.xml, rss.xml, robots.txt");
