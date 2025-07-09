const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = './template.html';
const POSTS_DIR = './posts';
const OUTPUT_DIR = './dist';

// Make sure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Load the HTML template
const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// === UTILITIES ===

// Remove duplicate <script type="application/ld+json"> with @type = BlogPosting
function removeDuplicateJSONLD(html) {
  const jsonldRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;

  let foundBlogPosting = false;

  return html.replace(jsonldRegex, (match, content) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed['@type'] === 'BlogPosting') {
        if (foundBlogPosting) {
          return ''; // remove duplicates
        }
        foundBlogPosting = true;
        return match; // keep first
      }
      return match; // keep other @types
    } catch {
      return match; // invalid JSON? keep safe
    }
  });
}

// Very basic HTML minifier
function minifyHTML(html) {
  return html
    .replace(/>\s+</g, '><')             // remove whitespace between tags
    .replace(/\s{2,}/g, ' ')             // collapse spaces
    .replace(/<!--[\s\S]*?-->/g, '')     // remove HTML comments
    .replace(/\n/g, '')                  // remove newlines
    .trim();
}

// === MAIN PROCESS ===

fs.readdirSync(POSTS_DIR).forEach(file => {
  const filePath = path.join(POSTS_DIR, file);

  if (path.extname(file) === '.html') {
    const rawHtml = fs.readFileSync(filePath, 'utf8');

    // Clean duplicates in the post content
    const cleanedPostHtml = removeDuplicateJSONLD(rawHtml);

    // Wrap inside the template
    const wrappedHtml = template.replace('{{content}}', cleanedPostHtml);

    // Final duplicate clean-up (in case the template has JSON-LD)
    const fullyCleaned = removeDuplicateJSONLD(wrappedHtml);

    // Minify the final result
    const minifiedHtml = minifyHTML(fullyCleaned);

    // Save to output
    const outputPath = path.join(OUTPUT_DIR, file);
    fs.writeFileSync(outputPath, minifiedHtml, 'utf8');

    console.log(`✅ Processed: ${file}`);
  }
});