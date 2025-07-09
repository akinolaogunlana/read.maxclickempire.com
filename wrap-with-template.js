const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Paths
const postsDir = path.join(__dirname, 'posts');
const outputDir = path.join(__dirname, 'dist');
const templateHtml = fs.readFileSync('template.html', 'utf8');

// Ensure output folder exists
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

function parseJsonSafely(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function isSameJSON(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function removeDuplicateJSONLD(document) {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const seen = [];

  scripts.forEach(script => {
    const json = parseJsonSafely(script.textContent);
    if (!json) {
      script.remove(); // remove broken JSON
      return;
    }

    const alreadyExists = seen.some(existing => isSameJSON(existing, json));
    if (alreadyExists) {
      script.remove();
    } else {
      seen.push(json);
    }
  });
}

function cleanAndWrap(htmlContent) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Remove duplicate structured data
  removeDuplicateJSONLD(document);

  // Get the cleaned HTML
  const cleanedHtml = document.documentElement.outerHTML;

  // Wrap in template
  const wrapped = templateHtml.replace('<!--CONTENT-->', cleanedHtml);

  // Minify
  return wrapped
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

// Process each HTML file
fs.readdirSync(postsDir).forEach(file => {
  if (!file.endsWith('.html')) return;

  const inputPath = path.join(postsDir, file);
  const outputPath = path.join(outputDir, file);
  const content = fs.readFileSync(inputPath, 'utf8');

  const finalHtml = cleanAndWrap(content);
  fs.writeFileSync(outputPath, finalHtml, 'utf8');

  console.log(`✅ Cleaned & wrapped: ${file}`);
});
