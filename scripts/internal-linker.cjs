const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");

// ===== CONFIG =====
const postsDir = path.join(__dirname, "..", "posts");
const MAX_LINKS_PER_POST = 6;
const MAX_LINKS_PER_URL = 2;
const SIMILARITY_THRESHOLD = 0.7;

// ===== LOAD METADATA =====
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load metadata:", err.message);
  process.exit(1);
}

// ===== HELPERS =====
const escapeHtml = str =>
  str.replace(/["&<>]/g, char => ({
    '"': "&quot;",
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;"
  }[char] || char));

const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const scoreSimilarity = (a, b) =>
  natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());

const generateKeywordVariants = keyword => {
  const base = keyword.toLowerCase();
  return Array.from(new Set([
    base,
    base.replace(/-/g, " "),
    base.replace(/\s+/g, "-"),
    base.replace(/\s+/g, ""),
    base.charAt(0).toUpperCase() + base.slice(1),
    base.endsWith("s") ? base.slice(0, -1) : base + "s"
  ]));
};

// ===== TRACKING =====
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));
const inboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));
const outboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));

// ===== CONTEXT-AWARE LINKING =====
posts.forEach(filename => {
  const filePath = path.join(postsDir, filename);
  const htmlRaw = fs.readFileSync(filePath, "utf8").trim();
  if (!htmlRaw) return;

  const $ = cheerio.load(htmlRaw, { decodeEntities: false });
  const slug = filename.replace(".html", "").toLowerCase();
  const currentMeta = metadata[slug] || {};
  const currentTitle = currentMeta.title || slug;

  const bodyText = $("body").text().trim();
  if (!bodyText) return;

  const nlpKeywords = keywordExtractor.extract(bodyText, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true
  });

  const metaMatch = htmlRaw.match(/<meta name="keywords" content="([^"]+)"/);
  const metaKeywords = metaMatch ? metaMatch[1].split(",").map(k => k.trim()) : [];

  const usedLinks = {};
  let inserted = 0;

  const potentialLinks = Object.entries(metadata)
    .filter(([slug2]) => slug2 !== slug)
    .map(([slug2, data]) => {
      const baseKeyword = (data.keyword || data.title).toLowerCase();
      const variants = generateKeywordVariants(baseKeyword);
      const score = Math.max(
        scoreSimilarity(currentTitle, data.title),
        ...nlpKeywords.map(k => scoreSimilarity(k, baseKeyword)),
        ...metaKeywords.map(k => scoreSimilarity(k, baseKeyword))
      );
      return { slug: slug2, href: `/posts/${slug2}.html`, title: data.title, variants, score };
    })
    .filter(l => l.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  $("p").each((_, el) => {
    if (inserted >= MAX_LINKS_PER_POST) return;

    $(el).contents().each((_, node) => {
      if (inserted >= MAX_LINKS_PER_POST || node.type !== "text") return;

      let text = node.data;
      for (const link of potentialLinks) {
        if ((usedLinks[link.href] || 0) >= MAX_LINKS_PER_URL) continue;

        for (const variant of link.variants) {
          const regex = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "i");
          const match = text.match(regex);
          if (!match) continue;

          const anchorText = match[0];
          const before = text.slice(0, match.index);
          const after = text.slice(match.index + anchorText.length);
          const anchor = `<a href="${link.href}" title="${escapeHtml(link.title)}">${anchorText}</a>`;

          $(node).replaceWith(before + anchor + after);
          usedLinks[link.href] = (usedLinks[link.href] || 0) + 1;
          inboundLinkCount[link.slug]++;
          outboundLinkCount[slug]++;
          inserted++;
          console.log(`🔗 Linked [${link.slug}] in [${filename}] using "${anchorText}"`);
          break;
        }
        if (inserted >= MAX_LINKS_PER_POST) break;
      }
    });
  });

  fs.writeFileSync(filePath, $.html(), "utf8");
  console.log(`✅ [${filename}] — inserted ${inserted} internal link${inserted !== 1 ? "s" : ""}`);
});

// ===== FINAL REPORT =====
console.log("\n📊 Internal Linking Report:");
Object.keys(metadata).forEach(slug => {
  console.log(`- ${slug}: ${inboundLinkCount[slug]} inbound | ${outboundLinkCount[slug]} outbound`);
});