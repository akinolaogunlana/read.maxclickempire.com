const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, 'posts');

fs.readdirSync(postsDir).forEach(file => {
  if (!file.endsWith('.html')) return;

  const filePath = path.join(postsDir, file);
  let html = fs.readFileSync(filePath, 'utf-8');

  // 🧹 1. Remove duplicate JSON-LD scripts (keep first)
  const ldJsonRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/gi;
  const ldMatches = html.match(ldJsonRegex);
  if (ldMatches && ldMatches.length > 1) {
    html = html.replace(ldJsonRegex, (_, offset) => {
      const first = ldMatches.shift();
      return first; // keep first only
    });
  }

  // 🧹 2. Remove junk <script> with console.log or debugger
  html = html.replace(/<script[^>]*>[\s\S]*?(console\.log|debugger|alert)[\s\S]*?<\/script>/gi, '');

  // 🧹 3. Remove empty or duplicated <meta>
  html = html.replace(/<meta name="keywords" content="\s*"\s*\/?>/gi, '');
  html = html.replace(/<meta[^>]+name="(description|author|keywords)"[^>]*>\s*(?=<meta[^>]+name="\1")/gi, '');

  // 🧹 4. Fix duplicate html/head/body
  ['html', 'head', 'body'].forEach(tag => {
    const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');

    const openTags = html.match(openRegex);
    const closeTags = html.match(closeRegex);

    if (openTags && openTags.length > 1) {
      let count = 0;
      html = html.replace(openRegex, match => ++count === 1 ? match : '');
    }

    if (closeTags && closeTags.length > 1) {
      let count = 0;
      html = html.replace(closeRegex, match => ++count === 1 ? match : '');
    }
  });

  // 🧹 5. Fix unclosed article
  if (!html.includes('</article>') && html.includes('<article')) {
    html = html.replace(/<\/main>\s*<\/body>/i, '</article></main></body>');
  }

  // 🧹 6. Ensure correct DOCTYPE and structure
  if (!html.startsWith('<!DOCTYPE html>')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  // 🧹 7. Ensure <html>, <head>, <body> are in correct order
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);

  let newHead = headMatch ? headMatch[0] : '<head></head>';
  let newBody = bodyMatch ? bodyMatch[0] : '<body></body>';

  const finalHTML = `
<!DOCTYPE html>
<html lang="en">
${newHead}
${newBody}
</html>
`.trim();

  // 🧼 Optional: Extract article and insert in body
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) {
    newBody = `<body>\n  ${articleMatch[0]}\n</body>`;
  }

  const cleanedHTML = `
<!DOCTYPE html>
<html lang="en">
${newHead}
${newBody}
</html>
`.replace(/\n{3,}/g, '\n\n'); // tidy blank lines

  fs.writeFileSync(filePath, cleanedHTML);
  console.log(`✅ Cleaned & corrected: ${file}`);
});