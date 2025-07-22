#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("./data/post-meta.js");

const templatePath = path.join(__dirname, "template.html");
const postsDir = path.join(__dirname, "posts");
const distDir = path.join(__dirname, "dist");

// Ensure output directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Load template HTML
const template = fs.readFileSync(templatePath, "utf8");

function sanitizeHTMLContent(content) {
  // Keep the first <article> block, remove others
  let articleCount = 0;
  content = content.replace(/<article[^>]*>[\s\S]*?<\/article>/gi, match => {
    articleCount++;
    return articleCount === 1 ? match : "";
  });

  // Allow only one <h1> (keep the first, remove others)
  let h1Count = 0;
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, match => {
    h1Count++;
    return h1Count === 1 ? match : "";
  });

  // Remove duplicate <meta> tags (keep first of each type)
  const metaTypes = new Set();
  content = content.replace(/<meta[^>]+>/gi, tag => {
    const nameAttr = tag.match(/name\s*=\s*["']([^"']+)["']/i);
    const propertyAttr = tag.match(/property\s*=\s*["']([^"']+)["']/i);
    const identifier = (nameAttr?.[1] || propertyAttr?.[1] || "").toLowerCase();

    if (identifier && metaTypes.has(identifier)) return "";
    if (identifier) metaTypes.add(identifier);
    return tag;
  });

  // Only one <title> tag allowed (keep first)
  let titleSeen = false;
  content = content.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, match => {
    if (titleSeen) return "";
    titleSeen = true;
    return match;
  });

  // Trim extra whitespace
  content = content.trim();
  return content;
}

function placeholderReplacer(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{CONTENT}}/g, content || "");
}

// Process all .html post files
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

  // Clean up and sanitize HTML
  content = sanitizeHTMLContent(content);

  // Replace placeholders
  const finalHtml = placeholderReplacer(template, metadata, content);

  // Write to dist/
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});