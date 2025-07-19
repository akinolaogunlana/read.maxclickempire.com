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

  // Extract title from <h1> or fallback to filename
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.html$/, "");

  // Extract meta description from comment block OR first <p>
  const descMatch = content.match(/<!--\s*desc:(.*?)-->/i);
  const description = descMatch
    ? descMatch[1].trim()
    : (content.match(/<p[^>]*>(.*?)<\/p>/i)?.[1].trim().replace(/<[^>]+>/g, "") || "").slice(0, 160);

  // SEO-safe slug for URL path or ID
  const slug = filename.replace(/\.html$/, "");

  // Fill in template
  let finalHTML = template
    .replace(/{{\s*TITLE\s*}}/gi, title)
    .replace(/{{\s*DESCRIPTION\s*}}/gi, description)
    .replace(/{{\s*SLUG\s*}}/gi, slug)
    .replace(/{{\s*CONTENT\s*}}/gi, content);

  // Output file
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), finalHTML, "utf-8");
});