#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load the HTML template
const template = fs.readFileSync(templatePath, "utf-8");

fs.readdirSync(rawDir).forEach(file => {
  if (file.endsWith(".html")) {
    const rawHtml = fs.readFileSync(path.join(rawDir, file), "utf-8");
    const $ = cheerio.load(rawHtml);

    // Metadata from content
    const title = $("h1").first().text().trim();
    const description = $("p").first().text().trim();
    const keywords = postMetadata[file]?.keywords || "";
    const author = postMetadata[file]?.author || "MaxClickEmpire";
    const slug = path.basename(file, ".html");
    const canonical = `https://read.maxclickempire.com/posts/${slug}.html`;
    const ogImage = postMetadata[file]?.ogImage || "https://read.maxclickempire.com/default-og.jpg";

    // Extract only meaningful content
    const bodyContent = $("body").length ? $("body").html() : $.root().html();

    const contentHtml = `<main><article>${bodyContent}</article></main>`;

    // Fill in the template
    const finalHtml = template
      .replace("{{TITLE}}", title)
      .replace(/{{DESCRIPTION_ESCAPED}}/g, description.replace(/"/g, "&quot;"))
      .replace(/{{DESCRIPTION}}/g, description)
      .replace(/{{KEYWORDS}}/g, keywords)
      .replace(/{{AUTHOR}}/g, author)
      .replace(/{{POST_SLUG}}/g, slug)
      .replace(/{{CANONICAL}}/g, canonical)
      .replace(/{{OG_IMAGE}}/g, ogImage)
      .replace("{{CONTENT}}", contentHtml);

    // Write final HTML to dist folder
    fs.writeFileSync(path.join(distDir, file), finalHtml, "utf-8");
    console.log(`✅ Built: ${file}`);
  }
});