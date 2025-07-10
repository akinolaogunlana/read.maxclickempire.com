const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");

// Config
const postsDir = path.join(__dirname, "..", "posts");
const LINK_LIMIT = 3;
const CONTEXT_WINDOW = 100; // characters before and after keyword for context
const SIMILARITY_THRESHOLD = 0.75;

// Load Metadata
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load metadata:", err.message);
  process.exit(1);
}

// Utils
const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function generateKeywordVariants(keyword) {
  const base = keyword.toLowerCase();
  return Array.from(new Set([
    base,
    base.replace(/-/g, " "),
    base.replace(/\s/g, "-"),
    base.replace(/\s/g, ""),
    base.charAt(0).toUpperCase() + base.slice(1),
    base.endsWith("s") ? base.slice(0, -1) : base + "s",
  ]));
}

function scoreSimilarity(a, b) {
  return natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());
}

// Run
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  const filePath = path.join(postsDir, filename);
  const htmlRaw = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(htmlRaw);
  const slug = filename.replace(".html", "").toLowerCase();
  const currentMeta = metadata[slug] || {};
  const currentTitle = currentMeta.title || slug;

  const bodyText = $("body").text();
  const nlpKeywords = keywordExtractor.extract(bodyText, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  const metaMatch = htmlRaw.match(/<meta name="keywords" content="([^"]+)"/);
  const keywordsFromMeta = metaMatch ? metaMatch[1].split(",").map(k => k.trim()) : [];

  const usedLinks = new Set();
  let inserted = 0;

  // Rank potential internal links
  const potentialLinks = Object.entries(metadata)
    .filter(([slug2, data]) => slug2 !== slug && data?.title)
    .map(([slug2, data]) => {
      const baseKeyword = (data.keyword || data.title.split(" ")[0]).toLowerCase();
      const variants = generateKeywordVariants(baseKeyword);
      const score = Math.max(
        scoreSimilarity(currentTitle, data.title),
        ...nlpKeywords.map(k => scoreSimilarity(k, baseKeyword)),
        ...keywordsFromMeta.map(k => scoreSimilarity(k, baseKeyword))
      );
      return {
        keyword: baseKeyword,
        variants,
        href: `/posts/${slug2}.html`,
        title: data.title,
        score,
      };
    })
    .filter(link => link.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  // Insert links
  $("p").each((_, el) => {
    if (inserted >= LINK_LIMIT) return;

    let content = $(el).html();
    if (!content || /<a\s/i.test(content)) return;

    for (const link of potentialLinks) {
      if (usedLinks.has(link.href)) continue;

      for (const variant of link.variants) {
        const regex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
        const match = content.match(regex);
        if (match) {
          const anchorText = match[1];
          content = content.replace(
            regex,
            `<a href="${link.href}" title="${link.title}">${anchorText}</a>`
          );
          usedLinks.add(link.href);
          inserted++;
          break;
        }
      }

      if (inserted >= LINK_LIMIT) break;
    }

    $(el).html(content);
  });

  // Output
  fs.writeFileSync(filePath, $.html(), "utf8");
  console.log(`🔗 [${filename}] — inserted ${inserted} smart links`);
});