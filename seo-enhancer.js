<script>
  // ✅ GitHub SEO & Engagement Injector v2.0 by MaxClickEmpire
  (function () {
    const slug = location.pathname.split("/").pop().replace(".html", "");

    // Load post metadata
    const meta = window.postMetadata?.[slug] || {
      title: document.title,
      description:
        document.querySelector("meta[name='description']")?.content ||
        "MaxClickEmpire — Empower your digital journey with free tools, guides, and strategies.",
      image:
        document.querySelector("img")?.src || "/assets/cover.jpg",
      published: new Date().toISOString(),
    };

    // Remove old tags
    const removeOld = [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card"
    ];
    removeOld.forEach((name) => {
      document
        .querySelector(`meta[property='${name}'], meta[name='${name}']`)
        ?.remove();
    });

    // Inject meta tags
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

    // ✅ JSON-LD schema
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

    // ✅ Hero Block Injection
    const article = document.querySelector("article");
    if (article && !document.querySelector(".post-hero")) {
      const hero = document.createElement("section");
      hero.className = "post-hero";
      hero.innerHTML = `
        <div class="hero-inner" style="text-align:center; padding:2rem; background:#f8f8f8; margin-bottom:2rem; border-radius:12px;">
          <h1 class="hero-title" style="font-size:2rem;">${meta.title}</h1>
          <p class="hero-meta">📅 Published: ${meta.published.split("T")[0]}</p>
          <p class="hero-description" style="max-width:700px; margin:auto;">${meta.description}</p>
          <img src="${meta.image}" alt="Hero image" style="max-width:100%; margin-top:1rem;" loading="lazy"/>
        </div>
      `;
      article.insertAdjacentElement("afterbegin", hero);
    }

    // ✅ Table of Contents
    const headings = document.querySelectorAll("article h2, article h3");
    if (headings.length) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2>📑 Table of Contents</h2><ul></ul>`;
      const ul = toc.querySelector("ul");
      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}">${h.innerText}</a>`;
        ul.appendChild(li);
      });
      article?.insertAdjacentElement("afterbegin", toc);
    }

    // ✅ Internal Links
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
      { keyword: "SEO tools", url: "/posts/best-seo-tools.html" },
      { keyword: "content strategy", url: "/posts/advanced-content-strategy.html" },
      { keyword: "digital business", url: "/posts/digital-business-blueprint.html" },
      { keyword: "email marketing", url: "/posts/email-marketing-guide.html" },
      { keyword: "AI tools", url: "/posts/ai-tools-for-creators.html" },
      { keyword: "blogging for beginners", url: "/posts/blogging-for-beginners.html" }
    ];

    document.querySelectorAll("article p").forEach((p) => {
      relatedLinks.forEach(({ keyword, url }) => {
        const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
        if (!p.innerHTML.includes(url)) {
          p.innerHTML = p.innerHTML.replace(
            regex,
            (match) =>
              `<a href="${url}" title="Learn more about ${match}">${match}</a>`
          );
        }
      });
    });

    // ✅ Ad Injector (after 2nd paragraph)
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
      </div>`;
    if (paras.length >= 3) {
      paras[2].insertAdjacentHTML("afterend", adHTML);
    }
  })();
</script>
