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

    // 📦 Load metadata
    const meta = (window.postMetadata && window.postMetadata[slug]) || {
      title: document.title,
      description: document.querySelector("meta[name='description']")?.content || "Digital strategy and free tools.",
      image: document.querySelector("img")?.src || "/assets/og-image.jpg",
      published: new Date().toISOString(),
    };

    // 🧼 Remove old tags
    [
      "og:title", "og:description", "og:url", "og:type",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const tag = document.querySelector(`meta[property='${name}'], meta[name='${name}']`);
      if (tag) tag.remove();
    });

    // 🧠 Inject meta
    function injectMeta(name, content, attr = "name") {
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

    // 📊 Keywords
    const keywordList = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, "")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10)
      .join(", ");
    injectMeta("keywords", keywordList);

    // 🧷 Social
    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", location.href, "property");
    injectMeta("og:image", meta.image, "property");
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // 📚 JSON-LD
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

    // 🎨 Hero Section
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

    // 🧭 TOC
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

    // 💡 (Optional) Internal Link Injection
    /*
    if (window.relatedLinks) {
      article.querySelectorAll("p").forEach(p => {
        window.relatedLinks.forEach(({ keyword, url }) => {
          const regex = new RegExp("\\b(" + keyword + ")\\b", "gi");
          if (!p.innerHTML.includes(url)) {
            p.innerHTML = p.innerHTML.replace(regex, `<a href="${url}" title="Learn more about $1">$1</a>`);
          }
        });
      });
    }
    */

    // 📣 Ads
    const paras = article.querySelectorAll("p");
    if (paras.length >= 5) {
      const idx = Math.floor(Math.random() * 3) + 2;
      const ad = `
        <div style="text-align:center;margin:2rem 0">
          <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX" data-ad-slot="0000000000" data-ad-format="auto"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        </div>`;
      paras[idx]?.insertAdjacentHTML("afterend", ad);
    }

    // 🧠 Related Posts
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
        relatedBlock.innerHTML = `<h3>🔗 Related Posts</h3><ul>
          ${related.map(([slug, data]) => `<li><a href="/posts/${slug}.html">${data.title}</a></li>`).join("")}
        </ul>`;
        article.appendChild(relatedBlock);
      }
    }

    // 🌗 Dark Mode Toggle (auto detect)
    const darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (darkMode) {
      document.body.classList.add("dark-theme");
    }

    // 🧪 Debug
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }

    // 🔄 Refresh description
    setTimeout(() => {
      const desc = document.querySelector("meta[name='description']");
      if (desc) desc.setAttribute("content", meta.description + " 🔄 Refreshed");
    }, 30000);
  });
})();