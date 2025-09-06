const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");
const WordNet = natural.WordNet;
const wn = new WordNet();

const postsDir = path.join(__dirname, "..", "posts");
const LINK_LIMIT = 3;
const SIMILARITY_THRESHOLD = 0.75;

// ========= SYNONYM CACHE ==========
const cacheFile = path.join(__dirname, "synonyms-cache.json");
let synonymCache = {};
if (fs.existsSync(cacheFile)) {
  try {
    synonymCache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch {
    synonymCache = {};
  }
}

async function getSynonyms(word) {
  if (synonymCache[word]) return synonymCache[word];

  return new Promise((resolve) => {
    wn.lookup(word, (results) => {
      const synonyms = [];
      results.forEach((r) => {
        synonyms.push(...r.synonyms);
      });
      const unique = [...new Set(synonyms.map((s) => s.toLowerCase()))];
      synonymCache[word] = unique;
      fs.writeFileSync(cacheFile, JSON.stringify(synonymCache, null, 2));
      resolve(unique);
    });
  });
}

// ========= METADATA ==========
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load metadata:", err.message);
  process.exit(1); // ✅ replaced illegal `continue`
}

// ========= HELPERS ==========
const escapeRegExp = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (str) =>
  str.replace(/["&<>]/g, (char) => {
    switch (char) {
      case '"': return "&quot;";
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      default: return char;
    }
  });

const generateKeywordVariants = (keyword) => {
  const base = keyword.toLowerCase();
  return Array.from(
    new Set([
      base,
      base.replace(/-/g, " "),
      base.replace(/\s/g, "-"),
      base.replace(/\s/g, ""),
      base.charAt(0).toUpperCase() + base.slice(1),
      base.endsWith("s") ? base.slice(0, -1) : base + "s",
    ])
  );
};

const scoreSimilarity = (a, b) =>
  natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());

const generateNgrams = (words, maxN = 3) => {
  const ngrams = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(" "));
    }
  }
  return ngrams;
};

// ========= TRACKING ==========
const posts = fs.readdirSync(postsDir).filter((f) => f.endsWith(".html"));
const inboundLinkCount = Object.fromEntries(
  Object.keys(metadata).map((slug) => [slug, 0])
);
const outboundLinkCount = Object.fromEntries(
  Object.keys(metadata).map((slug) => [slug, 0])
);

