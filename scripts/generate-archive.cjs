const fs = require("fs");
const https = require("https");
const xml2js = require("xml2js");
const path = require("path");

// === CONFIG ===
const sitemapUrl = "https://read.maxclickempire.com/sitemap.xml";
const outputFile = path.join(__dirname, "archive.html"); // Root-level

// === FETCH SITEMAP ===
https.get(sitemapUrl, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    // Parse XML ignoring namespaces
    xml2js.parseString(
      data,
      { explicitArray: true, ignoreAttrs: false, ignoreNamespaces: true },
      (err, result) => {
        if (err) {
          return console.error("Failed to parse sitemap:", err.message);
        }

        // Now urlset and url are accessible normally without namespaces
        const urlset = result?.urlset?.url || [];
        if (!urlset.length) console.warn("No entries found in sitemap.");

        const posts = urlset.map((entry) => ({
          title: extractSlug(entry.loc?.[0] || ""),
          link: entry.loc?.[0] || "#",
        }));

        generateHTML(posts);
      }
    );
  });
}).on("error", (err) => {
  console.error("Error fetching sitemap:", err.message);
});

// === GENERATE archive.html ===
function generateHTML(posts) {
  const html = `
<!-- Generated: ${new Date().toISOString()} -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Posts - MaxClickEmpire</title>
  <meta name="description" content="Explore all blog posts.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
      .map((p) => `<li><a href="${p.link}">${p.title}</a></li>`)
      .join("\n    ")}
  </ul>
</body>
</html>`.trim();

  fs.writeFileSync(outputFile, html);
  console.log(`✅ archive.html generated with ${posts.length} posts.`);
}

// === Helper ===
function extractSlug(url) {
  try {
    const slug = new URL(url)
      .pathname
      .split("/")
      .filter(Boolean)
      .pop();
    return decodeURIComponent(slug)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Untitled";
  }
}