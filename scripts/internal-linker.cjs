const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");
const WordNet = natural.WordNet;
const wn = new WordNet();

// ===== CONFIG =====
const postsDir = path.join(__dirname, "..", "posts");
const LINK_LIMIT = 3;
const SIMILARITY_THRESHOLD = 0.75;

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
const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = str =>
  str.replace(/["&<>]/g, char =>
    ({ '"': "&quot;", "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char)
  );

const scoreSimilarity = (a, b) =>
  natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());

// WordNet synonyms lookup
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

// Generate keyword variants with synonyms
const generateKeywordVariants = async keyword => {
  const base = keyword.toLowerCase();
  const variants = new Set([
    base,
    base.replace(/-/g, " "),
    base.replace(/\s+/g, "-"),
    base.replace(/\s+/g, ""),
    base.charAt(0).toUpperCase() + base.slice(1),
    base.endsWith("s") ? base.slice(0, -1) : base + "s"
  ]);
  const synonyms = await lookupSynonyms(base);
  synonyms.forEach(s => variants.add(s));
  return Array.from(variants);
};

// Context weight function (prioritize headings, early paragraphs)
const contextWeight = (element, index, total) => {
  const tag = element.tagName.toLowerCase();
  if (/h[1-3]/.test(tag)) return 2.0;
  if (tag === "p") {
    if (index < Math.floor(total * 0.15)) return 1.5; // early paragraph
    if (index > Math.floor(total * 0.85)) return 1.2; // last paragraph
    return 1.0;
  }
  if (tag === "li") return 1.2;
  if (/b|strong/.test(tag)) return 1.1;
  if (/i|em/.test(tag)) return 1.0;
  return 1.0;
};

// ===== TRACKING =====
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));
const inboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));
const outboundLinkCount = Object.fromEntries(Object.keys(metadata).map(slug => [slug, 0]));

