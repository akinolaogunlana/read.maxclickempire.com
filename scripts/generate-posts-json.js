// scripts/generate-posts-json.js

const fs = require("fs");
const path = require("path");
const https = require("https");
const { parseStringPromise } = require("xml2js");

const RSS_URL = "https://maxclickempire.com/rss.xml";

function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", (err) => reject(err));
  });
}

(async () => {
  try {
    const xml = await fetchFeed(RSS_URL);
    const parsed = await parseStringPromise(xml);

    if (!parsed.rss || !parsed.rss.channel[0].item) {
      throw new Error("No posts found in RSS feed");
    }

    const posts = parsed.rss.channel[0].item.map((entry, index) => ({
      id: index + 1,
      title: entry.title[0],
      url: entry.link[0],
      summary: entry.description ? entry.description[0] : "",
      publishedAt: entry.pubDate ? entry.pubDate[0] : "",
    }));

    // Ensure /api directory exists
    const apiDir = path.join(__dirname, "..", "api");
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    // Save as /api/posts.json
    fs.writeFileSync(
      path.join(apiDir, "posts.json"),
      JSON.stringify(posts, null, 2)
    );

    console.log("✅ posts.json generated from RSS feed!");
  } catch (err) {
    console.error("❌ Failed to generate posts.json:", err);
    process.exit(1);
  }
})();