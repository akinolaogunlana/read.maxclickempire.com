(function () {
  function waitForDom(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  waitForDom(() => {
    const slug = location.pathname.split("/").pop()?.replace(".html", "") || "";
    const pathSlug = location.pathname.replace(/^\/+/, "").replace(/\.html$/, "");
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(pathSlug)) return;

    const article = document.querySelector("article");
    if (!article) return;

    // ✅ Insert Navigation
    if (!document.querySelector("header.site-header")) {
      const nav = document.createElement("header");
      nav.className = "site-header";
      nav.innerHTML = `
        <nav style="background:#fff;border-bottom:1px solid #eee;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;position:sticky;top:0;z-index:999;">
          <a href="/" style="font-weight:bold;color:#222;text-decoration:none;font-size:1.2rem;">🚀 MaxClickEmpire</a>
          <ul style="display:flex;gap:1.5rem;list-style:none;margin:0;padding:0;">
            <li><a href="/" style="color:#444;text-decoration:none;">Home</a></li>
            <li><a href="/about.html" style="color:#444;text-decoration:none;">About</a></li>
            <li><a href="/contact.html" style="color:#444;text-decoration:none;">Contact</a></li>
            <li><a href="/privacy-policy.html" style="color:#444;text-decoration:none;">Privacy</a></li>
          </ul>
        </nav>
      `;
      document.body.insertAdjacentElement("afterbegin", nav);
    }

    // ✅ SEO Metadata
    let h1 = article.querySelector("h1");
    const titleText = h1?.textContent.trim() || document.title;
    const desc = document.querySelector("meta[name='description']")?.content || "Digital strategy and free tools.";
    const firstImg = article.querySelector("img");
    const image = firstImg?.src || "/assets/og-image.jpg";

    const meta = (window.postMetadata && window.postMetadata[slug]) || {
      title: titleText,
      description: desc,
      image,
      published: new Date().toISOString()
    };

    // ✅ Remove existing meta tags
    [
      "og:title", "og:description", "og:url", "og:type", "og:image",
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

    // ✅ Structured Data (JSON-LD)
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

    // ✅ Hero Section
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
          <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
          <img src="${meta.image}" alt="Post image" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
        </div>
      `;
      const h1Clone = h1.cloneNode(true);
      h1.remove();
      hero.querySelector("div").insertAdjacentElement("afterbegin", h1Clone);
      article.insertAdjacentElement("afterbegin", hero);
    }

    // ✅ Table of Contents
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

    // ✅ Related Posts
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

    // ✅ Footer
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

    // ✅ Dark mode support
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // ✅ Debug
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  });
})();