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

    // Load metadata
    const meta = (window.postMetadata && window.postMetadata[slug]) || {
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "",
      image: document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: new Date().toISOString(),
    };

    // Remove old meta tags
    [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const tag = document.querySelector(`meta[property='${name}'], meta[name='${name}']`);
      if (tag) tag.remove();
    });

    // Inject new meta tags
    function injectMeta(name, content, attr = "name") {
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

    // JSON-LD Schema
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
        logo: { "@type": "ImageObject", url: "/assets/favicon.png" }
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": location.href }
    };
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify(schema);
    document.head.appendChild(ld);

    const article = document.querySelector("article");
    if (!article) return;

    // 🧠 Do NOT create a new hero; just style existing h1 and intro if needed
    const h1 = article.querySelector("h1");
    const firstPara = article.querySelector("p");

    if (h1 && !document.querySelector(".post-hero")) {
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
          <h1 style="font-size:2.3rem;font-weight:700;color:#1a1a1a;">${h1.textContent}</h1>
          <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${firstPara?.textContent || meta.description}</p>
          <img src="${meta.image}" alt="${h1.textContent}" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
        </div>
      `;
      article.insertBefore(hero, h1);
      h1.remove(); // Move h1 into hero
      if (firstPara?.textContent === meta.description) firstPara.remove(); // Optional
    }

    // TOC
    const headings = article.querySelectorAll("h2, h3");
    if (headings.length && !document.querySelector("#toc")) {
      const toc = document.createElement("div");
      toc.id = "toc";
      toc.innerHTML = `<h2 style="margin-bottom:0.5rem;">📚 Table of Contents</h2><ul style="padding-left:1rem;"></ul>`;
      const ul = toc.querySelector("ul");
      headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
        ul.appendChild(li);
      });
      article.insertBefore(toc, article.firstChild);
    }

    // Footer (append once only)
    if (!document.querySelector("footer")) {
      const footer = document.createElement("footer");
      footer.style = "margin-top:4rem;padding:2rem 0;text-align:center;color:#666;font-size:0.9rem;border-top:1px solid #ddd";
      footer.innerHTML = `© ${new Date().getFullYear()} MaxClickEmpire. All rights reserved. <a href="/privacy-policy.html">Privacy Policy</a>`;
      document.body.appendChild(footer);
    }

    // Navigation (prepend once only)
    if (!document.querySelector("nav")) {
      const nav = document.createElement("nav");
      nav.style = "background:#fff;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.05)";
      nav.innerHTML = `
        <div style="font-weight:700;font-size:1.2rem;color:#333;">📘 MaxClickEmpire</div>
        <div style="display:flex;gap:1rem;">
          <a href="/" style="color:#333;">Home</a>
          <a href="/about.html" style="color:#333;">About</a>
          <a href="/contact.html" style="color:#333;">Contact</a>
        </div>`;
      document.body.insertBefore(nav, document.body.firstChild);
    }

    // Dark mode auto
    const darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (darkMode) {
      document.body.classList.add("dark-theme");
    }
  });
})();