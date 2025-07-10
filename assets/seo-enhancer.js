(function () {
  function waitForDom(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  waitForDom(() => {
    const slug = location.pathname.split("/").pop()?.replace(".html", "");
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(slug)) return;

    const meta = (window.postMetadata && window.postMetadata[slug]) || {
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "Free digital resources by MaxClickEmpire.",
      image: document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: new Date().toISOString()
    };

    // Remove outdated tags
    [
      "og:title", "og:description", "og:image", "og:url",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      if (el) el.remove();
    });

    const injectMeta = (name, content, attr = "name") => {
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    };

    // Inject SEO metadata
    injectMeta("description", meta.description);
    const keywordList = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, "")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10)
      .join(", ");
    injectMeta("keywords", keywordList);

    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");

    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // Structured Data
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: meta.description,
      image: meta.image,
      datePublished: meta.published,
      author: {
        "@type": "Person",
        name: "Ogunlana Akinola Okikiola"
      },
      publisher: {
        "@type": "Organization",
        name: "MaxClickEmpire",
        logo: {
          "@type": "ImageObject",
          url: "/assets/favicon.png"
        }
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": location.href
      }
    });
    document.head.appendChild(ld);

    const article = document.querySelector("article");
    if (!article) return;

    // Hero Section
    if (!document.querySelector(".post-hero")) {
      const hero = document.createElement("section");
      hero.className = "post-hero";
      hero.innerHTML = `
        <div style="
          background: linear-gradient(to right, #f5f7fa, #e4ecf3);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 4px 25px rgba(0,0,0,0.05);
          margin-bottom: 2.5rem;
        ">
          <h1 style="font-size:2.3rem;font-weight:700;color:#1a1a1a;">${meta.title}</h1>
          <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
          <img src="${meta.image}" alt="${meta.title}" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
        </div>
      `;
      article.insertAdjacentElement("afterbegin", hero);
    }

    // Non-Sticky Table of Contents
    const headings = article.querySelectorAll("h2, h3");
    if (headings.length && !document.querySelector("#toc")) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.style = "margin-bottom:2rem;padding:1rem;border-left:4px solid #4a90e2;background:#f9f9f9;border-radius:8px;";
      toc.innerHTML = `<h2 style="margin-bottom:0.5rem;">📚 Table of Contents</h2><ul style="list-style:none;padding-left:1rem;"></ul>`;
      const ul = toc.querySelector("ul");

      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}" style="text-decoration:none;color:#333;">${h.textContent}</a>`;
        ul.appendChild(li);
      });

      article.insertAdjacentElement("afterbegin", toc);
    }

    // Related Posts (Cards)
    if (!document.querySelector("#related-posts") && window.postMetadata) {
      const currentKeywords = (meta.title + " " + meta.description).toLowerCase();
      const related = Object.entries(window.postMetadata)
        .filter(([key, data]) =>
          key !== slug &&
          (data.title.toLowerCase().includes(currentKeywords) ||
           data.description.toLowerCase().includes(currentKeywords))
        )
        .slice(0, 3);

      if (related.length) {
        const relatedBlock = document.createElement("div");
        relatedBlock.id = "related-posts";
        relatedBlock.innerHTML = `
          <h3 style="margin-top:3rem;">🔗 Related Posts</h3>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            ${related.map(([slug, data]) => `
              <a href="/posts/${slug}.html" style="flex:1 1 30%;text-decoration:none;border:1px solid #eee;padding:1rem;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.03);transition:all 0.3s;">
                <strong style="color:#1a1a1a">${data.title}</strong>
                <p style="font-size:0.9rem;color:#555;">${data.description.slice(0, 100)}...</p>
              </a>
            `).join("")}
          </div>`;
        article.appendChild(relatedBlock);
      }
    }
  });
})();