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
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(slug)) return;

    const article = document.querySelector("article");
    if (!article) return;

    // ✅ Cleanup
    article.querySelectorAll("h1").forEach(el => el.remove());
    article.querySelector(".post-hero")?.remove();
    article.querySelector("#toc")?.remove();
    article.querySelector(".social-share")?.remove();

    const meta = {
      title: window.postMetadata?.[slug]?.title || document.title,
      description: window.postMetadata?.[slug]?.description || "Digital strategy and free tools.",
      image: window.postMetadata?.[slug]?.image || document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: window.postMetadata?.[slug]?.published || new Date().toISOString()
    };

    // ✅ Clean & Inject SEO Meta
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
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // ✅ Structured Data
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

    // ✅ Hero Section (No Title)
    const hero = document.createElement("section");
    hero.className = "post-hero";
    hero.innerHTML = `
      <div style="background: linear-gradient(to right, #f5f7fa, #e4ecf3); border-radius: 20px; padding: 2rem; text-align: center; margin-bottom: 2rem;">
        <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
        <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
        <img src="${meta.image}" alt="Post image" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
      </div>`;
    article.insertAdjacentElement("afterbegin", hero);

    // ✅ Title (above TOC only)
    const titleH1 = document.createElement("h1");
    titleH1.textContent = meta.title;
    titleH1.style = "font-size:2rem;margin-bottom:1rem;color:#222;";
    article.insertBefore(titleH1, article.firstElementChild.nextElementSibling);

    // ✅ Social Share Buttons
    const share = document.createElement("div");
    share.className = "social-share";
    share.style = "text-align:center;margin:1.5rem 0;font-size:1rem;";
    const encodedURL = encodeURIComponent(location.href);
    const encodedTitle = encodeURIComponent(meta.title);
    share.innerHTML = `
      <strong>Share:</strong>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedURL}" target="_blank" style="margin:0 0.5rem;">🔗 Facebook</a>
      <a href="https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedTitle}" target="_blank" style="margin:0 0.5rem;">🐦 Twitter</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedURL}" target="_blank" style="margin:0 0.5rem;">💼 LinkedIn</a>
    `;
    article.insertBefore(share, article.firstElementChild.nextElementSibling.nextElementSibling);

    // ✅ TOC
    const headings = article.querySelectorAll("h2, h3");
    if (headings.length) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2>📚 Table of Contents</h2><ul style="padding-left:1rem;"></ul>`;
      const ul = toc.querySelector("ul");
      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        ul.innerHTML += `<li><a href="#${id}">${h.textContent}</a></li>`;
      });
      article.insertBefore(toc, titleH1.nextElementSibling.nextElementSibling);
    }

    // ✅ Footer (if missing)
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

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  }
})();