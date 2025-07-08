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

// Case 1: Starts with `window.postMetadata = {...}`
const windowMatch = raw.match(/window\.postMetadata\s*=\s*(\{[\s\S]*\});?/);

// Case 2: Starts with `const postMetadata = {...}`
const constMatch = raw.match(/const\s+postMetadata\s*=\s*(\{[\s\S]*\});?/);

if (windowMatch) {
  metadataJson = windowMatch[1];
} else if (constMatch) {
  metadataJson = constMatch[1];
} else {
  console.error("❌ Could not find postMetadata object in post-meta.js");
  process.exit(1);
}

let metadata;
try {
  metadata = JSON.parse(metadataJson);
} catch (err) {
  console.error("❌ Failed to parse metadata JSON:", err.message);
  process.exit(1);
}

// Final output (dual compatible)
const fixed = `// Auto-fixed for Node.js and Browser use

const postMetadata = ${JSON.stringify(metadata, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports.postMetadata = postMetadata;
} else {
  window.postMetadata = postMetadata;
}
`;

fs.writeFileSync(metaPath, fixed, "utf8");
console.log("✅ Fixed post-meta.js for Node.js + Browser compatibility");