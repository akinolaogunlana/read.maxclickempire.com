// ✅ Supreme Wrap-Clean Engine (MaxClickEmpire)

const fs = require("fs"); const path = require("path"); const cheerio = require("cheerio"); const htmlMinifier = require("html-minifier").minify;

const RAW_DIR = path.join(__dirname, "posts"); const DIST_DIR = path.join(__dirname, "dist"); const TEMPLATE_PATH = path.join(__dirname, "template.html"); const cache = new Set();

const TEMPLATE_HTML = fs.readFileSync(TEMPLATE_PATH, "utf8");

if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

function normalizeSlug(title) { return title.toLowerCase() .replace(/[^a-z0-9]+/g, '-') .replace(/(^-|-$)/g, ''); }

function isValidHTML($) { return $("title").length > 0 && $("meta[name='description']").length > 0 && $("article").length > 0; }

function extractSlugDateSafe(title, date) { const base = normalizeSlug(title); const d = new Date(date).toISOString().slice(0, 10); return ${base}-${d}; }

function cleanHTML(rawHtml, fileName) { const $ = cheerio.load(rawHtml);

// Try to fix missing or invalid structure let title = $("title").text() || $("h1").first().text() || fileName.replace(/.html$/, ""); let desc = $("meta[name='description']").attr("content") || $("p").first().text().slice(0, 160).replace(/\n/g, " ").trim(); let pubDate = $("[datetime]").attr("datetime") || new Date().toISOString();

const slugKey = extractSlugDateSafe(title, pubDate); if (cache.has(slugKey)) return null; // Duplicate cache.add(slugKey);

// Remove existing scripts and JSON-LD blocks $("script[type='application/ld+json']").remove(); $("script[src*='post-meta.js']").remove(); $("script[src*='seo-enhancer.js']").remove();

// Inject into template const content = $("article").html() || $("body").html(); const $template = cheerio.load(TEMPLATE_HTML);

$template("title").text(title); $template("meta[name='description']").attr("content", desc); $template("article").html(content);

// Add canonical link const canonical = https://read.maxclickempire.com/posts/${fileName}; $template("head").append(<link rel=\"canonical\" href=\"${canonical}\">);

// Add enhancer and meta script $template("body").append(<script src='/data/post-meta.js' defer></script>); $template("body").append(<script src='/assets/seo-enhancer.js' defer></script>);

// Add JSON-LD schema const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: title, description: desc, url: canonical, datePublished: pubDate, dateModified: new Date().toISOString(), author: { "@type": "Organization", name: "MaxClickEmpire" }, publisher: { "@type": "Organization", name: "MaxClickEmpire", logo: { "@type": "ImageObject", url: "https://read.maxclickempire.com/assets/og-image.jpg" } }, mainEntityOfPage: canonical }; $template("head").append(<script type='application/ld+json'>${JSON.stringify(jsonLd)}</script>);

// Final cleanup & minify return htmlMinifier($template.html(), { collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: true, removeEmptyElements: false }); }

fs.readdirSync(RAW_DIR).forEach(file => { if (!file.endsWith(".html")) return; const rawPath = path.join(RAW_DIR, file); const rawHtml = fs.readFileSync(rawPath, "utf8");

const cleaned = cleanHTML(rawHtml, file); if (!cleaned) { console.log(🟡 Skipped duplicate or invalid: ${file}); return; }

const outputPath = path.join(DIST_DIR, file); fs.writeFileSync(outputPath, cleaned, "utf8"); console.log(✅ Cleaned & wrapped: ${file}); });

