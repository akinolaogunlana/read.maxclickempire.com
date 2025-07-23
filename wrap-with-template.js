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

// Load base HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Replaces placeholders in the HTML template
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

// Get HTML files in posts/
const postFiles = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

postFiles.forEach(file => {
  const slug = file.replace(/\.html$/, "");
  const metadata = postMetadata[slug];

  if (!metadata) {
    console.warn(`⚠️ No metadata found for slug: ${slug}, skipping...`);
    return;
  }

  const contentPath = path.join(postsDir, file);
  let content = fs.readFileSync(contentPath, "utf8");

  // 🧹 Step 1: Remove everything from <head>, <title>, <meta>, <script>, and duplicated tags
  content = content
    // Remove entire <head> blocks if any
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    // Remove individual <title> or <meta> tags
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]+?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Remove duplicated <main> or <article>
    .replace(/<\/?(main|article)[^>]*>/gi, "")
    // Remove stray DOCTYPE or <html>, <body>, etc.
    .replace(/<!DOCTYPE html>/gi, "")
    .replace(/<\/?(html|body)[^>]*>/gi, "");

  // 🧱 Final wrapping
  const finalHtml = placeholderReplacer(template, metadata, content.trim());

  // Write to dist/
  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved to dist/: ${file}`);
});

// 🧼 Clean posts/ folder after wrapping
postFiles.forEach(file => {
  const filePath = path.join(postsDir, file);
  fs.unlinkSync(filePath);
  console.log(`🧹 Deleted wrapped post from posts/: ${file}`);
});

console.log("🎉 All posts wrapped and cleaned successfully.");