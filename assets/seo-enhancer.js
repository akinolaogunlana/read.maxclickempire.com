(function () {
  function waitForDom(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  waitForDom(() => {
    const slug = location.pathname.split("/").pop()?.replace(".html", "") || "index";
    const pathSlug = slug.toLowerCase();
    const skip = ["about", "contact", "privacy-policy", "terms"];
    if (skip.includes(pathSlug)) return;

    const article = document.querySelector("article");
    if (!article) return;

    // Extract metadata from first h1 and p
    const firstH1 = article.querySelector("h1");
    const firstP = article.querySelector("p");
    const title = firstH1?.textContent.trim() || document.title;
    const description = firstP?.textContent.trim().replace(/\s+/g, " ").slice(0, 160) || "Digital strategy and free tools.";
    const published = new Date().toISOString();
    const image = document.querySelector("img")?.src || "/assets/og-image.jpg";

    // Remove the first <h1> and <p> to avoid visual + semantic repetition
    if (firstH1) firstH1.remove();
    if (firstP) firstP.remove();

    const meta = { title, description, image, published };

    // 🧼 Remove old meta tags
    [
      "description", "keywords",
      "og:title", "og:description", "og:url", "og:type", "og:image",
      "twitter:card", "twitter:title", "twitter:description", "twitter:image"
    ].forEach(name => {
      const tag = document.querySelector(`meta[name='${name}'], meta[property='${name}']`);
      if (tag) tag.remove();
    });

    function injectMeta(name, content, attr = "name") {
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    }

    // Ensure charset and viewport
    if (!document.querySelector("meta[charset]")) {
      const charset = document.createElement("meta");
      charset.setAttribute("charset", "UTF-8");
      document.head.prepend(charset);
    }

    if (!document.querySelector("meta[name='viewport']")) {
      injectMeta("viewport", "width=device-width, initial-scale=1.0");
    }

    // Inject dynamic metadata
    document.title = meta.title;
    injectMeta("description", meta.description);

    const keywordList = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10)
      .join(", ");
    injectMeta("keywords", keywordList);

    // OpenGraph + Twitter
    injectMeta("og:type", "article", "property");
    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // JSON-LD Structured Data
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

    // 🎨 Hero section
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

    // 🧭 Table of Contents
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
      article.insertAdjacentElement("afterbegin", toc);
    }

    // 🌗 Dark Mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // 🔄 Refresh description after 30s (optional)
    setTimeout(() => {
      const desc = document.querySelector("meta[name='description']");
      if (desc) desc.setAttribute("content", meta.description + " 🔄 Refreshed");
    }, 30000);
  });
})();