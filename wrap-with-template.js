const fs = require("fs");
const path = require("path");

const __dirname = path.resolve();

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const OUTPUT_DIR = path.join(__dirname, "dist");
const POSTS_DIR = path.join(__dirname, "posts");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

fs.readdirSync(POSTS_DIR).forEach((filename) => {
  if (!filename.endsWith(".html")) return;

  const filePath = path.join(POSTS_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");

  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.html$/, "");

  const descMatch = content.match(/<!--\s*desc:\s*(.*?)\s*-->/i);
  const description = descMatch
    ? descMatch[1].trim()
    : (content.match(/<p[^>]*>(.*?)<\/p>/i)?.[1].replace(/<[^>]+>/g, "").trim().slice(0, 160) || "");

  const keywordMatch = content.match(/<!--\s*keywords:\s*(.*?)\s*-->/i);
  const keywords = keywordMatch ? keywordMatch[1].trim() : "";

  const filenameSlug = filename.replace(/\.html$/, "");

  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${title}",
  "description": "${description}",
  "author": {
    "@type": "Person",
    "name": "Ogunlana Akinola Okikiola"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://read.maxclickempire.com/posts/${filenameSlug}.html"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://read.maxclickempire.com/assets/favicon.png"
    }
  }
}
</script>`.trim();

  const finalHTML = template
    .replace(/{{\s*TITLE\s*}}/gi, title)
    .replace(/{{\s*DESCRIPTION\s*}}/gi, description)
    .replace(/{{\s*KEYWORDS\s*}}/gi, keywords)
    .replace(/{{\s*FILENAME\s*}}/gi, filenameSlug)
    .replace(/{{\s*STRUCTURED_DATA\s*}}/gi, structuredData)
    .replace(/{{\s*CONTENT\s*}}/gi, content);

  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, finalHTML, "utf-8");
  console.log(`✅ Generated: ${outputPath}`);
});