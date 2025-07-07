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

  const h1Match = content.match(/<h1>(.*?)<\/h1>/);
  const title = h1Match ? h1Match[1].trim() : file.replace(".html", "");

  const descMatch = content.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  const description = descMatch ? descMatch[1].trim() : `Read about ${title}.`;

  const keywordMatch = content.match(/<meta name="keywords" content="(.*?)"/);
  const keywords = keywordMatch ? keywordMatch[1] : "";

  const filename = path.basename(file, ".html");
  const isoDate = new Date().toISOString();

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
