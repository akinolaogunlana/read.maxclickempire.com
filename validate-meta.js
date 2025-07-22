// validate-meta.js

const { postMetadata } = require("./data/post-meta.js");

function validateUniqueMeta() {
  const titles = new Map();
  const descriptions = new Map();
  let isValid = true;

  for (const slug in postMetadata) {
    const meta = postMetadata[slug];

    const t = (meta.title || "").trim().toLowerCase();
    const d = (meta.description || "").trim().toLowerCase();

    if (titles.has(t)) {
      console.error(`❌ Duplicate title found in "${slug}" and "${titles.get(t)}": "${meta.title}"`);
      isValid = false;
    } else {
      titles.set(t, slug);
    }

    if (descriptions.has(d)) {
      console.error(`❌ Duplicate description found in "${slug}" and "${descriptions.get(d)}": "${meta.description}"`);
      isValid = false;
    } else {
      descriptions.set(d, slug);
    }
  }

  if (!isValid) {
    console.error("\n🚫 Metadata validation failed due to duplicates.");
    process.exit(1); // Stop the build
  } else {
    console.log("✅ Metadata validation passed. No duplicates found.");
  }
}

module.exports = { validateUniqueMeta };
