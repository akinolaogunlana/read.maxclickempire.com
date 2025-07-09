const fs = require('fs');
const path = require('path');

// === SETTINGS ===
const postsDir = path.join(__dirname, 'posts');
const distDir = path.join(__dirname, 'dist');
const templatePath = path.join(__dirname, 'template.html');

// === Ensure dist folder exists ===
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// === Load template file ===
const template = fs.readFileSync(templatePath, 'utf8');

// === Remove duplicate BlogPosting JSON-LD scripts ===
function removeDuplicateJSONLD(html) {
  const jsonldRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let firstFound = false;

  return html.replace(jsonldRegex, (match, content) => {
    if (!firstFound && content.includes('"@type": "BlogPosting"')) {
      firstFound = true;
      return match;
    }
    return '';
  });
}

// === Minify HTML ===
function minifyHTML(html) {
  return html
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><') // Remove space between tags
    .trim();
}

// === Process each post ===
fs.readdirSync(postsDir).forEach(file => {
  if (file.endsWith('.html')) {
    const filePath = path.join(postsDir, file);
    const rawHtml = fs.readFileSync(filePath, 'utf8');

    // Clean JSON-LD
    const cleanedHtml = removeDuplicateJSONLD(rawHtml);

    // Inject into template
    const wrappedHtml = template.replace('{{content}}', cleanedHtml);

    // Minify
    const finalHtml = minifyHTML(wrappedHtml);

    // Write to dist
    const outputPath = path.join(distDir, file);
    fs.writeFileSync(outputPath, finalHtml, 'utf8');
    console.log(`✅ Processed and saved: ${file}`);
  }
});
