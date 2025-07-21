#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Load the HTML template
const template = fs.readFileSync(templatePath, "utf-8");

// Loop through each post file
fs.readdirSync(rawDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const slug = path.basename(file, ".html");
  const meta = postMetadata[slug];

  if (!meta) {
    console.warn(`⚠️  No metadata found for slug: ${slug}`);
    return;
  }

  const rawHtml = fs.readFileSync(path.join(rawDir, file), "utf-8");
  const $ = cheerio.load(rawHtml);

  // Extract body content only
  const bodyContent = $("body").length ? $("body").html() : $.root().html();

  // Inject metadata and content into the template
  const finalHtml = template
    .replace(/{{TITLE}}/g, meta.title)
    .replace(/{{DESCRIPTION_ESCAPED}}/g, meta.description)
    .replace(/{{KEYWORDS}}/g, meta.keywords || "")
    .replace(/{{AUTHOR}}/g, meta.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, meta.canonical || `https://read.maxclickempire.com/${slug}.html`)
    .replace(/{{OG_IMAGE}}/g, meta.og_image || "https://read.maxclickempire.com/assets/default-og.jpg")
    .replace("{{CONTENT}}", bodyContent);

  // Write the final HTML to dist folder
  fs.writeFileSync(path.join(distDir, `${slug}.html`), finalHtml, "utf-8");
  console.log(`✅ Generated: ${slug}.html`);
});