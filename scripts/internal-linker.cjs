const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");
const WordNet = natural.WordNet;
const wn = new WordNet();

const postsDir = path.join(__dirname, "..", "posts");
const MIN_LINKS = 5;
const MAX_LINKS = 15;
const SIMILARITY_THRESHOLD = 0.75;

// ========= FORBIDDEN WORDS ==========
const forbiddenFile = path.join(__dirname, "../data/forbidden-words.json");
let FORBIDDEN_WORDS = new Set();
try {
  if (fs.existsSync(forbiddenFile)) {
    const words = JSON.parse(fs.readFileSync(forbiddenFile, "utf8"));
    FORBIDDEN_WORDS = new Set(words.map((w) => w.toLowerCase()));
  }
} catch {
  console.warn("⚠️ Failed to load forbidden words, continuing...");
}

// ========= PER-LINK WHITELIST ==========
const whitelistFile = path.join(__dirname, "../data/link-whitelist.json");
let LINK_KEYWORD_WHITELIST = {};
try {
  if (fs.existsSync(whitelistFile)) {
    LINK_KEYWORD_WHITELIST = JSON.parse(fs.readFileSync(whitelistFile, "utf8"));
  }
} catch {
  console.warn("⚠️ Failed to load link whitelist, continuing...");
}

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

async function getSynonyms(word, bodyWords) {
  if (synonymCache[word]) {
    return synonymCache[word].filter((s) => bodyWords.has(s));
  }
  return new Promise((resolve) => {
    wn.lookup(word, (results) => {
      if (!results || results.length === 0) {
        synonymCache[word] = [];
        return resolve([]);
      }
      const synonyms = [];
      results.forEach((r) => {
        if (r.pos === "n") {
          synonyms.push(...r.synonyms);
        }
      });
      const unique = [...new Set(synonyms.map((s) => s.toLowerCase()))]
        .filter((w) => /^[a-z\s-]+$/.test(w));
      synonymCache[word] = unique;
      fs.writeFileSync(cacheFile, JSON.stringify(synonymCache, null, 2));
      resolve(unique.filter((s) => bodyWords.has(s)));
    });
  });
}

// ========= EXPAND FORBIDDEN WORDS ==========
async function expandForbiddenWords() {
  const expanded = new Set([...FORBIDDEN_WORDS]);
  for (const word of FORBIDDEN_WORDS) {
    const synonyms = await getSynonyms(word, new Set());
    synonyms.forEach((s) => expanded.add(s.toLowerCase()));
  }
  return expanded;
}

