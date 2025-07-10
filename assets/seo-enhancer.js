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

    // 🔁 Remove duplicate meta tags
    [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const tag = document.querySelector(`meta[property='${name}'], meta[name='${name}']`);
      if (tag) tag.remove();
    });

    // 🔧 Inject meta tags
    function injectMeta(name, content, attr = "name") {
      if (!content) return;
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    }

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

    document.title = meta.title;

    // 🧠 JSON-LD Schema
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

    // 🎨 Hero Section
    const article = document.querySelector("article");
    if (article && h1 && !document.querySelector(".post-hero")) {
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
      h1.remove(); // remove original H1
      article.insertAdjacentElement("afterbegin", hero);
    }

    // 🧭 Table of Contents
    const headings = article?.querySelectorAll("h2, h3");
    if (headings && headings.length && !document.querySelector("#toc")) {
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

    // 📣 Optional: Insert ad inside content
    const paras = article?.querySelectorAll("p");
    if (paras && paras.length >= 5) {
      const idx = Math.floor(Math.random() * 3) + 2;
      const ad = `
        <div style="text-align:center;margin:2rem 0">
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="ca-pub-XXXX"
               data-ad-slot="0000000000"
               data-ad-format="auto"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        </div>`;
      paras[idx]?.insertAdjacentHTML("afterend", ad);
    }

    // 🌗 Auto Dark Mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // 🧪 Debug mode
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  });
})();