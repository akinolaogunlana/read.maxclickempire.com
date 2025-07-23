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

// 🧼 Sanitize the post HTML content
function sanitizeHTMLContent(content) {
  // Extract only the content inside <body> if present
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  }

  // Remove any existing hero section
  content = content.replace(/<!-- HERO START -->[\s\S]*?<!-- HERO END -->/gi, "");

  // Remove entire <article> blocks
  content = content.replace(/<article[^>]*>[\s\S]*?<\/article>/gi, "");

  // Remove any injected postMetadata script block
  content = content.replace(/<script[^>]*>[\s\S]*?window\.postMetadata[\s\S]*?<\/script>/gi, "");

  // Remove extra <html>, <head>, <meta>, <title>, <link>, <style>, <main> blocks if present
  content = content.replace(/<\/?(html|head|meta|title|link|style|main)[^>]*>/gi, "");

  // Only keep the first <h1>
  let h1Seen = false;
  content = content.replace(/<h1[\s\S]*?<\/h1>/gi, match => {
    if (!h1Seen) {
      h1Seen = true;
      return match;
    }
    return ""; // Remove subsequent h1s
  });

  return content.trim();
}

// 🧩 Replace placeholders in the template
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

// 🧠 Process each post
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

  // Sanitize and clean post content
  content = sanitizeHTMLContent(content);

  // No hero injected — clean content only
  const finalContent = content;

  // Wrap with template
  const finalHtml = placeholderReplacer(template, metadata, finalContent);

  // Save the final HTML to dist
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});