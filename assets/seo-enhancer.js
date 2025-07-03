// ✅ MaxClickEmpire SEO Enhancer v3.0
(function () {
  const waitForDom = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  waitForDom(() => {
    const slug = location.pathname.split("/").pop().replace(".html", "");
    const meta = window.postMetadata?.[slug] || {
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "Digital strategy and free tools.",
      image: document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: new Date().toISOString(),
    };

    const removeOld = [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card"
    ];
    removeOld.forEach(name => document.querySelector(`meta[property='${name}'], meta[name='${name}']`)?.remove());

    const injectMeta = (name, content, attr = "name") => {
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
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
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify(schema);
    document.head.appendChild(ld);

    const article = document.querySelector("article");
    if (article && !document.querySelector(".post-hero")) {
      const hero = document.createElement("section");
      hero.className = "post-hero";
      hero.innerHTML = `
        <div style="text-align:center;padding:2rem;background:#f9f9f9;border-radius:10px;margin-bottom:2rem">
          <h1 style="font-size:2rem">${meta.title}</h1>
          <p>📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:auto">${meta.description}</p>
          <img src="${meta.image}" alt="Cover" style="max-width:100%;margin-top:1rem" loading="lazy"/>
        </div>
      `;
      article.insertAdjacentElement("afterbegin", hero);
    }

    const headings = article?.querySelectorAll("h2, h3") || [];
    if (headings.length && !document.querySelector("#toc")) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2>📑 Table of Contents</h2><ul></ul>`;
      const ul = toc.querySelector("ul");
      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
        ul.appendChild(li);
      });
      article?.insertAdjacentElement("afterbegin", toc);
    }

    const relatedLinks = window.relatedLinks || [
      { keyword: "Google Docs", url: "/posts/google-docs-template-guide.html" },
      { keyword: "affiliate marketing", url: "/posts/affiliate-marketing-for-beginners.html" },
      { keyword: "SEO tools", url: "/posts/best-seo-tools.html" }
    ];

    document.querySelectorAll("article p").forEach(p => {
      relatedLinks.forEach(({ keyword, url }) => {
        const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
        if (!p.innerHTML.includes(url)) {
          p.innerHTML = p.innerHTML.replace(regex, `<a href='${url}' title='Learn more about $1'>$1</a>`);
        }
      });
    });

    const paras = article?.querySelectorAll("p") || [];
    const ad = `
      <div style="text-align:center;margin:2rem 0">
        <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX" data-ad-slot="0000000000" data-ad-format="auto"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
    if (paras.length >= 3) paras[2].insertAdjacentHTML("afterend", ad);

    // Related Post Recommender (bottom)
    if (!document.querySelector("#related-posts") && window.postMetadata) {
      const currentKeywords = [meta.title, meta.description].join(" ").toLowerCase();
      const related = Object.entries(window.postMetadata).filter(([slug, data]) =>
        slug !== location.pathname.split("/").pop().replace(".html", "") &&
        (data.title.toLowerCase().includes(currentKeywords) ||
        data.description.toLowerCase().includes(currentKeywords))
      ).slice(0, 3);

      if (related.length) {
        const relatedBlock = document.createElement("div");
        relatedBlock.id = "related-posts";
        relatedBlock.innerHTML = `<h3>🔗 Related Posts</h3><ul>${related.map(([slug, data]) => `
          <li><a href="/posts/${slug}.html">${data.title}</a></li>`).join("\n")}</ul>`;
        article?.appendChild(relatedBlock);
      }
    }
  });
})();
