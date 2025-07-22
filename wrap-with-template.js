#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const template = fs.readFileSync(templatePath, "utf8");

function sanitizeHTMLContent(content) {
  // Remove duplicate <article> blocks
  content = content.replace(/<article[^>]*>[\s\S]*?<\/article>/gi, "");

  // Allow only one <h1> (keep the first, remove others)
  let h1Count = 0;
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, match => {
    h1Count++;
    return h1Count === 1 ? match : "";
  });

  // Optional: Trim extra whitespace
  content = content.trim();
  return content;
}

const placeholderReplacer = (template, metadata, content) => {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, content || "");
};

const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️  No metadata found for slug: ${slug}`);
    return;
  }

  const contentPath = path.join(postsDir, file);
  let content = fs.readFileSync(contentPath, "utf8");

  // Clean up duplicate <article> and <h1>
  content = sanitizeHTMLContent(content);

  const finalHtml = placeholderReplacer(template, metadata, content);

  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});