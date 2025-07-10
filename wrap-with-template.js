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

  if (html.includes("<!-- WRAPPED -->")) {
    console.log(`⚠️ Already wrapped: ${file}`);
    return;
  }

  const title = (html.match(/<h1[^>]*>(.*?)<\/h1>/i) || [])[1];
  const firstParagraph = (html.match(/<p[^>]*>(.*?)<\/p>/i) || [])[1];
  const dateMatch = html.match(/datetime="([^"]+)"/i);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString();
  const slug = file.replace(/\.html$/, "");

  if (!title) {
    console.warn(`⚠️ Missing <h1> in: ${file}`);
  }

  const description = sanitize(firstParagraph || title || "A helpful resource from MaxClickEmpire.");
  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${sanitize(title || slug)}",
  "datePublished": "${date}",
  "description": "${description}",
  "url": "https://maxclickempire.com/posts/${slug}.html",
  "author": {
    "@type": "Organization",
    "name": "MaxClickEmpire"
  }
}
</script>`.trim();

  const wrapped = `
<!-- WRAPPED -->
${template
    .replace(/{{TITLE}}/g, sanitize(title || slug))
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{CONTENT}}/g, html)
    .replace(/{{FILENAME}}/g, slug)
    .replace(/{{DATE}}/g, date)
    .replace(/{{STRUCTURED_DATA}}/g, structuredData)}
`;

  fs.writeFileSync(filePath, wrapped.trim(), "utf8");
  console.log(`✅ Wrapped: ${file}`);
});