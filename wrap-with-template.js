const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");
const templatePath = path.join(__dirname, "template.html");
const template = fs.readFileSync(templatePath, "utf8");

function isWrapped(content) {
  return content.includes("<!DOCTYPE html>") && content.includes("</html>");
}

function cleanContent(content) {
  // Remove all <script type="application/ld+json"> blocks
  content = content.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");

  // Remove leftover html/head/body/doc type
  content = content.replace(/<\/?(html|head|body|!DOCTYPE)[^>]*>/gi, "");

  // Keep only meta description comment
  content = content.replace(/<!--(?!\s*Meta Description).*?-->/gs, "");

  return content.trim();
}

function minifyHTML(html) {
  return html
    .replace(/>\s+</g, '><')      // Remove space between tags
    .replace(/\s{2,}/g, ' ')      // Collapse multiple spaces
    .replace(/\n+/g, '')          // Remove newlines
    .replace(/<!--.*?-->/g, '');  // Remove all comments
}

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (isWrapped(content)) {
    console.log(`⏭️  Already wrapped: ${file}`);
    return;
  }

  // Clean malformed structures and duplicated scripts
  content = cleanContent(content);

  // Metadata extraction
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = h1Match ? h1Match[1].trim() : file.replace(".html", "");

  const descMatch = content.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  const description = descMatch ? descMatch[1].trim() : `Read about ${title}.`;

  const keywordMatch = content.match(/<meta name="keywords" content="(.*?)"/i);
  const keywords = keywordMatch ? keywordMatch[1] : "";

  const filename = path.basename(file, ".html");
  const isoDate = new Date().toISOString();

  // Inject and minify
  const finalHtmlRaw = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, isoDate)
    .replace(/{{CONTENT}}/g, content);

  const finalCompressed = minifyHTML(finalHtmlRaw);
  fs.writeFileSync(filePath, finalCompressed, "utf8");

  console.log(`✅ Wrapped, cleaned & compressed: ${file}`);
});
