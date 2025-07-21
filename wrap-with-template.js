const fs = require("fs");
const path = require("path");

// Paths
const TEMPLATE_PATH = path.join(__dirname, "template.html");
const OUTPUT_DIR = path.join(__dirname, "dist");
const POSTS_DIR = path.join(__dirname, "posts");

// Create dist/ if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read base template
const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

// Process each post file
fs.readdirSync(POSTS_DIR).forEach((filename) => {
  if (!filename.endsWith(".html")) return;

  const filePath = path.join(POSTS_DIR, filename);
  const rawContent = fs.readFileSync(filePath, "utf-8");

  // Extract meta info
  const titleMatch = rawContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.html$/, "");

  const descMatch = rawContent.match(/<!--\s*desc:(.*?)-->/i);
  const description = descMatch
    ? descMatch[1].trim()
    : rawContent.match(/<p[^>]*>(.*?)<\/p>/i)?.[1].replace(/<[^>]+>/g, "").trim().slice(0, 160) || "";

  const keywordMatch = rawContent.match(/<!--\s*keywords:(.*?)-->/i);
  const keywords = keywordMatch ? keywordMatch[1].trim() : "";

  const filenameSlug = filename.replace(/\.html$/, "");

  // Structured Data
  const structuredData = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${title}",
  "description": "${description}",
  "url": "https://read.maxclickempire.com/posts/${filenameSlug}.html",
  "datePublished": "${new Date().toISOString()}",
  "dateModified": "${new Date().toISOString()}",
  "author": {
    "@type": "Organization",
    "name": "MaxClickEmpire"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MaxClickEmpire",
    "logo": {
      "@type": "ImageObject",
      "url": "https://read.maxclickempire.com/assets/og-image.jpg"
    }
  },
  "mainEntityOfPage": "https://read.maxclickempire.com/posts/${filenameSlug}.html"
}
</script>`.trim();

  // Wrap post content
  const wrappedContent = `<main><article>\n${rawContent}\n</article></main>`;

  // Inject into template
  const finalHTML = template
    .replace(/{{\s*TITLE\s*}}/gi, title)
    .replace(/{{\s*DESCRIPTION\s*}}/gi, description.replace(/"/g, "&quot;"))
    .replace(/{{\s*KEYWORDS\s*}}/gi, keywords)
    .replace(/{{\s*STRUCTURED_DATA\s*}}/gi, structuredData)
    .replace(/{{\s*CONTENT\s*}}/gi, wrappedContent)
    .replace(/{{\s*POST_SLUG\s*}}/gi, filenameSlug); // optional if needed

  // Output final file
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, finalHTML, "utf-8");
  console.log(`✅ Generated: ${outputPath}`);
});