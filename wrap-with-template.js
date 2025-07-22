#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Create dist folder if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load HTML template
let template = fs.readFileSync(templatePath, "utf-8");

// Loop through all files in raw directory
fs.readdirSync(rawDir).forEach((file) => {
  const rawFilePath = path.join(rawDir, file);

  if (path.extname(file) === ".html") {
    const content = fs.readFileSync(rawFilePath, "utf-8");

    const $ = cheerio.load(content);
    const slug = path.basename(file, ".html");
    const metadata = postMetadata[slug] || {};

    const title = metadata.title || $("title").text() || slug;
    const description = metadata.description || $("meta[name='description']").attr("content") || "";
    const keywords = metadata.keywords || $("meta[name='keywords']").attr("content") || "";
    const author = metadata.author || "Cryptego Team";
    const canonical = metadata.canonical || `https://cryptego.com/${slug}.html`;
    const ogImage = metadata.image || "https://cryptego.com/default-og-image.jpg";

    // Escape description for safety in HTML
    const escapedDescription = description.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Inject metadata into template
    const finalHtml = template
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DESCRIPTION_ESCAPED}}/g, escapedDescription)
      .replace(/{{KEYWORDS}}/g, keywords)
      .replace(/{{AUTHOR}}/g, author)
      .replace(/{{CANONICAL}}/g, canonical)
      .replace(/{{OG_IMAGE}}/g, ogImage)
      .replace(/{{CONTENT}}/g, $("body").html() || "");

    const outputPath = path.join(distDir, file);
    fs.writeFileSync(outputPath, finalHtml, "utf-8");

    console.log(`✅ Generated: ${file}`);
  }
});