const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");
const WordNet = natural.WordNet;
const wn = new WordNet();

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

// WordNet synonyms
const lookupSynonyms = word =>
  new Promise(resolve => {
    try {
      wn.lookup(word, results => {
        if (!results) return resolve([]);
        const synonyms = results.flatMap(r => r.synonyms || []).map(s => s.toLowerCase());
        resolve(synonyms);
      });
    } catch {
      resolve([]);
    }
  });

// Generate keyword variants safely with WordNet synonyms
const generateKeywordVariants = async phrase => {
  const base = phrase.toLowerCase();
  const variants = new Set([
    base,
    base.replace(/-/g, " "),
    base.replace(/\s+/g, "-"),
    base.replace(/\s+/g, ""),
    base.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    base.endsWith("s") ? base.slice(0, -1) : base + "s"
  ]);

  const synonyms = await lookupSynonyms(base);
  synonyms.forEach(s => variants.add(s));

  return Array.from(variants);
};

// Context weight for link placement
function contextWeight(element, index, total) {
  const tag = element.tagName.toLowerCase();
  if (/h[1-3]/.test(tag)) return 2.0;
  if (tag === "p") return 1.5;
  if (tag === "li") return 1.2;
  if (/b|strong/.test(tag)) return 1.1;
  if (/i|em/.test(tag)) return 1.0;
  if (index < Math.floor(total * 0.15)) return 1.5;
  if (index > Math.floor(total * 0.85)) return 1.5;
  return 1.0;
}

// ===== TRACKING =====
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));
const inboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));
const outboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));

// ===== SMART LINKING =====
(async () => {
  console.log("⚡ Running context-aware smart linking...");

  for (const filename of posts) {
    const filePath = path.join(postsDir, filename);
    const htmlRaw = fs.readFileSync(filePath, "utf8").trim();
    if (!htmlRaw) continue;

    const $ = cheerio.load(htmlRaw, { decodeEntities: false });
    const slug = filename.replace(".html", "").toLowerCase();
    const currentMeta = metadata[slug] || {};
    const currentTitle = currentMeta.title || slug;

    const bodyElements = $("body").find("h1,h2,h3,p,li,b,strong,i,em").toArray();
    if (!bodyElements.length) continue;

    const bodyText = $("body").text().trim();
    const nlpKeywords = keywordExtractor.extract(bodyText, {
      language: "english",
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true
    });

    const metaKeywords = (htmlRaw.match(/<meta name="keywords" content="([^"]+)"/)?.[1] || "")
      .split(",")
      .map(k => k.trim());

    const linkUsageCount = {};
    let inserted = 0;

    // Prepare potential links
    const potentialLinks = [];
    for (const [slug2, data] of Object.entries(metadata)) {
      if (slug2 === slug || !data?.title) continue;
      try {
        const baseKeyword = (data.keyword || data.title).toLowerCase();
        const variants = await generateKeywordVariants(baseKeyword);

        const score = Math.max(
          scoreSimilarity(currentTitle, data.title),
          ...nlpKeywords.map(k => scoreSimilarity(k, baseKeyword)),
          ...metaKeywords.map(k => scoreSimilarity(k, baseKeyword))
        );

        if (score >= SIMILARITY_THRESHOLD) {
          potentialLinks.push({ slug: slug2, href: `/posts/${slug2}.html`, title: data.title, variants, score });
        }
      } catch { continue; }
    }

    // Sort links by score descending
    potentialLinks.sort((a, b) => b.score - a.score);

    // Insert links into body
    bodyElements.forEach((el, index) => {
      if (inserted >= MAX_LINKS_PER_POST) return;
      const weight = Math.min(contextWeight(el, index, bodyElements.length) / 2, 1.0);
      if (Math.random() > weight) return;

      $(el).contents().each((_, node) => {
        if (inserted >= MAX_LINKS_PER_POST || node.type !== "text") return;
        let text = node.data;

        for (const link of potentialLinks) {
          const usedTimes = linkUsageCount[link.href] || 0;
          if (usedTimes >= MAX_LINKS_PER_URL) continue;

          for (const variant of link.variants.sort((a, b) => b.length - a.length)) {
            const regex = new RegExp(`(^|\\W)(${escapeRegExp(variant)})(\\W|$)`, "i");
            const match = text.match(regex);
            if (!match) continue;

            const anchorText = match[2];
            const before = text.slice(0, match.index + match[1].length);
            const after = text.slice(match.index + match[0].length - match[3].length);
            const anchor = `<a href="${link.href}" title="${escapeHtml(link.title)}">${anchorText}</a>`;
            $(node).replaceWith(before + anchor + after);

            linkUsageCount[link.href] = usedTimes + 1;
            inboundLinkCount[link.slug]++;
            outboundLinkCount[slug]++;
            inserted++;
            break;
          }
          if (inserted >= MAX_LINKS_PER_POST) break;
        }
      });
    });

    fs.writeFileSync(filePath, $.html(), "utf8");
    console.log(`🔗 [${filename}] — inserted ${inserted} links`);
  }

  // ===== FINAL REPORT =====
  console.log("\n📊 Link Report");
  Object.keys(metadata).forEach(slug => {
    console.log(`- ${slug}: ${inboundLinkCount[slug]} inbound | ${outboundLinkCount[slug]} outbound`);
  });
})();