const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const postsDir = path.join(__dirname, "..", "posts");
const outputPath = path.join(__dirname, "../data/post-meta.js");

const postMetadata = {};

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const slug = file.replace(".html", "");
  const html = fs.readFileSync(path.join(postsDir, file), "utf8");
  const $ = cheerio.load(html);

  const title = $("head title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim()
    || "https://read.maxclickempire.com/assets/og-image.jpg";

  if (!title || !description) return;

  postMetadata[slug] = {
    title,
    description,
    keywords,
    image: ogImage,
    published: new Date().toISOString(),
  };
});

const output = `// Auto-generated. Do not edit.
const postMetadata = ${JSON.stringify(postMetadata, null, 2)};

if (typeof module !== 'undefined') {
  module.exports = postMetadata;
}`;

fs.writeFileSync(outputPath, output);
console.log("✅ post-meta.js fixed and written.");