// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");

const metaPath = path.join(__dirname, "..", "data", "post-meta.js");

let raw;
try {
  raw = fs.readFileSync(metaPath, "utf8");
} catch (err) {
  console.error("❌ Cannot read post-meta.js:", err.message);
  process.exit(1);
}

let metadataJson = null;

// Match either `window.postMetadata = {...};` or `const postMetadata = {...};`
const match = raw.match(/(?:window|const)\s*\.?\s*postMetadata\s*=\s*(\{[\s\S]*?\})\s*;/);

if (!match || !match[1]) {
  console.error("❌ Could not extract valid postMetadata JSON object.");
  process.exit(1);
}

try {
  // Parse to confirm it's valid JSON
  const metadata = JSON.parse(match[1]);

  // Rewrite in dual-compatible format
  const fixedOutput = `// Auto-fixed for Node.js and Browser use

const postMetadata = ${JSON.stringify(metadata, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.postMetadata = postMetadata;
} else {
  window.postMetadata = postMetadata;
}
`;

  fs.writeFileSync(metaPath, fixedOutput, "utf8");
  console.log("✅ Fixed post-meta.js for Node.js + Browser compatibility");
} catch (err) {
  console.error("❌ Failed to parse metadata JSON:", err.message);
  process.exit(1);
}