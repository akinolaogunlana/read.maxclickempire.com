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

    // Extract meta
    const meta = (window.postMetadata && window.postMetadata[slug]) || {
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "Digital strategy and free tools.",
      image: document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: new Date().toISOString(),
    };

    // Remove existing meta tags
    const tagsToRemove = [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ];
    tagsToRemove.forEach(name => {
      const tag = document.querySelector(`meta[property='${name}'], meta[name='${name}']`);
      if (tag) tag.remove();
    });

    // Inject meta
    function injectMeta(name, content, attr = "name") {
      if (!content) return;
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    }

    if (!document.querySelector("meta[charset]")) {
      const charset = document.createElement("meta");
      charset.setAttribute("charset", "UTF-8");
      document.head.prepend(charset);
    }

    if (!document.querySelector("meta[name='viewport']")) {
      injectMeta("viewport", "width=device-width, initial-scale=1.0");
    }

    document.title = meta.title;
    injectMeta("description", meta.description);
    const keywords = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, "")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10)
      .join(", ");
    injectMeta("keywords", keywords);

    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");

    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // JSON-LD Schema
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
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
        logo: { "@type": "ImageObject", url: "/assets/favicon.png" }
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": location.href }
    });
    document.head.appendChild(ld);

    // DOM content enhancement
    const article = document.querySelector("article");
    if (!article) return;

    const h1 = article.querySelector("h1");
    if (h1) h1.remove();

    // Add Navigation
    if (!document.querySelector("nav.site-nav")) {
      const nav = document.createElement("nav");
      nav.className = "site-nav";
      nav.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;background:#ffffff;border-bottom:1px solid #eee;">
          <a href="/" style="font-weight:700;font-size:1.2rem;color:#222;text-decoration:none;">📘 MaxClickEmpire</a>
          <div>
            <a href="/" style="margin-right:1rem;color:#333;text-decoration:none;">Home</a>
            <a href="/about.html" style="margin-right:1rem;color:#333;text-decoration:none;">About</a>
            <a href="/contact.html" style="color:#333;text-decoration:none;">Contact</a>
          </div>
        </div>
      `;
      document.body.insertAdjacentElement("afterbegin", nav);
    }

    // Hero section
    if (!document.querySelector(".post-hero")) {
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
          <img src="${meta.image}" alt="${meta.title}" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
        </div>
      `;
      article.insertAdjacentElement("afterbegin", hero);
    }

    // Table of Contents (non-sticky)
    const headings = article.querySelectorAll("h2, h3");
    if (headings.length && !document.querySelector("#toc")) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2>📚 Table of Contents</h2><ul style="padding-left:1rem;"></ul>`;
      const ul = toc.querySelector("ul");

      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
        ul.appendChild(li);
      });

      article.insertAdjacentElement("afterbegin", toc);
    }

    // Related posts
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
        const relatedBlock = document.createElement("section");
        relatedBlock.id = "related-posts";
        relatedBlock.innerHTML = `
          <h2>🔗 Related Posts</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
            ${related.map(([slug, data]) => `
              <a href="/posts/${slug}.html" style="flex:1 1 30%;text-decoration:none;border:1px solid #ccc;border-radius:8px;padding:1rem;">
                <strong>${data.title}</strong><br/>
                <small style="color:#777;">${data.description.slice(0, 100)}...</small>
              </a>
            `).join("")}
          </div>
        `;
        article.appendChild(relatedBlock);
      }
    }

    // Footer
    if (!document.querySelector("footer.site-footer")) {
      const footer = document.createElement("footer");
      footer.className = "site-footer";
      footer.innerHTML = `
        <div style="text-align:center;padding:2rem;color:#888;font-size:0.9rem;border-top:1px solid #eee;margin-top:3rem;">
          &copy; ${new Date().getFullYear()} MaxClickEmpire. All rights reserved. |
          <a href="/privacy-policy.html" style="color:#666;">Privacy Policy</a>
        </div>
      `;
      document.body.appendChild(footer);
    }

    // Dark mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // Debug
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  });
})();