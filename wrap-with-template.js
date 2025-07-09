const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");
const templatePath = path.join(__dirname, "template.html");

// Load official template structure
const template = fs.readFileSync(templatePath, "utf8");

// Unique fingerprint to detect your official template
const templateSignature = '<link rel="canonical" href="https://read.maxclickempire.com/posts/';

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // If already wrapped with correct template — skip
  if (content.includes(templateSignature)) {
    console.log(`⏩ Skipped (already wrapped): ${file}`);
    return;
  }

  // If it's some other <html> structure — remove it
  if (content.includes("<html") || content.includes("<!DOCTYPE html>")) {
    const stripped = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    content = stripped ? stripped[1] : extractBodyInnerHTML(content);
    console.log(`♻️ Stripped non-matching wrapper: ${file}`);
  }

  // === Extract <h1> as title ===
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = h1Match ? h1Match[1].trim() : file.replace(".html", "");

  // === Extract meta description from comment ===
  const descMatch = content.match(/<!--\s*Meta Description:\s*(.*?)\s*-->/i);
  const description = descMatch
    ? descMatch[1].trim()
    : `Read about ${title}.`;

  // === Extract keywords if present ===
  const keywordMatch = content.match(/<meta name="keywords" content="(.*?)"/i);
  const keywords = keywordMatch ? keywordMatch[1].trim() : "";

  // === Add 'featured-image' class to first image ===
  content = content.replace(
    /<img([^>]+)>/,
    '<img class="featured-image"$1>'
  );

  // === ISO date ===
  const isoDate = new Date().toISOString();
  const filename = path.basename(file, ".html");

  // === Inject into template ===
  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, keywords)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{DATE}}/g, isoDate)
    .replace(/{{CONTENT}}/g, content.trim());

  // === Overwrite file ===
  fs.writeFileSync(filePath, finalHtml, "utf8");
  console.log(`✅ Wrapped clean: ${file}`);
});

// Helper: fallback strip function
function extractBodyInnerHTML(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : html;
      }
