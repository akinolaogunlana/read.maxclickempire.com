const fs = require('fs');
const path = require('path');

// === Paths ===
const TEMPLATE_PATH = './template.html';
const POSTS_DIR = './posts';
const OUTPUT_DIR = './dist';

// === Ensure Output Directory Exists ===
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// === Load Template ===
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// === Remove Duplicate JSON-LD Scripts ===
function removeDuplicateJSONLD(html) {
  const jsonldRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let firstBlogPostingKept = false;

  return html.replace(jsonldRegex, (match, content) => {
    try {
      const data = JSON.parse(content);
      if (data['@type'] === 'BlogPosting') {
        if (firstBlogPostingKept) return ''; // remove duplicate
        firstBlogPostingKept = true;
        return match; // keep first valid
      }
    } catch (e) {
      // If JSON parsing fails, keep the script tag just in case
      return match;
    }
    return match; // non-BlogPosting, keep
  });
}

// === Basic Minifier ===
function minifyHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')     // remove comments
    .replace(/\n+/g, '')                 // remove new lines
    .replace(/\s{2,}/g, ' ')             // collapse spaces
    .replace(/>\s+</g, '><')             // trim tag spacing
    .trim();
}

// === Main Function ===
fs.readdirSync(POSTS_DIR).forEach(file => {
  if (path.extname(file) !== '.html') return;

  const postPath = path.join(POSTS_DIR, file);
  const postHtml = fs.readFileSync(postPath, 'utf8');

  // Step 1: Clean duplicate JSON-LD
  const cleanedHtml = removeDuplicateJSONLD(postHtml);

  // Step 2: Inject into template
  const wrappedHtml = template.replace('{{content}}', cleanedHtml);

  // Step 3: Clean duplicates again if template adds any
  const finalClean = removeDuplicateJSONLD(wrappedHtml);

  // Step 4: Minify
  const minified = minifyHTML(finalClean);

  // Step 5: Save to dist/
  const outputPath = path.join(OUTPUT_DIR, file);
  fs.writeFileSync(outputPath, minified, 'utf8');
  console.log(`✅ Cleaned & wrapped: ${file}`);
});