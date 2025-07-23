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

// 🧼 Sanitize HTML content
function sanitizeHTMLContent(content) {
  // Remove existing HERO section
  content = content.replace(/<!-- HERO START -->[\s\S]*?<!-- HERO END -->/gi, "");

  // Remove duplicate <article> tags
  content = content.replace(/<article[^>]*>[\s\S]*?<\/article>/gi, "");

  // Allow only the first <h1>
  let h1Seen = false;
  content = content.replace(/<h1[\s\S]*?<\/h1>/gi, match => {
    if (!h1Seen) {
      h1Seen = true;
      return match;
    }
    return ""; // Remove subsequent h1
  });

  return content.trim();
}

// 🦸‍♂️ Build hero section with social sharing
function buildHeroSection(metadata) {
  const encodedURL = encodeURIComponent(metadata.canonical || "");
  const encodedTitle = encodeURIComponent(metadata.title || "");

  return `
<!-- HERO START -->
<section class="hero-section">
  <div class="hero-content">
    <p class="post-date">${metadata.date || ""}</p>
    <h1 class="post-title">${metadata.h1 || metadata.title || ""}</h1>
    <p class="post-description">${metadata.description || ""}</p>
    <div class="social-share">
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedURL}" target="_blank" rel="noopener">Share on Facebook</a> |
      <a href="https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}" target="_blank" rel="noopener">Share on Twitter</a>
    </div>
  </div>
</section>
<!-- HERO END -->
  `.trim();
}

// 🧩 Replace template placeholders
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

// 🧠 Process all posts
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

  // Sanitize content
  content = sanitizeHTMLContent(content);

  // Build hero section
  const hero = buildHeroSection(metadata);

  // Inject hero after <body> tag
  content = content.replace(/<body[^>]*>/i, match => `${match}\n${hero}`);

  // Wrap with template
  const finalHtml = placeholderReplacer(template, metadata, content);

  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});