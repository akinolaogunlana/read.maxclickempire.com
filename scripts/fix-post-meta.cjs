// scripts/fix-post-meta.cjs
const fs = require("fs");
const path = require("path");

const metaPath = path.join(__dirname, "..", "data", "post-meta.js");

// Load the original post-meta.js file
const raw = fs.readFileSync(metaPath, "utf8");

// Extract JSON from window.postMetadata = {...};
const match = raw.match(/window\.postMetadata\s*=\s*(\{[\s\S]*\});?/);

if (!match) {
  console.error("❌ Could not find postMetadata object in post-meta.js");
  process.exit(1);
}

const metadataJson = match[1];

let metadata;
try {
  metadata = JSON.parse(metadataJson);
} catch (err) {
  console.error("❌ Failed to parse post metadata JSON:", err.message);
  process.exit(1);
}

// Rewrite the file in Node.js compatible format
const fixed = `// Auto-fixed for Node.js compatibility

const postMetadata = ${JSON.stringify(metadata, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.postMetadata = postMetadata;
} else {
  window.postMetadata = postMetadata;
}
`;

fs.writeFileSync(metaPath, fixed, "utf8");
console.log("✅ Fixed post-meta.js for Node.js + Browser compatibility");
