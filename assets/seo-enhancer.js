(function () {
  function waitFor(conditionFn, callback, interval = 50, timeout = 2000) {
    console.log("✅ seo-enhancer.js is running");
    const start = Date.now();
    const poll = () => {
      if (conditionFn()) return callback();
      if (Date.now() - start >= timeout) return console.warn("⏳ postMetadata not loaded in time.");
      setTimeout(poll, interval);
    };
    poll();
  }

  function waitForDom(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  waitForDom(() => {
    waitFor(() => !!window.postMetadata, initSeoEnhancer);
  });

  function initSeoEnhancer() {
    const slug = location.pathname.replace(/^\/|\/$/g, "").split("/").pop().replace(".html", "");
    const pathSlug = location.pathname.replace(/^\/+/, "").replace(/\.html$/, "");
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(pathSlug)) return;

    const article = document.querySelector("article");
    if (!article) return;

    // ✅ Remove any previous injected sections
    article.querySelectorAll("h1").forEach(el => el.remove());
    article.querySelector(".post-hero")?.remove();
    article.querySelector("#toc")?.remove();

    const meta = {
      title: window.postMetadata?.[slug]?.title || document.title,
      description: window.postMetadata?.[slug]?.description || "Digital strategy and free tools.",
      image: window.postMetadata?.[slug]?.image || document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: window.postMetadata?.[slug]?.published || new Date().toISOString(),
      canonical: window.postMetadata?.[slug]?.canonical || location.href
    };

    // ✅ Inject meta tags (clean old ones)
    [
      "og:title", "og:description", "og:url", "og:type", "og:image",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card", "keywords"
    ].forEach(name => {
      document.querySelectorAll(`meta[property='${name}'], meta[name='${name}']`).forEach(el => el.remove());
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
    injectMeta("keywords", meta.title.toLowerCase().split(/\s+/).slice(0, 10).join(", "));
    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", meta.canonical, "property");
    injectMeta("og:image", meta.image, "property");
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

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
      mainEntityOfPage: { "@type": "WebPage", "@id": meta.canonical }
    });
    document.head.appendChild(ld);

    // ✅ Insert Title and TOC
    const titleH1 = document.createElement("h1");
    titleH1.textContent = meta.title;
    titleH1.style = "font-size:2rem;margin-bottom:1rem;color:#222;";

    const headings = article.querySelectorAll("h2, h3");
    let toc = null;
    if (headings.length) {
      toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2>📚 Table of Contents</h2><ul style="padding-left:1rem;"></ul>`;
      const ul = toc.querySelector("ul");
      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        ul.innerHTML += `<li><a href="#${id}">${h.textContent}</a></li>`;
      });
    }

    if (toc) {
      article.insertAdjacentElement("afterbegin", toc);
      article.insertBefore(titleH1, toc);
    } else {
      article.insertAdjacentElement("afterbegin", titleH1);
    }

    // ✅ Inject Hero (No Title)
    const hero = document.createElement("section");
    hero.className = "post-hero";
    hero.innerHTML = `
      <div style="background: linear-gradient(to right, #f5f7fa, #e4ecf3); border-radius: 20px; padding: 2rem; text-align: center; margin-bottom: 2.5rem;">
        <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
        <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
        <div class="share-buttons" style="margin-top: 1rem;">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(meta.canonical)}" target="_blank" style="margin-right:10px;">🔗 Facebook</a>
          <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(meta.canonical)}&text=${encodeURIComponent(meta.title)}" target="_blank" style="margin-right:10px;">🐦 Twitter</a>
          <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(meta.canonical)}" target="_blank">💼 LinkedIn</a>
        </div>
        <img src="${meta.image}" alt="Post image" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
      </div>`;
    article.insertAdjacentElement("afterbegin", hero);

    // ✅ Navigation
    if (!document.querySelector("header.site-header")) {
      const nav = document.createElement("header");
      nav.className = "site-header";
      nav.innerHTML = `
        <nav style="background:#fff;border-bottom:1px solid #eee;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;position:sticky;top:0;z-index:999;">
          <a href="/" style="font-weight:bold;color:#222;text-decoration:none;font-size:1.2rem;">🧠MaxClickEmpire</a>
          <ul style="display:flex;gap:1.5rem;list-style:none;margin:0;padding:0;">
            <li><a href="/" style="color:#444;text-decoration:none;">Home</a></li>
            <li><a href="/about.html" style="color:#444;text-decoration:none;">About</a></li>
            <li><a href="/contact.html" style="color:#444;text-decoration:none;">Contact</a></li>
          </ul>
        </nav>`;
      document.body.insertAdjacentElement("afterbegin", nav);
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
          </div>`;
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
        </div>`;
      document.body.appendChild(footer);
    }

    // ✅ Dark mode
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  }
})();