const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "../posts");
const siteUrl = "https://read.maxclickempire.com";

const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

// Collect metadata
const allPostMeta = posts.map(filename => {
  const html = fs.readFileSync(path.join(postsDir, filename), "utf8");
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : filename.replace(".html", "");
  const slug = filename.replace(".html", "");
  return { filename, title, slug, url: `${siteUrl}/posts/${filename}` };
});

posts.forEach(file => {
  const fullPath = path.join(postsDir, file);
  let html = fs.readFileSync(fullPath, "utf8");

  // Avoid double-linking
  if ((html.match(/rel="internal"/g) || []).length >= 3) return;

  const thisSlug = file.replace(".html", "");
  const candidates = allPostMeta.filter(p => p.slug !== thisSlug);
  const selected = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);

  let insertionCount = 0;

  selected.forEach(link => {
    const anchorTag = `<a href="/posts/${link.slug}.html" title="${link.title}" rel="internal">${link.title}</a>`;
    const paragraphRegex = /<p>([^<]{50,})<\/p>/gi;

    html = html.replace(paragraphRegex, (match, content) => {
      if (insertionCount >= 3) return match;
      if (content.includes(link.title)) return match;
      insertionCount++;
      return `<p>${content} ${anchorTag}</p>`;
    });
  });

  fs.writeFileSync(fullPath, html, "utf8");
  console.log(`🔗 Internal links added to: ${file}`);
});