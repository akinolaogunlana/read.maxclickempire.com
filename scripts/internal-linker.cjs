// scripts/internal-linker.cjs const fs = require("fs"); const path = require("path"); const { JSDOM } = require("jsdom"); const natural = require("natural"); const keyword_extractor = require("keyword-extractor");

const postsDir = path.join(__dirname, "..", "posts");

// ✅ Load metadata safely from Node-compatible file let metadata; try { const postMetaModule = require("../data/post-meta.js"); metadata = postMetaModule.postMetadata || {}; } catch (err) { console.error("❌ Failed to load post metadata:", err.message); process.exit(1); }

const LINK_LIMIT = 3; const MIN_PARAGRAPH_LENGTH = 80;

function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[]\]/g, "\$&"); }

function generateKeywordVariants(keyword) { const base = keyword.toLowerCase(); return [ base, base + "s", base.replace(/\bguide\b/, "tutorial"), base.replace(/\btips\b/, "strategies"), base.replace(/\bhow to\b/, "ways to"), ]; }

function scoreSimilarity(text, keyword) { return natural.JaroWinklerDistance(text.toLowerCase(), keyword.toLowerCase()); }

function extractKeywords(text) { return keyword_extractor.extract(text, { language: "english", remove_digits: true, return_changed_case: true, remove_duplicates: true, }); }

const posts = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

posts.forEach((filename) => { const filePath = path.join(postsDir, filename); let html = fs.readFileSync(filePath, "utf8");

const dom = new JSDOM(html); const document = dom.window.document;

const currentSlug = filename.replace(".html", "").toLowerCase(); const usedLinks = new Set(); let inserted = 0;

const currentTitle = metadata[currentSlug]?.title || ""; const keywordsFromPage = extractKeywords(document.body.textContent).slice(0, 10);

const potentialLinks = Object.entries(metadata) .filter(([slug]) => slug !== currentSlug) .map(([slug, data]) => { const baseKeyword = (data.keyword || data.title.split(" ")[0]).toLowerCase(); return { keyword: baseKeyword, variants: generateKeywordVariants(baseKeyword), href: /posts/${slug}.html, title: data.title, score: Math.max( scoreSimilarity(currentTitle, data.title), ...keywordsFromPage.map(k => scoreSimilarity(k, baseKeyword)) ), }; }) .sort((a, b) => b.score - a.score);

const paragraphs = Array.from(document.querySelectorAll("p")); for (const p of paragraphs) { if (inserted >= LINK_LIMIT || p.innerHTML.length < MIN_PARAGRAPH_LENGTH || p.innerHTML.includes("<a ")) continue;

for (const link of potentialLinks) {
  if (usedLinks.has(link.href)) continue;

  for (const variant of link.variants) {
    const keywordRegex = new RegExp(`\\b(${escapeRegExp(variant)})\\b`, "i");
    if (keywordRegex.test(p.innerHTML)) {
      p.innerHTML = p.innerHTML.replace(keywordRegex, `<a href="${link.href}" title="${link.title}">$1</a>`);
      usedLinks.add(link.href);
      inserted++;
      break;
    }
  }
  if (inserted >= LINK_LIMIT) break;
}

}

fs.writeFileSync(filePath, dom.serialize(), "utf8"); console.log(🔗 ${filename} — inserted ${inserted} smart internal links); });

