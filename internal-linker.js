const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");
const meta = require("./data/post-meta.js").postMetadata; // Adjust if format is different

const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

postFiles.forEach(file => {
  const fullPath = path.join(postsDir, file);
  let html = fs.readFileSync(fullPath, "utf8");

  const slug = file.replace(".html", "").toLowerCase();
  const postTitle = meta[slug]?.title || slug;

  // Collect 3 related posts (not the same post)
  const related = Object.entries(meta)
    .filter(([s]) => s !== slug)
    .slice(0, 5) // Pull more in case of filtering
    .sort(() => 0.5 - Math.random()) // Randomize
    .slice(0, 3); // Take 3

  const links = related.map(([s, data]) => {
    return `<a href="/posts/${s}.html">${data.title}</a>`;
  });

  // Inject links into <p> tags
  let count = 0;
  html = html.replace(/<p>(.*?)<\/p>/g, (match, content) => {
    if (count >= 3) return match;
    if (content.length < 60) return match;

    const link = links[count];
    count++;
    return `<p>${content} ${link}</p>`;
  });

  fs.writeFileSync(fullPath, html, "utf8");
  console.log(`✅ Linked: ${file}`);
});