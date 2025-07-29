const fs = require("fs");
const https = require("https");
const xml2js = require("xml2js");

// === CONFIG ===
const rssUrl = "https://read.maxclickempire.com/rss.xml"; // or sitemap.xml
const outputFile = "archive.html";

// === FETCH RSS ===
https.get(rssUrl, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    xml2js.parseString(data, (err, result) => {
      if (err) {
        console.error("Failed to parse RSS:", err);
        return;
      }

      const items = result.rss.channel[0].item || [];
      const links = items.map(item => ({
        title: item.title[0],
        link: item.link[0]
      }));

      generateHTML(links);
    });
  });
}).on("error", (err) => {
  console.error("Error fetching RSS:", err.message);
});

// === GENERATE ARCHIVE.HTML ===
function generateHTML(posts) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>All Posts - MaxClickEmpire</title>
  <meta name="description" content="Explore all blog posts from MaxClickEmpire.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto; }
    h1 { font-size: 2em; color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 12px; }
    a { text-decoration: none; color: #0077cc; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📚 All Blog Posts</h1>
  <ul>
    ${posts.map(post => `<li><a href="${post.link}">${post.title}</a></li>`).join("\n    ")}
  </ul>
</body>
</html>
  `.trim();

  fs.writeFileSync(outputFile, html);
  console.log(`✅ archive.html generated with ${posts.length} posts.`);
                       }
