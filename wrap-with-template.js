const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const OUTPUT_DIR = path.join(__dirname, "dist");
const POSTS_DIR = path.join(__dirname, "posts");

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

fs.readdirSync(POSTS_DIR).forEach((filename) => {
  if (!filename.endsWith(".html")) return;

  const filePath = path.join(POSTS_DIR, filename);
  let content = fs.readFileSync(filePath, "utf-8");

  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.html$/, "");

  const descMatch = content.match(/<!--\s*desc:(.*?)-->/i);
  const description = descMatch
    ? descMatch[1].trim()
    : (content.match(/<p[^>]*>(.*?)<\/p>/i)?.[1].replace(/<[^>]+>/g, "").trim() || "").slice(0, 160);

  const keywordsMatch = content.match(/<!--\s*keywords:(.*?)-->/i);
  const keywords = keywordsMatch
    ? keywordsMatch[1].trim()
    : title.toLowerCase().split(/\s+/).slice(0, 10).join(", ");

  const slug = filename.replace(/\.html$/, "");
  const canonicalURL = `https://read.maxclickempire.com/posts/${slug}.html`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "author": {
      "@type": "Person",
      "name": "Ogunlana Akinola Okikiola"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalURL
    },
    "url": canonicalURL,
    "datePublished": new Date().toISOString(),
    "image": "https://read.maxclickempire.com/assets/og-image.jpg",
    "publisher": {
      "@type": "Organization",
      "name": "MaxClickEmpire",
      "logo": {
        "@type": "ImageObject",
        "url": "https://read.maxclickempire.com/assets/favicon.png"
      }
    }
  };

  const finalHTML = template
    .replace(/{{\s*TITLE\s*}}/gi, title)
    .replace(/{{\s*DESCRIPTION\s*}}/gi, description)
    .replace(/{{\s*KEYWORDS\s*}}/gi, keywords)
    .replace(/{{\s*SLUG\s*}}/gi, slug)
    .replace(/{{\s*FILENAME\s*}}/gi, slug)
    .replace(/{{\s*STRUCTURED_DATA\s*}}/gi, `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`)
    .replace(/{{\s*CONTENT\s*}}/gi, content);

  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, finalHTML, "utf-8");
});