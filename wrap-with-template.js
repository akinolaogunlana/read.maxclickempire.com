const fs = require("fs");
const path = require("path");

// === CONFIG ===
const postsDir = path.join(__dirname, "posts");
const templatePath = path.join(__dirname, "template.html");
const template = fs.readFileSync(templatePath, "utf8");

// === Helper: Check if already wrapped ===
function isWrapped(content) {
  return content.includes("<!DOCTYPE html>") && content.includes("</html>");
}

// === Helper: Clean old structure ===
function cleanContent(content) {
  // Remove all <script type="application/ld+json"> blocks
  content = content.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");

  // Remove any doctype, html, head, or body tags
  content = content.replace(/<\/?(html|head|body|!DOCTYPE)[^>]*>/gi, "");

  // Strip excessive comments except Meta Description
  content = content.replace(/<!--(?!\s*Meta Description).*?-->/gs, "");

  return content.trim();
}

// === Helper: Minify final HTML ===
function minifyHTML(html) {
  return html
    .replace(/>\s+</g, '><')                  // Remove whitespace between tags
    .replace(/\s{2,}/g, ' ')                  // Collapse multiple spaces
    .replace(/\n+/g, '')                      // Remove newlines
    .replace(/<!--(?!\[if).*?-->/g, '');      // Remove non-conditional comments
}

// === Process files ===
fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (isWrapped(content)) {
    console.log(`⏭️  Skipping: ${file}`);
    return;
  }

  // Clean and extract
  content = cleanContent(content);
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = h1Match ? h1Match[1].trim() : file.replace(".html", "");

  const descMatch = content.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  const description = descMatch ? descMatch[1].trim() : `Read about ${title}.`;

  const keywordMatch = content.match(/<meta name="keywords" content="(.*?)"/i);
  const keywords = keywordMatch ? keywordMatch[1] : "";

  const filename = path.basename(file, ".html");
  const isoDate = new Date().toISOString();

  // Inject and compress
  const finalHtmlRaw = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, isoDate)
    .replace(/{{CONTENT}}/g, content);

  const compressedHtml = minifyHTML(finalHtmlRaw);

  // Save final file
  fs.writeFileSync(filePath, compressedHtml, "utf8");
  console.log(`✅ Wrapped, cleaned & compressed: ${file}`);
});