// ========= MAIN LOGIC ==========
(async () => {
  for (const filename of posts) {
    const filePath = path.join(postsDir, filename);
    const htmlRaw = fs.readFileSync(filePath, "utf8").trim();
    if (!htmlRaw) continue;

    let $;
    try {
      $ = cheerio.load(htmlRaw, { decodeEntities: false });
    } catch {
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
      remove_duplicates: true,
    });

    const metaMatch = htmlRaw.match(
      /<meta name="keywords" content="([^"]+)"/
    );
    const keywordsFromMeta = metaMatch
      ? metaMatch[1].split(",").map((k) => k.trim())
      : [];

    const nlpSet = new Set(nlpKeywords);
    const metaSet = new Set(keywordsFromMeta);
    const usedLinks = new Set();
    let inserted = 0;

    const potentialLinks = await Promise.all(
      Object.entries(metadata)
        .filter(([slug2, data]) => slug2 !== slug && data?.title)
        .map(async ([slug2, data]) => {
          let baseKeyword;
          if (data.keyword) {
            baseKeyword = data.keyword.toLowerCase();
          } else {
            const words = data.title.toLowerCase().split(/\s+/);
            const ngrams = generateNgrams(words, 3);

            let bestPhrase = words[0];
            let bestScore = -1;

            for (const phrase of ngrams) {
              const scores = [
                ...[...nlpSet].map((k) => scoreSimilarity(k, phrase)),
                ...[...metaSet].map((k) => scoreSimilarity(k, phrase)),
              ];
              const score = scores.length ? Math.max(...scores) : 0;
              if (score > bestScore) {
                bestScore = score;
                bestPhrase = phrase;
              }
            }
            baseKeyword = bestPhrase;
          }

          const synonyms = await getSynonyms(baseKeyword);
          const variants = generateKeywordVariants(baseKeyword).concat(synonyms);

          const score = Math.max(
            scoreSimilarity(currentTitle, data.title),
            ...[...nlpSet].map((k) => scoreSimilarity(k, baseKeyword)),
            ...[...metaSet].map((k) => scoreSimilarity(k, baseKeyword))
          );

          return {
            keyword: baseKeyword,
            variants,
            href: `/posts/${slug2}.html`,
            title: data.title,
            score,
            slug: slug2,
          };
        })
    );

    const filteredLinks = potentialLinks
      .filter((link) => link.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    const paragraphs = $("p").toArray();
    const shuffledParas = paragraphs.sort(() => Math.random() - 0.5);

    shuffledParas.forEach((el) => {
      if (inserted >= LINK_LIMIT) return;
      if ($(el).find("a").length > 0) return;

      $(el)
        .contents()
        .each((i, node) => {
          if (inserted >= LINK_LIMIT || node.type !== "text") return;

          let text = node.data;
          let replaced = false;

          for (const link of filteredLinks) {
            if (usedLinks.has(link.href)) continue;

            for (const variant of link.variants) {
              const regex = new RegExp(
                `\\b(${escapeRegExp(variant)})\\b`,
                "i"
              );
              const match = text.match(regex);

              if (match) {
                const anchorText = match[1];
                const before = text.substring(0, match.index);
                const after = text.substring(
                  match.index + anchorText.length
                );
                const safeTitle = escapeHtml(link.title);
                const anchor = `<a href="${link.href}" title="${safeTitle}">${anchorText}</a>`;

                $(node).replaceWith(before + anchor + after);
                usedLinks.add(link.href);
                inboundLinkCount[link.slug]++;
                outboundLinkCount[slug]++;
                inserted++;
                replaced = true;
                break;
              }
            }
            if (replaced || inserted >= LINK_LIMIT) break;
          }
        });
    });

    fs.writeFileSync(filePath, $.html(), "utf8");
    console.log(
      `🔗 [${filename}] — inserted ${inserted} smart link${
        inserted !== 1 ? "s" : ""
      }`
    );
  }

  // ========= PHASE 2: FIX ORPHANS ==========
  const orphanSlugs = Object.entries(inboundLinkCount)
    .filter(([_, count]) => count === 0)
    .map(([slug]) => slug);

  if (orphanSlugs.length) {
    console.log(`\n🧭 Detected ${orphanSlugs.length} orphan post(s):`);
    orphanSlugs.forEach((slug) => console.log(`- ${slug}`));
  }

  const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);

  for (const [i, orphanSlug] of orphanSlugs.entries()) {
    const orphanMeta = metadata[orphanSlug];
    if (!orphanMeta?.title) continue;

    let keyword;
    if (orphanMeta.keyword) {
      keyword = orphanMeta.keyword.toLowerCase();
    } else {
      const words = orphanMeta.title.toLowerCase().split(/\s+/);
      const ngrams = generateNgrams(words, 3);

      let bestPhrase = words[0];
      let bestScore = -1;

      for (const phrase of ngrams) {
        const scores = [...ngrams].map((p) => scoreSimilarity(p, phrase));
        const score = scores.length ? Math.max(...scores) : 0;
        if (score > bestScore) {
          bestScore = score;
          bestPhrase = phrase;
        }
      }
      keyword = bestPhrase;
    }

    const synonyms = await getSynonyms(keyword);
    const variants = generateKeywordVariants(keyword).concat(synonyms);

    const targetFile = shuffledPosts[i % shuffledPosts.length];
    const filePath = path.join(postsDir, targetFile);
    const htmlRaw = fs.readFileSync(filePath, "utf8");
    const $ = cheerio.load(htmlRaw, { decodeEntities: false });

    let inserted = false;

    $("p").each((_, el) => {
      if (inserted || $(el).find("a").length > 0) return;

      $(el)
        .contents()
        .each((_, node) => {
          if (node.type !== "text") return;

          let text = node.data;

          for (const variant of variants) {
            const regex = new RegExp(
              `\\b(${escapeRegExp(variant)})\\b`,
              "i"
            );
            const match = text.match(regex);

            if (match) {
              const anchorText = match[1];
              const before = text.substring(0, match.index);
              const after = text.substring(
                match.index + anchorText.length
              );
              const safeTitle = escapeHtml(orphanMeta.title);
              const anchor = `<a href="/posts/${orphanSlug}.html" title="${safeTitle}">${anchorText}</a>`;

              $(node).replaceWith(before + anchor + after);
              inboundLinkCount[orphanSlug]++;
              outboundLinkCount[targetFile.replace(".html", "")]++;
              inserted = true;
              console.log(
                `🪄 Linked orphan [${orphanSlug}] from [${targetFile}]`
              );
              break;
            }
          }
        });
    });

    if (inserted) {
      fs.writeFileSync(filePath, $.html(), "utf8");
    }
  }

  // ========= FINAL REPORT ==========
  console.log("\n📊 Link Report");
  Object.keys(metadata).forEach((slug) => {
    console.log(
      `- ${slug}: ${inboundLinkCount[slug]} inbound | ${outboundLinkCount[slug]} outbound`
    );
  });
})();