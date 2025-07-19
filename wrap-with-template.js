// wrap-with-template.js

const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "template.html");
const outputDir = path.join(__dirname, "dist");
const rawDir = path.join(__dirname, "raw");

// Load the base HTML template
const baseTemplate = fs.readFileSync(templatePath, "utf8");

// Loop through each raw HTML file
fs.readdirSync(rawDir).forEach(file => {
  if (path.extname(file) === ".html") {
    const slug = path.basename(file, ".html");
    const rawPath = path.join(rawDir, file);
    let rawHtml = fs.readFileSync(rawPath, "utf8")
      .replace(/[\uE000-\uF8FF]/g, "") // Remove private use unicode
      .replace(/{{\s*STRUCTURED_DATA\s*}}/gi, ""); // Remove STRUCTURED_DATA from raw

    // Extract title, description, and JSON-LD structured data
    const titleMatch = rawHtml.match(/<title>(.*?)<\/title>/);
    const descriptionMatch = rawHtml.match(/<meta\s+name="description"\s+content="(.*?)"\s*\/?>/i);
    const structuredDataMatch = rawHtml.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);

    const title = titleMatch ? titleMatch[1] : "";
    const description = descriptionMatch ? descriptionMatch[1] : "";
    const structuredData = structuredDataMatch ? structuredDataMatch[1].trim() : "";

    // Inject metadata and content into the template
    const finalHtml = baseTemplate
      .replace(/{{\s*TITLE\s*}}/g, title)
      .replace(/{{\s*DESCRIPTION\s*}}/g, description)
      .replace(/{{\s*STRUCTURED_DATA\s*}}/g, structuredData)
      .replace(/{{\s*CONTENT\s*}}/g, rawHtml);

    // Write the final file
    const outputPath = path.join(outputDir, `${slug}.html`);
    fs.writeFileSync(outputPath, finalHtml, "utf8");
    console.log(`✅ Wrapped ${file} into ${outputPath}`);
  }
});