const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");
const templatePath = path.join(__dirname, "template.html");
const template = fs.readFileSync(templatePath, "utf8");

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already wrapped
  if (content.includes("<!DOCTYPE html>")) return;

  // Extract <h1> as title
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/);
  const title = h1Match ? h1Match[1].trim() : file.replace(".html", "");

  // Extract meta description from comment
  const descMatch = content.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  const description = descMatch ? descMatch[1].trim() : `Read about ${title}.`;

  // Extract keywords
  const keywordMatch = content.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
  const keywords = keywordMatch ? keywordMatch[1] : "";

  const filename = path.basename(file, ".html");
  const isoDate = new Date().toISOString();

  // Remove any existing ld+json blocks to prevent duplication
  content = content.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");

  // Fix nested/broken <a> tags
  content = content.replace(/title="([^"]*<a[^"]*)"/gi, ''); // Remove broken title tags with <a> inside

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, isoDate)
    .replace(/{{CONTENT}}/g, content.trim());

  fs.writeFileSync(filePath, finalHtml, "utf8");
  console.log(`✅ Wrapped: ${file}`);
});