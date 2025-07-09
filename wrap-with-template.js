const fs = require("fs");
const path = require("path");

// Template HTML wrapper file (with placeholders like {{TITLE}}, {{CONTENT}}, etc.)
const templatePath = path.join(__dirname, "template.html");
const contentDir = path.join(__dirname, "raw");
const outputDir = path.join(__dirname, "dist");

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the base HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Utility: create a clean filename slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Wrap each file in /raw with the template
fs.readdirSync(contentDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const rawContent = fs.readFileSync(path.join(contentDir, file), "utf8");

  // Try to extract metadata
  const title = (rawContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || [])[1] || "Untitled Post";
  const description =
    (rawContent.match(/<p[^>]*>(.*?)<\/p>/i) || [])[1] ||
    "Post from MaxClickEmpire";
  const date = new Date().toISOString().split("T")[0];
  const slug = slugify(title);
  const filename = slug;

  const finalHtml = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{KEYWORDS}}/g, title.split(" ").join(", "))
    .replace(/{{DATE}}/g, date)
    .replace(/{{FILENAME}}/g, filename)
    .replace(/{{CONTENT}}/g, rawContent);

  fs.writeFileSync(path.join(outputDir, `${filename}.html`), finalHtml, "utf8");
  console.log(`✅ Wrapped ${file} as ${filename}.html`);
});