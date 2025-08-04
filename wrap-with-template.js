#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");

// 🔐 Load Firebase credentials
const serviceAccount = require("./credentials.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");
const metaPath = path.join(__dirname, "data/post-meta.js");

// Ensure dist/ directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Load HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Load previous metadata or initialize fresh object
let postMetadata = {};
try {
  const rawMeta = fs.readFileSync(metaPath, "utf8");
  const match = rawMeta.match(/const postMetadata\s*=\s*({[\s\S]*?});/);
  if (match) {
    postMetadata = Function('"use strict";return ' + match[1])();
  }
} catch (e) {
  console.warn("⚠️ Could not load post-meta.js. Starting fresh.");
}

// Helper: hash content for checksum comparison
function hashContent(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

// Replace placeholders in the template
function applyTemplate(template, metadata, content) {
  return template
    .replace(/{{TITLE}}/g, metadata.title || "")
    .replace(/{{DESCRIPTION_ESCAPED}}/g, metadata.description || "")
    .replace(/{{KEYWORDS}}/g, metadata.keywords || "")
    .replace(/{{AUTHOR}}/g, metadata.author || "MaxClickEmpire")
    .replace(/{{CANONICAL}}/g, metadata.canonical || "")
    .replace(/{{OG_IMAGE}}/g, metadata.ogImage || "")
    .replace(/{{SLUG}}/g, metadata.slug || "")
    .replace(/{{DATE_PUBLISHED}}/g, metadata.datePublished || "")
    .replace(/{{DATE_MODIFIED}}/g, metadata.dateModified || "")
    .replace(/{{CONTENT}}/g, content || "");
}

// Main async function
async function processFirestorePosts() {
  const snapshot = await db.collection("posts").get();
  if (snapshot.empty) {
    console.log("❌ No posts found in Firestore.");
    return;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const slug = data.slug || doc.id;
    const filename = `${slug}.html`;
    const outputPath = path.join(distDir, filename);

    const trimmedContent = (data.content || "").trim();
    const contentHash = hashContent(trimmedContent);
    const existing = postMetadata[slug] || {};
    const contentChanged = contentHash !== existing.contentHash;

    const now = new Date().toISOString();
    const datePublished = existing.datePublished || data.datePublished || now;
    const dateModified = contentChanged ? now : existing.dateModified || now;

    const canonical = `https://read.maxclickempire.com/posts/${filename}`;
    const ogImage = data.ogImage || "https://read.maxclickempire.com/assets/og-image.jpg";

    const html = applyTemplate(template, {
      ...(existing || {}),
      title: data.title || slug,
      description: data.description || "",
      keywords: data.keywords || "",
      slug,
      canonical,
      ogImage,
      datePublished,
      dateModified
    }, trimmedContent);

    fs.writeFileSync(outputPath, html, "utf8");
    console.log(`✅ Wrapped Firestore post: ${filename}`);

    postMetadata[slug] = {
      ...(existing || {}),
      title: data.title || slug,
      description: data.description || "",
      keywords: data.keywords || "",
      slug,
      canonical,
      ogImage,
      datePublished,
      dateModified,
      contentHash
    };
  }

  // Save metadata if changed
  const newMetaJs = `// Auto-generated metadata\nconst postMetadata = ${JSON.stringify(postMetadata, null, 2)};\nmodule.exports = { postMetadata };`;
  const existingMetaJs = fs.existsSync(metaPath) ? fs.readFileSync(metaPath, "utf8") : "";

  if (newMetaJs !== existingMetaJs) {
    fs.writeFileSync(metaPath, newMetaJs, "utf8");
    console.log("💾 Updated data/post-meta.js");
  } else {
    console.log("✅ No changes to post-meta.js");
  }

  console.log("🎉 All Firestore posts processed.");
}

// Run the function
processFirestorePosts().catch(err => {
  console.error("🔥 Error processing posts:", err);
});