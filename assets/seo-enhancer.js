const cheerio = require("cheerio");

function enhanceSEO(html, metadata) { const $ = cheerio.load(html);

// Remove any existing duplicate titles/h1s to avoid keyword stuffing $('title').remove(); $('h1').each((i, el) => { if (i > 0) $(el).remove(); // keep only the first h1 if any });

const mainTitle = metadata.title || $("h1").first().text();

// Ensure there's one and only one h1 if ($('h1').length === 0) { $('body').prepend(<h1>${mainTitle}</h1>); }

// Inject hero section (WITHOUT title) under the H1 or TOC const heroSection = <div class="hero-section" style="margin-top: 1em; padding: 1em; background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px;"> <p><strong>Author:</strong> ${metadata.author || "Unknown"}</p> <p><strong>Published:</strong> ${metadata.date || "Unknown"}</p> <div class="social-share" style="margin-top: 0.5em;"> <strong>Share:</strong> <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(mainTitle)}&url=${encodeURIComponent(metadata.url || "")}" target="_blank" rel="noopener noreferrer">Twitter</a> | <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(metadata.url || "")}" target="_blank" rel="noopener noreferrer">Facebook</a> | <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(metadata.url || "")}&title=${encodeURIComponent(mainTitle)}" target="_blank" rel="noopener noreferrer">LinkedIn</a> </div> </div>;

const toc = $(".table-of-contents, #table-of-contents, .toc").first(); if (toc.length > 0) { toc.after(heroSection); } else { $("h1").first().after(heroSection); }

return $.html(); }

module.exports = { enhanceSEO, };

