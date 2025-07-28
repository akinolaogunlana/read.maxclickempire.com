const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const keywordExtractor = require("keyword-extractor");
const natural = require("natural");

// Config
const postsDir = path.join(__dirname, "..", "posts");
const LINK_LIMIT = 3;
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

function escapeHtml(str) {
  return str.replace(/["&<>]/g, char => {
    switch (char) {
      case '"': return "&quot;";
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      default: return char;
    }
  });
}

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

function generateAnchorVariants(data) {
  const keyword = (data.keyword || data.title || "").toLowerCase();
  const defaultVariants = generateKeywordVariants(keyword);
  const extra = (data.anchorVariants || []).map(v => v.toLowerCase());
  return Array.from(new Set([...defaultVariants, ...extra]));
}

function scoreSimilarity(a, b) {
  return natural.JaroWinklerDistance(a.toLowerCase(), b.toLowerCase());
}

function isInsideLinkOrExcludedTag($node) {
  return $node.parents("a, code, pre, h1, h2, h3, h4, h5, h6, ul, ol, li").length > 0;
}

// Tracking backlinks
const backlinks = {};

// Main processing
const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => {
  const filePath = path.join(postsDir, filename);
  const htmlRaw = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(htmlRaw, { decodeEntities: false });
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
  const insertedLinks = [];

  const potentialLinks = Object.entries(metadata)
    .filter(([slug2, data]) => slug2 !== slug && data?.title)
    .map(([slug2, data]) => {
      const baseKeyword = (data.keyword || data.title.split(" ")[0]).toLowerCase();
      const variants = generateAnchorVariants(data);
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
        targetSlug: slug2,
        score,
      };
    })
    .filter(link => link.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  $("p").each((_, el) => {
    if (inserted >= LINK_LIMIT) return;

    const $el = $(el);
    if ($el.find("a").length > 0) return;

    let replacedInThisParagraph = false;

    $el.contents().each((i, node) => {
      if (node.type !== "text" || inserted >= LINK_LIMIT || replacedInThisParagraph) return;

      const $node = $(node);
      if (isInsideLinkOrExcludedTag($node)) return;

      let text = node.data;

      for (const link of potentialLinks) {
        if (usedLinks.has(link.href)) continue;

        for (const variant of link.variants) {
          const regex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
          const match = text.match(regex);

          if (match) {
            const anchorText = match[1];
            const before = text.slice(0, match.index);
            const after = text.slice(match.index + anchorText.length);
            const safeTitle = escapeHtml(link.title);
            const anchor = `<a href="${link.href}" title="${safeTitle}">${anchorText}</a>`;
            $node.replaceWith(before + anchor + after);
            usedLinks.add(link.href);
            insertedLinks.push(`${anchorText} → ${link.href}`);
            inserted++;
            replacedInThisParagraph = true;

            // Track backlink
            if (!backlinks[link.targetSlug]) backlinks[link.targetSlug] = new Set();
            backlinks[link.targetSlug].add(slug);
            break;
          }
        }
        if (replacedInThisParagraph || inserted >= LINK_LIMIT) break;
      }
    });
  });

  fs.writeFileSync(filePath, $.html(), "utf8");

  if (inserted > 0) {
    console.log(`🔗 [${filename}] — inserted ${inserted} links:`);
    insertedLinks.forEach(link => console.log("   • " + link));
  } else {
    console.log(`— [${filename}] — no relevant links inserted.`);
  }
});

// Final orphan check
const allSlugs = Object.keys(metadata);
const orphanSlugs = allSlugs.filter(slug => !backlinks[slug] || backlinks[slug].size === 0);

if (orphanSlugs.length > 0) {
  console.log("\n🚨 Orphan Posts (no incoming links):");
  orphanSlugs.forEach(slug => {
    const title = metadata[slug]?.title || slug;
    console.log(`   • ${title} → /posts/${slug}.html`);
  });
} else {
  console.log("\n✅ No orphan posts — every post has at least one incoming link.");
}