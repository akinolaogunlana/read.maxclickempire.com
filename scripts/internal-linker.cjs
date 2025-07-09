// scripts/internal-linker.cjs

const fs = require("fs");
const path = require("path");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");

// Setup paths
const postsDir = path.join(__dirname, "..", "posts");

// Load metadata
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load post metadata:", err.message);
  process.exit(1);
}

// Settings
const LINK_LIMIT = 3;

// Helpers
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateKeywordVariants(keyword) {
  const base = keyword.toLowerCase();
  return Array.from(new Set([
    base,
    base.replace(/-/g, " "),
    base.replace(/\s/g, "-"),
    base.replace(/\s/g, ""),
    base.charAt(0).toUpperCase() + base.slice(1),
  ]));
}

function scoreSimilarity(a, b) {
  const distance = natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());
  return distance; // 0–1
}

// Start processing
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  const filePath = path.join(postsDir, filename);
  let html = fs.readFileSync(filePath, "utf8");

  const currentSlug = filename.replace(".html", "").toLowerCase();
  const currentMeta = metadata[currentSlug] || {};
  const currentTitle = currentMeta.title || currentSlug;

  const keywordsFromPage = (
    html.match(/<meta name="keywords" content="([^"]+)"/) || []
  )[1]?.split(",").map(k => k.trim()) || [];

  // Extract NLP keywords from the entire page text
  const bodyText = html.replace(/<[^>]*>/g, " ");
  const nlpKeywords = keywordExtractor.extract(bodyText, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  const usedLinks = new Set();
  let inserted = 0;

  // Build potential links ranked by similarity score
  const potentialLinks = Object.entries(metadata)
    .filter(([slug]) => slug !== currentSlug)
    .map(([slug, data]) => {
      const baseKeyword = (data.keyword || data.title.split(" ")[0]).toLowerCase();
      const variants = generateKeywordVariants(baseKeyword);
      const score = Math.max(
        scoreSimilarity(currentTitle, data.title),
        ...keywordsFromPage.map(k => scoreSimilarity(k, baseKeyword)),
        ...nlpKeywords.map(k => scoreSimilarity(k, baseKeyword))
      );

      return {
        keyword: baseKeyword,
        variants,
        href: `/posts/${slug}.html`, // ✅ Fixed string template
        title: data.title,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Insert links into paragraphs
  html = html.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
    if (inserted >= LINK_LIMIT || /<a\s/i.test(content)) return match;

    for (const link of potentialLinks) {
      if (usedLinks.has(link.href)) continue;

      for (const variant of link.variants) {
        const keywordRegex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
        if (keywordRegex.test(content)) {
          const anchorText = content.match(keywordRegex)[1];
          content = content.replace(
            keywordRegex,
            `<a href="${link.href}" title="${link.title}">${anchorText}</a>`
          );
          usedLinks.add(link.href);
          inserted++;
          break;
        }
      }

      if (inserted >= LINK_LIMIT) break;
    }

    return `<p>${content}</p>`;
  });

  // Save the updated HTML
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`🔗 ${filename} — inserted ${inserted} internal links`);
});