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
    const pathSlug = location.pathname.replace(/^\/+/, "").replace(/\.html$/, "");
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(pathSlug)) return;

    const h1 = document.querySelector("article h1");
    const descMeta = document.querySelector("meta[name='description']");
    const image = document.querySelector("img")?.src || "/assets/og-image.jpg";

    const meta = {
      title: h1?.textContent.trim() || document.title,
      description: descMeta?.content || "Digital strategy and free tools.",
      image,
      published: new Date().toISOString()
    };

    // Remove duplicate meta tags
    [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const tag = document.querySelector(`meta[property='${name}'], meta[name='${name}']`);
      if (tag) tag.remove();
    });

    function injectMeta(name, content, attr = "name") {
      if (!content) return;
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    }

    document.title = meta.title;
    injectMeta("description", meta.description);
    injectMeta("keywords", meta.title.toLowerCase().replace(/[^a-z0-9\s]/gi, "").split(/\s+/).filter(w => w.length > 2).slice(0, 10).join(", "));
    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // JSON-LD
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: meta.description,
      image: meta.image,
      author: {
        "@type": "Person",
        name: "Ogunlana Akinola Okikiola"
      },
      datePublished: meta.published,
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

    // Hero section
    if (h1 && !document.querySelector(".post-hero")) {
      const hero = document.createElement("section");
      hero.className = "post-hero";
      hero.innerHTML = `
        <div style="
          background: linear-gradient(to right, #f5f7fa, #e4ecf3);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          margin-bottom: 2.5rem;
        ">
          <h1 style="font-size:2.3rem;font-weight:700;color:#1a1a1a;">${meta.title}</h1>
          <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
        </div>
      `;
      h1.remove();
      article.insertAdjacentElement("afterbegin", hero);
    }

    // Sticky TOC
    const headings = article.querySelectorAll("h2, h3");
    if (headings.length && !document.querySelector("#toc")) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.style.cssText = `
        position: sticky;
        top: 1rem;
        background: #fff;
        border-left: 4px solid #4b6cb7;
        padding: 1rem;
        margin-bottom: 2rem;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
        border-radius: 8px;
        max-width: 300px;
        font-size: 0.95rem;
      `;
      toc.innerHTML = `<h2 style="margin-top:0;">📚 Table of Contents</h2><ul style="padding-left:1rem;margin:0;"></ul>`;
      const ul = toc.querySelector("ul");

      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}" style="text-decoration:none;color:#2a2a2a;">${h.textContent}</a>`;
        ul.appendChild(li);
      });

      article.insertAdjacentElement("afterbegin", toc);
    }

    // Related post cards
    if (!document.querySelector("#related-posts") && window.postMetadata) {
      const related = Object.entries(window.postMetadata)
        .filter(([key, data]) =>
          key !== slug &&
          (meta.title.toLowerCase().includes(key) ||
           data.title.toLowerCase().includes(meta.title.toLowerCase()))
        )
        .slice(0, 3);

      if (related.length) {
        const relatedSection = document.createElement("section");
        relatedSection.id = "related-posts";
        relatedSection.innerHTML = `
          <h2 style="margin-top:3rem;">🔗 Related Posts</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
            ${related.map(([key, data]) => `
              <a href="/posts/${key}.html" style="flex:1 1 30%;text-decoration:none;border:1px solid #ccc;border-radius:8px;padding:1rem;transition:0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <strong>${data.title}</strong><br/>
                <small style="color:#777;">${data.description.slice(0, 100)}...</small>
              </a>
            `).join("")}
          </div>
        `;
        article.appendChild(relatedSection);
      }
    }

    // Dark Mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // Debug
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  });
})();