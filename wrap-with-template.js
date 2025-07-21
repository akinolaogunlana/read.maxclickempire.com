const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const OUTPUT_DIR = path.join(__dirname, "dist");
const POSTS_DIR = path.join(__dirname, "posts");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load the HTML template
const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

// Read all .html files from the posts directory
fs.readdirSync(POSTS_DIR).forEach((filename) => {
  if (!filename.endsWith(".html")) return;

  const filePath = path.join(POSTS_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract <h1> title
  const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.html$/, "");

  // Extract description from comment or <p>
  const descMatch = content.match(/<!--\s*desc:(.*?)-->/i);
  let description = "";
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    const pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      description = pMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 160);
    }
  }

  // Extract keywords
  const keywordMatch = content.match(/<!--\s*keywords:(.*?)-->/i);
  const keywords = keywordMatch ? keywordMatch[1].trim() : "";

  // Slug from filename (without .html)
  const filenameSlug = filename.replace(/\.html$/, "");

  // Structured Data (JSON-LD)
  const structuredData = `
<script type="application/ld+json">  
{  
  "@context": "https://schema.org",  
  "@type": "BlogPosting",  
  "headline": "${title}",  
  "description": "${description}",  
  "author": {  
    "@type": "Person",  
    "name": "Ogunlana Akinola Okikiola"  
  },  
  "mainEntityOfPage": {  
    "@type": "WebPage",  
    "@id": "https://read.maxclickempire.com/posts/${filenameSlug}.html"  
  },  
  "publisher": {  
    "@type": "Organization",  
    "name": "MaxClickEmpire",  
    "logo": {  
      "@type": "ImageObject",  
      "url": "https://read.maxclickempire.com/assets/favicon.png"  
    }  
  }  
}  
</script>`.trim();

  // Final HTML with placeholders replaced
  const finalHTML = template
    .replace(/{{TITLE}}/gi, title)
    .replace(/{{DESCRIPTION}}/gi, description)
    .replace(/{{KEYWORDS}}/gi, keywords)
    .replace(/{{FILENAME}}/gi, filenameSlug)
    .replace(/{{STRUCTURED_DATA}}/gi, structuredData)
    .replace(/{{CONTENT}}/gi, content);

  // Write to output directory
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, finalHTML, "utf-8");
  console.log(`✅ Generated: ${outputPath}`);
});