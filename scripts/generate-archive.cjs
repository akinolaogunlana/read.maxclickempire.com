const fs = require("fs");
const path = require("path");

// Correct paths relative to the scripts folder
const metaPath = path.join(__dirname, "..", "data", "post-meta.js");
const outputFile = path.join(__dirname, "..", "archive.html");

// Load metadata
function loadMetadata() {
  try {
    const resolved = require.resolve(metaPath);
    delete require.cache[resolved]; // clear cache to reload fresh
    const mod = require(resolved);
    return mod && mod.postMetadata ? mod.postMetadata : {};
  } catch (err) {
    console.error("Failed to load post-meta.js:", err.message);
    return {};
  }
}

// Generate HTML archive
function generateHTML(posts) {
  const html = `
<!-- Generated: ${new Date().toISOString()} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>All Posts - MaxClickEmpire</title>
  <meta name="description" content="Explore all blog posts." />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto; }
    h1 { font-size: 2em; color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 12px; }
    a { color: #0077cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📚 All Blog Posts</h1>
  <ul>
    ${posts
      .map(
        (p) =>
          `<li><a href="${p.canonical || "#"}">${p.title || "Untitled"}</a></li>`
      )
      .join("\n    ")}
  </ul>
</body>
</html>`.trim();

  fs.writeFileSync(outputFile, html, "utf8");
  console.log(`✅ archive.html generated with ${posts.length} posts.`);
}

function main() {
  const metadata = loadMetadata();
  // Convert postMetadata object to an array
  const posts = Object.values(metadata).sort((a, b) => {
    // Sort descending by datePublished
    return new Date(b.datePublished) - new Date(a.datePublished);
  });
  generateHTML(posts);
}

main();