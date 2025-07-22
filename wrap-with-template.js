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
  // Remove ALL existing hero sections (use comment marker if available)
  content = content.replace(/<!-- HERO START -->[\s\S]*?<!-- HERO END -->/gi, "");

  // Remove duplicate article tags
  content = content.replace(/<article[^>]*>[\s\S]*?<\/article>/gi, "");

  // Keep only the first <h1>
  let h1Count = 0;
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, match => {
    h1Count++;
    return h1Count === 1 ? match : "";
  });

  return content.trim();
}

function buildHeroSection(metadata) {
  return `
  <!-- HERO START -->
  <section class="hero-section">
    <div class="hero-content">
      <p class="post-date">${metadata.date || ""}</p>
      <h1 class="post-title">${metadata.h1 || metadata.title || ""}</h1>
      <p class="post-description">${metadata.description || ""}</p>
      <div class="social-share">
        <a href="https://www.facebook.com/sharer/sharer.php?u=${metadata.canonical}" target="_blank" rel="noopener">Share on Facebook</a> |
        <a href="https://twitter.com/intent/tweet?url=${metadata.canonical}&text=${metadata.title}" target="_blank" rel="noopener">Share on Twitter</a>
      </div>
    </div>
  </section>
  <!-- HERO END -->
  `;
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

  // Sanitize HTML: remove duplicate articles, multiple h1s, and existing hero
  content = sanitizeHTMLContent(content);

  // Inject hero section directly under first <h1>
  const hero = buildHeroSection(metadata);

  // Insert hero section after <body> if <h1> not found
  if (!content.includes("<h1")) {
    content = `${hero}\n${content}`;
  } else {
    // Inject hero right before main content
    content = `${hero}\n${content}`;
  }

  const finalHtml = placeholderReplacer(template, metadata, content);

  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});