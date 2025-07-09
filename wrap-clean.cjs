// ✅ MaxClickEmpire Wrap Clean Script
const fs = require("fs");
const path = require("path");

const postsDir = path.join(__dirname, "posts");

const files = fs.readdirSync(postsDir).filter(file => file.endsWith(".html"));

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  let html = fs.readFileSync(filePath, "utf8");

  // --- Step 1: Clean up duplicate JSON-LD BlogPosting blocks ---
  const blogPostingRegex = /<script[^>]*type="application\/ld\+json">[\s\S]*?"@type"\s*:\s*"BlogPosting"[\s\S]*?<\/script>/gi;
  const matches = [...html.matchAll(blogPostingRegex)];

  if (matches.length > 1) {
    html = html.replace(blogPostingRegex, '');
    html = html.replace("</head>", `${matches[0][0]}\n</head>`);
  }

  // --- Step 2: Remove duplicate canonical link ---
  const canonicalRegex = /<link[^>]+rel="canonical"[^>]*>/gi;
  const canonicalMatches = html.match(canonicalRegex);
  if (canonicalMatches && canonicalMatches.length > 1) {
    html = html.replace(canonicalRegex, '');
    html = html.replace("</head>", `${canonicalMatches[0]}\n</head>`);
  }

  // --- Step 3: Remove duplicate <title> ---
  const titleMatches = html.match(/<title>.*?<\/title>/gi);
  if (titleMatches && titleMatches.length > 1) {
    html = html.replace(/<title>.*?<\/title>/gi, '');
    html = html.replace("</head>", `${titleMatches[0]}\n</head>`);
  }

  // --- Step 4: Remove duplicate <meta name="description"> ---
  const descMatches = html.match(/<meta\s+name="description"[^>]*>/gi);
  if (descMatches && descMatches.length > 1) {
    html = html.replace(/<meta\s+name="description"[^>]*>/gi, '');
    html = html.replace("</head>", `${descMatches[0]}\n</head>`);
  }

  // --- Step 5: Remove exact duplicate enhancer + meta script blocks ---
  const metaScriptRegex = /<script\s+src="[^"]*post-meta\.js"[^>]*><\/script>/gi;
  const enhancerScriptRegex = /<script\s+src="[^"]*seo-enhancer\.js"[^>]*><\/script>/gi;

  const keepMeta = (html.match(metaScriptRegex) || [])[0] || '';
  const keepEnhancer = (html.match(enhancerScriptRegex) || [])[0] || '';

  html = html.replace(metaScriptRegex, '');
  html = html.replace(enhancerScriptRegex, '');
  html = html.replace("</body>", `${keepMeta}\n${keepEnhancer}\n</body>`);

  // --- Step 6: Sanity cleanup of HTML structure ---
  html = html.replace(/<\/html>[\s\S]*?$/, "</html>");
  html = html.replace(/<html[^>]*>/gi, "<html lang=\"en\">");
  html = html.replace(/<head>[\s\S]*?<head>/gi, "<head>"); // double heads
  html = html.replace(/<body>[\s\S]*?<body>/gi, "<body>"); // double bodies
  html = html.replace(/<\/head>[\s\S]*?<\/head>/gi, match => {
    const headContents = match.match(/<head>([\s\S]*?)<\/head>/i);
    return headContents ? `<head>${headContents[1]}</head>` : match;
  });

  // Optional: remove empty lines and clean spacing
  html = html.replace(/^\s*[\r\n]/gm, "");

  fs.writeFileSync(filePath, html, "utf8");
  console.log(`✅ Cleaned: ${file}`);
});