const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const postsDir = path.join(__dirname, 'posts');
const outputDir = path.join(__dirname, 'dist');
const template = fs.readFileSync('template.html', 'utf8');

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function cleanAndWrapPost(postHtml, template) {
  const dom = new JSDOM(postHtml);
  const document = dom.window.document;

  // Remove duplicate JSON-LD scripts
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

  let foundFirst = false;
  scripts.forEach(script => {
    const content = script.textContent;
    if (!foundFirst && content.includes('"@type": "BlogPosting"')) {
      foundFirst = true;
    } else {
      script.remove(); // Remove duplicates
    }
  });

  // Return new HTML
  const cleanedHtml = document.documentElement.outerHTML;
  const wrapped = template.replace('<!--CONTENT-->', cleanedHtml);
  return minifyHtml(wrapped);
}

function minifyHtml(html) {
  return html
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

fs.readdirSync(postsDir).forEach(file => {
  if (file.endsWith('.html')) {
    const inputPath = path.join(postsDir, file);
    const outputPath = path.join(outputDir, file);

    const postHtml = fs.readFileSync(inputPath, 'utf8');
    const finalOutput = cleanAndWrapPost(postHtml, template);

    fs.writeFileSync(outputPath, finalOutput, 'utf8');
    console.log(`✅ Processed: ${file}`);
  }
});
