const fs = require('fs');
const path = require('path');

const template = fs.readFileSync('template.html', 'utf8');
const postsDir = path.join(__dirname, 'posts');
const outputDir = path.join(__dirname, 'dist');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function removeDuplicateJSONLD(html) {
  const jsonldRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;

  let foundFirst = false;
  return html.replace(jsonldRegex, (match, content) => {
    if (!foundFirst && content.includes('"@type": "BlogPosting"')) {
      foundFirst = true;
      return match; // Keep first one
    }
    return ''; // Remove others
  });
}

function minifyHtml(html) {
  return html
    .replace(/\n/g, '')                // Remove newlines
    .replace(/\s{2,}/g, ' ')           // Collapse multiple spaces
    .replace(/>\s+</g, '><')           // Remove spaces between tags
    .trim();
}

fs.readdir(postsDir, (err, files) => {
  if (err) {
    console.error('❌ Error reading posts directory:', err);
    return;
  }

  files.forEach(file => {
    if (path.extname(file) === '.html') {
      const postPath = path.join(postsDir, file);
      let postContent = fs.readFileSync(postPath, 'utf8');

      // Remove duplicate JSON-LD scripts
      postContent = removeDuplicateJSONLD(postContent);

      // Inject the post content into the template
      const finalHtml = template.replace('<!--CONTENT-->', postContent);

      // Optional: Minify the HTML
      const minified = minifyHtml(finalHtml);

      // Save to /dist
      const outputFilePath = path.join(outputDir, file);
      fs.writeFileSync(outputFilePath, minified, 'utf8');

      console.log(`✅ Wrapped and cleaned: ${file}`);
    }
  });
});
