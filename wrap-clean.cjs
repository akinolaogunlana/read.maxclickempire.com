const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const postsDir = path.join(__dirname, 'posts');
const outputDir = path.join(__dirname, 'dist');
const templatePath = path.join(__dirname, 'template.html');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Load the wrapper template
let template = fs.readFileSync(templatePath, 'utf8');

// Get all HTML files in posts/
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filepath = path.join(postsDir, file);
  const rawHTML = fs.readFileSync(filepath, 'utf8');
  const dom = new JSDOM(rawHTML);
  const document = dom.window.document;

  // Extract meaningful fields
  const title = document.querySelector('title')?.textContent || 'Untitled';
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const content = document.body.innerHTML || '';
  const date = new Date().toISOString();
  const filename = path.parse(file).name;

  // Remove duplicate structured data scripts
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

  // Replace placeholders in the template
  const finalHTML = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{CONTENT}}/g, content)
    .replace(/{{DATE}}/g, date)
    .replace(/{{FILENAME}}/g, filename);

  // Write cleaned file to dist/
  fs.writeFileSync(path.join(outputDir, file), finalHTML, 'utf8');
  console.log(`✅ Wrapped and cleaned: ${file}`);
});
