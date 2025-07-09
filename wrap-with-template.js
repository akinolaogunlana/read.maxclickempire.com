// ✅ MaxClickEmpire Post Wrapper — Now using 'posts/' as input/output
const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html"); // Your SEO template
const POSTS_DIR = path.join(__dirname, "posts"); // Raw and output directory

// Check if template.html exists
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error("❌ template.html not found!");
  process.exit(1);
}

// Check if posts directory exists
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

  // Extract core info
  const title = (html.match(/<h1[^>]*>(.*?)<\/h1>/i) || [])[1] || "Untitled Post";
  const description = (html.match(/<p[^>]*>(.*?)<\/p>/i) || [])[1] || "A helpful resource from MaxClickEmpire.";
  const dateMatch = html.match(/datetime="([^"]+)"/i);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString();
  const slug = file.replace(/\.html$/, "");

  // Replace placeholders
  const wrapped = template
    .replace(/{{TITLE}}/g, sanitize(title))
    .replace(/{{DESCRIPTION}}/g, sanitize(description))
    .replace(/{{CONTENT}}/g, html)
    .replace(/{{FILENAME}}/g, slug)
    .replace(/{{DATE}}/g, date)
    .replace(/{{KEYWORDS}}/g, sanitize(title.toLowerCase().replace(/\W+/g, ", ")));

  // Save wrapped version
  fs.writeFileSync(filePath, wrapped, "utf8");
  console.log(`✅ Wrapped: ${file}`);
});