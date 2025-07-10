const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const POSTS_DIR = path.join(__dirname, "posts");

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error("❌ template.html not found!");
  process.exit(1);
}
if (!fs.existsSync(POSTS_DIR)) {
  console.error("❌ posts/ directory not found!");
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

function sanitize(text) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

fs.readdirSync(POSTS_DIR).forEach(file => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(POSTS_DIR, file);
  let html = fs.readFileSync(filePath, "utf8");

  // Skip already wrapped files
  if (html.includes("<!-- WRAPPED -->")) {
    console.log(`⚠️ Already wrapped: ${file}`);
    return;
  }

  // Strip <article> wrappers
  html = html.replace(/^<article[^>]*>/i, "").replace(/<\/article>\s*$/i, "");

  // Remove <meta> tags inside content
  html = html.replace(/<meta[^>]*>/gi, "");

  // Extract <h1> title
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = h1Match ? h1Match[1].trim() : "";
  if (!title) {
    console.warn(`⚠️ Missing <h1> in: ${file}`);
  }

  // Remove repeated title lines (especially above the <h1>)
  const rawTitleText = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleRegex = new RegExp(`(^|\\n)\\s*${rawTitleText}\\s*(\\n|$)`, "gi");
  html = html.replace(titleRegex, "\n");

  // Remove exact match of title inside first <p>
  const firstPMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (firstPMatch && title && firstPMatch[1].trim() === title.trim()) {
    html = html.replace(firstPMatch[0], "");
  }

  // Extract first paragraph for meta description
  const firstParagraph = (html.match(/<p[^>]*>(.*?)<\/p>/i) || [])[1];
  const description = sanitize(firstParagraph || title || "A helpful resource from MaxClickEmpire.");

  // Extract date from <time> tag if available
  const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString();

  const slug = file.replace(/\.html$/, "");

  // Structured Data Injection
  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${sanitize(title || slug)}",
  "description": "${description}",
  "url": "https://read.maxclickempire.com/posts/${slug}.html",
  "datePublished": "${date}",
  "dateModified": "${date}",
  "image": "https://read.maxclickempire.com/assets/og-image.jpg",
  "author": {
    "@type": "Person",
    "name": "Ogunlana Akinola Okikiola"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://read.maxclickempire.com/assets/favicon.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://read.maxclickempire.com/posts/${slug}.html"
  }
}
</script>`.trim();

  // Final wrap with template
  const wrapped = `
<!-- WRAPPED -->
${template
    .replace(/{{TITLE}}/g, sanitize(title || slug))
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{CONTENT}}/g, html.trim())
    .replace(/{{FILENAME}}/g, slug)
    .replace(/{{DATE}}/g, date)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)
    .replace(/{{KEYWORDS}}/g, "") // Safe fallback
}
`;

  fs.writeFileSync(filePath, wrapped.trim(), "utf8");
  console.log(`✅ Wrapped: ${file}`);
});