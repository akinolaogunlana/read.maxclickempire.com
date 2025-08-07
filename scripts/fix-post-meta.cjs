const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const postsDir = path.join(__dirname, "..", "posts");
const outputPath = path.join(__dirname, "../data/post-meta.js");

const postMetadata = {};

fs.readdirSync(postsDir).forEach((file) => {
  if (!file.endsWith(".html")) return;

  const filePath = path.join(postsDir, file);
  const slug = file.replace(".html", "");
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);

  const title = $("head title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim()
    || "https://read.maxclickempire.com/assets/og-image.jpg";

  if (!title || !description) return;

  const stats = fs.statSync(filePath);

  const publishedDate = stats.birthtime && stats.birthtime.toISOString() !== '1970-01-01T00:00:00.000Z'
    ? stats.birthtime.toISOString()
    : stats.mtime.toISOString(); // fallback to last modified time

  postMetadata[slug] = {
    title,
    description,
    keywords,
    image: ogImage,
    published: publishedDate,
  };
});

const output = `// Auto-generated. Do not edit.
const postMetadata = ${JSON.stringify(postMetadata, null, 2)};

if (typeof module !== 'undefined') {
  module.exports = postMetadata;
}`;

fs.writeFileSync(outputPath, output);
console.log("✅ post-meta.js generated with accurate post dates.");