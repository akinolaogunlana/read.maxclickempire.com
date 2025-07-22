#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { postMetadata } = require("../data/post-meta.js");

const templatePath = path.join(__dirname, "..", "template.html");
const postsDir = path.join(__dirname, "..", "posts");
const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const template = fs.readFileSync(templatePath, "utf8");

const placeholderReplacer = (template, metadata, content) => {
  return template
    .replace("{{TITLE}}", metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace("{{KEYWORDS}}", metadata.keywords || "")
    .replace("{{AUTHOR}}", metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace("{{SLUG}}", metadata.slug || "")
    .replace("{{CONTENT}}", content || "");
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
  const content = fs.readFileSync(contentPath, "utf8");

  const finalHtml = placeholderReplacer(template, metadata, content);

  const outputPath = path.join(distDir, file);
  fs.writeFileSync(outputPath, finalHtml);
  console.log(`✅ Wrapped and saved: ${file}`);
});