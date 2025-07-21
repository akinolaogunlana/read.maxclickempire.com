#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { postMetadata } = require("./data/post-meta.js");

const rawDir = path.join(__dirname, "raw");
const templatePath = path.join(__dirname, "template.html");
const distDir = path.join(__dirname, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const template = fs.readFileSync(templatePath, "utf-8");

fs.readdirSync(rawDir).forEach(file => {
  if (file.endsWith(".html")) {
    const rawHtml = fs.readFileSync(path.join(rawDir, file), "utf-8");
    const $ = cheerio.load(rawHtml);

    const title = $("h1").first().text().trim();
    const description = $("p").first().text().trim();
    const keywords = postMetadata[file]?.keywords || "";
    const author = postMetadata[file]?.author || "MaxClickEmpire";
    const canonical = `https://read.maxclickempire.com/posts/${file}`;
    const ogImage = postMetadata[file]?.ogImage || "https://read.maxclickempire.com/default-og.jpg";

    // Extract only the content inside <body>
    const bodyContent = $("body").length ? $("body").html() : $.root().html();

    // Wrap in <main><article>
    const wrappedContent = `<main><article>\n${bodyContent}\n</article></main>`;

    const finalHtml = template
      .replace("{{TITLE}}", title)
      .replace("{{DESCRIPTION_ESCAPED}}", description.replace(/"/g, '&quot;'))
      .replace("{{DESCRIPTION}}", description)
      .replace("{{KEYWORDS}}", keywords)
      .replace("{{AUTHOR}}", author)
      .replace("{{POST_SLUG}}", file.replace(/\.html$/, ""))
      .replace("{{OG_IMAGE}}", ogImage)
      .replace("{{STRUCTURED_DATA}}", "") // optional if you want JSON-LD here later
      .replace("{{CONTENT}}", wrappedContent);

    fs.writeFileSync(path.join(distDir, file), finalHtml, "utf-8");
    console.log(`✅ Built ${file}`);
  }
});