const fs = require("fs");
const path = require("path");

// Paths
const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Create dist if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load the HTML template
const template = fs.readFileSync(templatePath, "utf-8");

// Utility to escape HTML in description
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (char) => {
    const escapeChars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return escapeChars[char] || char;
  });
}

// Read all posts and wrap them
fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  const html = fs.readFileSync(filePath, "utf-8");

  // Extract metadata from frontmatter-style comments if available
  const meta = {
    title: "",
    description: "",
    keywords: "",
    canonical: "",
    date_published: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    og_image: "https://read.maxclickempire.com/assets/og-default.jpg",
  };

  // Extract <title> from the post itself
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i
  );
  if (descMatch) meta.description = descMatch[1].trim();

  const keywordsMatch = html.match(
    /<meta\s+name=["']keywords["']\s+content=["'](.*?)["']\s*\/?>/i
  );
  if (keywordsMatch) meta.keywords = keywordsMatch[1].trim();

  const canonicalUrl = `https://read.maxclickempire.com/${file}`;
  meta.canonical = canonicalUrl;

  const wrapped = template
    .replace(/{{TITLE}}/g, meta.title)
    .replace(/{{DESCRIPTION}}/g, meta.description)
    .replace(/{{DESCRIPTION_ESCAPED}}/g, escapeHTML(meta.description))
    .replace(/{{KEYWORDS}}/g, meta.keywords)
    .replace(/{{AUTHOR}}/g, "Ogunlana Akinola Okikiola")
    .replace(/{{CANONICAL}}/g, meta.canonical)
    .replace(/{{OG_IMAGE}}/g, meta.og_image)
    .replace(/{{DATE_PUBLISHED}}/g, meta.date_published)
    .replace(/{{DATE_MODIFIED}}/g, meta.date_modified)
    .replace(/{{CONTENT}}/g, html);

  // Write to dist
  const outPath = path.join(distDir, file);
  fs.writeFileSync(outPath, wrapped, "utf-8");

  console.log(`Wrapped: ${file}`);
});