// ===== PHASE 1: SMART LINKS =====
(async () => {
  for (const filename of posts) {
    const filePath = path.join(postsDir, filename);
    const htmlRaw = fs.readFileSync(filePath, "utf8").trim();
    if (!htmlRaw) continue;

    let $;
    try {
      $ = cheerio.load(htmlRaw, { decodeEntities: false });
    } catch (err) {
      console.warn(`⚠️ Skipping malformed HTML in: ${filename}`);
      continue;
    }

    const slug = filename.replace(".html", "").toLowerCase();
    const currentMeta = metadata[slug] || {};
    const currentTitle = currentMeta.title || slug;

    const bodyText = $("body").text().trim();
    if (!bodyText) continue;

    const nlpKeywords = keywordExtractor.extract(bodyText, {
      language: "english",
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true
    });

    const metaMatch = htmlRaw.match(/<meta name="keywords" content="([^"]+)"/);
    const keywordsFromMeta = metaMatch ? metaMatch[1].split(",").map(k => k.trim()) : [];

    const nlpSet = new Set(nlpKeywords);
    const metaSet = new Set(keywordsFromMeta);
    const usedLinks = new Set();
    let inserted = 0;

    // Prepare potential links
    const potentialLinks = [];
    for (const [slug2, data] of Object.entries(metadata)) {
      if (slug2 === slug || !data?.title) continue;

      const baseKeyword = (data.keyword || data.title.split(" ")[0]).toLowerCase();
      const variants = await generateKeywordVariants(baseKeyword);

      const score = Math.max(
        scoreSimilarity(currentTitle, data.title),
        ...[...nlpSet].map(k => scoreSimilarity(k, baseKeyword)),
        ...[...metaSet].map(k => scoreSimilarity(k, baseKeyword))
      );

      if (score >= SIMILARITY_THRESHOLD) {
        potentialLinks.push({
          keyword: baseKeyword,
          variants,
          href: `/posts/${slug2}.html`,
          title: data.title,
          score,
          slug: slug2
        });
      }
    }

    // Sort by score descending
    potentialLinks.sort((a, b) => b.score - a.score);

    const bodyElements = $("h1,h2,h3,p,li,b,strong,i,em").toArray();

    bodyElements.forEach((el, index) => {
      if (inserted >= LINK_LIMIT) return;

      const weight = Math.min(contextWeight(el, index, bodyElements.length) / 2, 1.0);
      if (Math.random() > weight) return;

      $(el).contents().each((_, node) => {
        if (inserted >= LINK_LIMIT || node.type !== "text") return;
        let text = node.data;
        let replaced = false;

        for (const link of potentialLinks) {
          if (usedLinks.has(link.href)) continue;

          const sortedVariants = link.variants.sort((a, b) => b.length - a.length);
          for (const variant of sortedVariants) {
            const regex = new RegExp(`(^|\\W)(${escapeRegExp(variant)})(\\W|$)`, "i");
            const match = text.match(regex);
            if (!match) continue;

            const anchorText = match[2];
            const before = text.slice(0, match.index + match[1].length);
            const after = text.slice(match.index + match[0].length - match[3].length);
            const anchor = `<a href="${link.href}" title="${escapeHtml(link.title)}">${anchorText}</a>`;

            $(node).replaceWith(before + anchor + after);
            usedLinks.add(link.href);
            inboundLinkCount[link.slug]++;
            outboundLinkCount[slug]++;
            inserted++;
            replaced = true;
            break;
          }
          if (replaced || inserted >= LINK_LIMIT) break;
        }
      });
    });

    fs.writeFileSync(filePath, $.html(), "utf8");
    console.log(`🔗 [${filename}] — inserted ${inserted} smart link${inserted !== 1 ? "s" : ""}`);
  }

  // ===== PHASE 2: FIX ORPHANS =====
  const orphanSlugs = Object.entries(inboundLinkCount)
    .filter(([_, count]) => count === 0)
    .map(([slug]) => slug);

  if (orphanSlugs.length) {
    console.log(`\n🧭 Detected ${orphanSlugs.length} orphan post(s):`);
    orphanSlugs.forEach(slug => console.log(`- ${slug}`));
  }

  const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);

  for (const [i, orphanSlug] of orphanSlugs.entries()) {
    const orphanMeta = metadata[orphanSlug];
    if (!orphanMeta?.title) continue;

    const keyword = (orphanMeta.keyword || orphanMeta.title.split(" ")[0]).toLowerCase();
    const variants = await generateKeywordVariants(keyword);

    const targetFile = shuffledPosts[i % shuffledPosts.length];
    const filePath = path.join(postsDir, targetFile);
    const htmlRaw = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(htmlRaw, { decodeEntities: false });

    let inserted = false;
    $("p").each((_, el) => {
      if (inserted || $(el).find("a").length > 0) return;

      $(el).contents().each((_, node) => {
        if (node.type !== "text") return;
        let text = node.data;

        for (const variant of variants) {
          const regex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
          const match = text.match(regex);
          if (!match) continue;

          const anchorText = match[1];
          const before = text.substring(0, match.index);
          const after = text.substring(match.index + anchorText.length);
          const safeTitle = escapeHtml(orphanMeta.title);
          const anchor = `<a href="/posts/${orphanSlug}.html" title="${safeTitle}">${anchorText}</a>`;

          $(node).replaceWith(before + anchor + after);
          inboundLinkCount[orphanSlug]++;
          outboundLinkCount[targetFile.replace(".html", "")]++;
          inserted = true;
          console.log(`🪄 Linked orphan [${orphanSlug}] from [${targetFile}]`);
          break;
        }
      });
    });

    if (inserted) fs.writeFileSync(filePath, $.html(), "utf8");
  }

  // ===== FINAL REPORT =====
  console.log("\n📊 Link Report");
  Object.keys(metadata).forEach(slug => {
    console.log(`- ${slug}: ${inboundLinkCount[slug]} inbound | ${outboundLinkCount[slug]} outbound`);
  });
})();