// ========= METADATA ==========
let metadata;
try {
  const postMetaModule = require("../data/post-meta.js");
  metadata = postMetaModule.postMetadata || {};
} catch (err) {
  console.error("❌ Failed to load metadata:", err.message);
  process.exit(1);
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

const generateNgrams = (words, maxN = 4) => {
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
  const EXPANDED_FORBIDDEN = await expandForbiddenWords();

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

    const linkPath = `/posts/${filename}`;
    const perLink = LINK_KEYWORD_WHITELIST[linkPath] || {};
    const perKeywords = new Set((perLink.keywords || []).map(w => w.toLowerCase()));
    const perPhrases = new Set((perLink.phrases || []).map(w => w.toLowerCase()));
    const perLinks = new Set(perLink.links || []);

    const bodyText = $("body").text().trim();
    if (!bodyText) continue;
    const bodyWords = new Set(bodyText.toLowerCase().split(/\W+/));

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
            const ngrams = generateNgrams(words, 4);

            let bestPhrase = words[0];
            let bestScore = -1;

            for (const phrase of ngrams) {
              const scores = [
                ...[...nlpSet].map((k) => scoreSimilarity(k, phrase)),
                ...[...metaSet].map((k) => scoreSimilarity(k, phrase)),
              ];
              const score = scores.length ? Math.max(...scores) : 0;

              if (
                score > bestScore ||
                (score === bestScore &&
                  phrase.split(" ").length > bestPhrase.split(" ").length)
              ) {
                bestScore = score;
                bestPhrase = phrase;
              }
            }
            baseKeyword = bestPhrase;
          }

          const synonyms = await getSynonyms(baseKeyword, bodyWords);
          let variants = generateKeywordVariants(baseKeyword).concat(synonyms);

          // 🚫 Block forbidden unless whitelisted
          variants = variants.filter((v) => {
            const clean = v.toLowerCase();
            return (
              v.split(" ").length > 1 ||
              !EXPANDED_FORBIDDEN.has(clean) ||
              perKeywords.has(clean) ||
              perPhrases.has(clean) ||
              perLinks.has(`/posts/${slug2}.html`)
            );
          });

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
      .filter((link) => link.score >= SIMILARITY_THRESHOLD && link.variants.length > 0)
      .sort((a, b) => b.score - a.score);

    const paragraphs = $("p")
      .toArray()
      .sort((a, b) => {
        const textA = $(a).text().toLowerCase();
        const textB = $(b).text().toLowerCase();
        const scoreA = [...nlpSet].filter((k) => textA.includes(k)).length;
        const scoreB = [...nlpSet].filter((k) => textB.includes(k)).length;
        return scoreB - scoreA;
      });

    paragraphs.forEach((el) => {
      if (inserted >= MAX_LINKS) return;
      if ($(el).find("a").length > 0) return;

      $(el)
        .contents()
        .each((i, node) => {
          if (inserted >= MAX_LINKS || node.type !== "text") return;

          let text = node.data;
          let replaced = false;

          for (const link of filteredLinks) {
            if (usedLinks.has(link.href)) continue;

            const variants = [...link.variants].sort(
              (a, b) => b.split(" ").length - a.split(" ").length
            );

            for (const variant of variants) {
              const regex = new RegExp(
                `(^|\\W)(${escapeRegExp(variant)})(?=\\W|$)`,
                "i"
              );
              const match = text.match(regex);

              if (match) {
                const anchorText = match[2];
                const before = text.substring(0, match.index + match[1].length);
                const after = text.substring(match.index + match[0].length);
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
            if (replaced || inserted >= MAX_LINKS) break;
          }
        });
    });

    // ✅ Add fallback Related Articles section if too few links
    if (inserted < MIN_LINKS) {
      const needed = MIN_LINKS - inserted;
      const extraLinks = filteredLinks
        .filter((l) => !usedLinks.has(l.href))
        .slice(0, needed);

      if (extraLinks.length > 0) {
        const relatedSection = `
          <div class="related-articles">
            <h3>Related Articles</h3>
            <ul>
              ${extraLinks
                .map(
                  (l) =>
                    `<li><a href="${l.href}" title="${escapeHtml(
                      l.title
                    )}">${escapeHtml(l.title)}</a></li>`
                )
                .join("\n")}
            </ul>
          </div>
        `;
        $("body").append(relatedSection);
        extraLinks.forEach((l) => {
          usedLinks.add(l.href);
          inboundLinkCount[l.slug]++;
          outboundLinkCount[slug]++;
          inserted++;
        });
        console.log(
          `➕ [${filename}] added Related Articles with ${extraLinks.length} links`
        );
      }
    }

    fs.writeFileSync(filePath, $.html(), "utf8");

    // ✅ Report link status
    if (inserted < MIN_LINKS) {
      console.warn(
        `⚠️ [${filename}] still below min links (inserted ${inserted}).`
      );
    } else if (inserted > MAX_LINKS) {
      console.warn(
        `⚠️ [${filename}] exceeded max links (${inserted}, cap ${MAX_LINKS}).`
      );
    } else {
      console.log(`🔗 [${filename}] — inserted ${inserted} smart links`);
    }
  }

  console.log("\n📊 Link Report");
  Object.keys(metadata).forEach((slug) => {
    console.log(
      `- ${slug}: ${inboundLinkCount[slug]} inbound | ${outboundLinkCount[slug]} outbound`
    );
  });
})();