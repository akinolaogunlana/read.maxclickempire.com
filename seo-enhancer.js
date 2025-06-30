<script>
// ✅ MaxClickEmpire Supreme SEO Enhancer by Ogunlana Akinola Okikiola

(function () {
  const slug = location.pathname.split("/").pop().replace(".html", "");
  const contentEl = document.querySelector("article") || document.body;
  const textContent = contentEl.innerText || document.body.innerText;
  const meta = window.postMetadata?.[slug] || {
    title: document.title,
    description:
      document.querySelector("meta[name='description']")?.content ||
      "MaxClickEmpire — Empower your digital journey with free tools, guides, and strategies.",
    image: document.querySelector("img")?.src || "/assets/cover.jpg",
    published: new Date().toISOString()
  };

  // === 🧹 Remove existing social meta
  const removeOld = [
    "og:title", "og:description", "og:url", "og:type", "og:image",
    "twitter:title", "twitter:description", "twitter:image", "twitter:card"
  ];
  removeOld.forEach(name => {
    document.querySelector(`meta[property='${name}'], meta[name='${name}']`)?.remove();
  });

  // === 🔍 Inject Meta
  const injectMeta = (name, content, attr = "name") => {
    const metaTag = document.createElement("meta");
    metaTag.setAttribute(attr, name);
    metaTag.setAttribute("content", content);
    document.head.appendChild(metaTag);
  };
  document.title = meta.title;
  injectMeta("description", meta.description);
  injectMeta("og:title", meta.title, "property");
  injectMeta("og:description", meta.description, "property");
  injectMeta("og:type", "article", "property");
  injectMeta("og:url", location.href, "property");
  injectMeta("og:image", meta.image, "property");
  injectMeta("twitter:card", "summary_large_image");
  injectMeta("twitter:title", meta.title);
  injectMeta("twitter:description", meta.description);
  injectMeta("twitter:image", meta.image);

  // === 🧠 Schema Injection
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    image: meta.image,
    author: { "@type": "Person", name: "Ogunlana Akinola Okikiola" },
    datePublished: meta.published,
    publisher: {
      "@type": "Organization",
      name: "MaxClickEmpire",
      logo: {
        "@type": "ImageObject",
        url: "/assets/favicon.png"
      }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": location.href }
  };
  const schemaScript = document.createElement("script");
  schemaScript.type = "application/ld+json";
  schemaScript.textContent = JSON.stringify(schema);
  document.head.appendChild(schemaScript);

  // === 📑 TOC Generator
  const headers = document.querySelectorAll("article h2, article h3");
  if (headers.length) {
    const toc = document.createElement("div");
    toc.id = "toc";
    toc.innerHTML = "<h2>📑 Table of Contents</h2><ul></ul>";
    const ul = toc.querySelector("ul");
    headers.forEach((h, i) => {
      const id = `toc-${i}`;
      h.id = id;
      const li = document.createElement("li");
      li.innerHTML = `<a href="#${id}">${h.innerText}</a>`;
      ul.appendChild(li);
    });
    contentEl.insertAdjacentElement("afterbegin", toc);
  }

  // === 🔗 Manual Internal Link Injector
  const relatedLinks = [
    { keyword: "Google Docs", url: "/posts/google-docs-template-guide.html" },
    { keyword: "Google Docs planner", url: "/posts/google-docs-template-guide.html" },
    { keyword: "Google Docs invoice template", url: "/posts/google-docs-invoice-template.html" },
    { keyword: "Google Docs resume", url: "/posts/google-docs-resume-templates.html" },
    { keyword: "Google Docs lesson plan", url: "/posts/lesson-plan-templates.html" },
    { keyword: "Google Docs checklist", url: "/posts/google-docs-checklist-templates.html" },
    { keyword: "Google Docs calendar", url: "/posts/google-docs-calendar-templates.html" },
    { keyword: "Google Docs portfolio", url: "/posts/google-docs-portfolio-guide.html" },
    { keyword: "affiliate marketing", url: "/posts/affiliate-marketing-for-beginners.html" },
    { keyword: "OpenAI", url: "/posts/openai-tools.html" },
    { keyword: "SEO tools", url: "/posts/best-seo-tools.html" },
    { keyword: "content strategy", url: "/posts/advanced-content-strategy.html" },
    { keyword: "digital business", url: "/posts/digital-business-blueprint.html" },
    { keyword: "email marketing", url: "/posts/email-marketing-guide.html" },
    { keyword: "AI tools", url: "/posts/ai-tools-for-creators.html" },
    { keyword: "blogging for beginners", url: "/posts/blogging-for-beginners.html" }
  ];

  document.querySelectorAll("article p").forEach(p => {
    relatedLinks.forEach(({ keyword, url }) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      if (!p.innerHTML.includes(url)) {
        p.innerHTML = p.innerHTML.replace(regex, match =>
          `<a href="${url}" title="Learn more about ${match}">${match}</a>`
        );
      }
    });
  });

  // === 🤖 Auto Keyword Tag Generator
  const stopWords = new Set([
    "the", "and", "to", "of", "in", "for", "on", "is", "with", "this", "by", "an", "at", "from", "that"
  ]);
  const wordFreq = {};
  textContent.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).forEach(word => {
    if (!stopWords.has(word) && word.length > 2) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  const topTags = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  if (!document.querySelector('meta[name="keywords"]')) {
    const metaTag = document.createElement("meta");
    metaTag.name = "keywords";
    metaTag.content = topTags.join(", ");
    document.head.appendChild(metaTag);
  }

  // === 💸 Ad Injector (after 2nd paragraph)
  const paras = document.querySelectorAll("article p");
  const adHTML = `
    <div style="text-align:center;margin:20px 0">
      <!-- Replace with your AdSense Code -->
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-XXXX"
           data-ad-slot="0000000000"
           data-ad-format="auto"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>
  `;
  if (paras.length >= 3) {
    paras[2].insertAdjacentHTML("afterend", adHTML);
  }

  console.log("🔍 Auto Tags:", topTags.join(", "));
})();
</script>
