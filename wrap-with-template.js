#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load template
const template = fs.readFileSync(templatePath, "utf8");

// Process each file in raw/
fs.readdirSync(rawDir).forEach((file) => {
  const filePath = path.join(rawDir, file);
  if (fs.lstatSync(filePath).isFile() && file.endsWith(".html")) {
    const rawContent = fs.readFileSync(filePath, "utf8");

    // Load the raw HTML content with Cheerio
    const $ = cheerio.load(rawContent);

    // Extract title, description, and keywords from content
    const title = $("h1").first().text().trim() || "Untitled";
    const description = $("p").first().text().trim() || "Default description";
    const keywords = $("meta[name='keywords']").attr("content") || "default,keywords";

    // Wrap content in <main><article>
    const wrappedContent = `<main><article>${rawContent}</article></main>`;

    // Replace placeholders in template
    let finalHtml = template
      .replace("{{TITLE}}", title)
      .replace("{{DESCRIPTION_ESCAPED}}", description.replace(/"/g, "&quot;"))
      .replace("{{KEYWORDS}}", keywords)
      .replace("{{CONTENT}}", wrappedContent);

    // Write final HTML to dist
    const outputFilePath = path.join(distDir, file);
    fs.writeFileSync(outputFilePath, finalHtml, "utf8");

    console.log(`✅ Processed: ${file}`);
  }
});