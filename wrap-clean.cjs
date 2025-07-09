const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier');
const cheerio = require('cheerio');

// === CONFIG ===
const TEMPLATE_PATH = './template.html';
const POSTS_DIR = './posts/';
const DIST_DIR = './dist/';

// === Ensure dist folder exists ===
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

// === Function to remove duplicate BlogPosting JSON-LD ===
function removeDuplicateJSONLD(html) {
  const $ = cheerio.load(html);

  let foundFirst = false;

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json['@type'] === 'BlogPosting') {
        if (!foundFirst) {
          foundFirst = true;
        } else {
          $(el).remove(); // Remove duplicate BlogPosting JSON-LD
        }
      }
    } catch (e) {
      // Leave invalid JSON-LD alone
    }
  });

  return $.html();
}

// === Function to insert post HTML into the template ===
function wrapWithTemplate(templateHtml, postHtml) {
  return templateHtml.replace('<!--CONTENT-->', postHtml);
}

// === Function to minify HTML ===
function minifyHtml(html) {
  return minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyJS: true,
    minifyCSS: true,
  });
}

// === Main Script ===
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const postPath = path.join(POSTS_DIR, file);
  const postHtml = fs.readFileSync(postPath, 'utf8');

  // Insert post into template
  let wrappedHtml = wrapWithTemplate(template, postHtml);

  // Remove duplicate JSON-LD
  let cleanedHtml = removeDuplicateJSONLD(wrappedHtml);

  // Minify
  let finalHtml = minifyHtml(cleanedHtml);

  // Save to dist/
  const outputPath = path.join(DIST_DIR, file);
  fs.writeFileSync(outputPath, finalHtml, 'utf8');
  console.log(`✅ Cleaned: ${file}`);
});

console.log('\n🎉 All posts wrapped, cleaned, and saved to /dist');
