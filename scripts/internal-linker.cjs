// scripts/internal-linker.cjs
const fs = require("fs");
const path = require("path");
const keyword_extractor = require("keyword-extractor");
const natural = require("natural");
const { JSDOM } = require("jsdom");

// Config
const postsDir = path.join(__dirname, "..", "posts");
const LINK_LIMIT = 3;

// Load metadata
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load post metadata:", err.message);
  process.exit(1);
}

// Utils
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateKeywordVariants(keyword) {
  const lower = keyword.toLowerCase();
  return [
    lower,
    lower.replace(/-/g, " "),
    lower.replace(/\s/g, "-"),
    lower.replace(/\s/g, "")
  ];
}

function getKeywordsFromContent(content) {
  return keyword_extractor.extract(content, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true
  });
}

// Cosine similarity (basic NLP vector-based match)
function computeSimilarity(str1, str2) {
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(str1);
  tfidf.addDocument(str2);
  return tfidf.tfidf(str2, 0); // similarity score
}

// Main logic
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  const filePath = path.join(postsDir, filename);
  let html = fs.readFileSync(filePath, "utf8");

  const currentSlug = filename.replace(".html", "").toLowerCase();
  const currentMeta = metadata[currentSlug] || {};
  const currentTitle = currentMeta.title || currentSlug;

  const dom = new JSDOM(html);
  const paragraphs = dom.window.document.querySelectorAll("p");

  const keywordsInPage = getKeywordsFromContent(dom.window.document.body.textContent || "");

  const usedLinks = new Set();
  let inserted = 0;

  const candidates = Object.entries(metadata)
    .filter(([slug]) => slug !== currentSlug)
    .map(([slug, data]) => {
      const keyword = (data.keyword || data.title.split(" ")[0]).toLowerCase();
      const variants = generateKeywordVariants(keyword);
      const score = Math.max(
        computeSimilarity(currentTitle, data.title),
        ...keywordsInPage.map(k => computeSimilarity(k, keyword))
      );

      return {
        href: `/posts/${slug}.html`,
        keyword,
        title: data.title,
        variants,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // limit to top candidates for performance

  paragraphs.forEach(p => {
    if (inserted >= LINK_LIMIT) return;
    if (p.innerHTML.match(/<a\s/i)) return;

    let text = p.innerHTML;
    for (const link of candidates) {
      if (usedLinks.has(link.href)) continue;

      for (const variant of link.variants) {
        const regex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
        if (regex.test(text)) {
          text = text.replace(regex, `<a href="${link.href}" title="${link.title}">$1</a>`);
          usedLinks.add(link.href);
          inserted++;
          break;
        }
      }

      if (inserted >= LINK_LIMIT) break;
    }
    p.innerHTML = text;
  });

  // Write back updated HTML
  fs.writeFileSync(filePath, dom.serialize(), "utf8");
  console.log(`🔗 ${filename} — inserted ${inserted} intelligent internal links`);
});