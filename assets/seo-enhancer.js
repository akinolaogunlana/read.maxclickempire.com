// ===== SEO Enhancer & Site Enhancements (Async Version) =====
(function () {
  console.log("✅ seo-enhancer.js loaded");

  // -------------------- UTILITIES --------------------
  function onDomReady(cb) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", cb, { once: true });
    } else cb();
  }

  function waitFor(conditionFn, cb, interval = 50, timeout = 3000) {
    const start = Date.now();
    (function poll() {
      try {
        if (conditionFn()) return cb();
      } catch (e) {
        console.warn("waitFor condition error:", e);
      }
      if (Date.now() - start >= timeout) return cb(false);
      setTimeout(poll, interval);
    })();
  }

  function toISO(dateStr) {
    if (!dateStr) return null;
    // If already ISO-ish, return as-is (browser will often parse fine too)
    // Otherwise try new Date parsing; if fails, return original.
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
    // Common compact formats: 2025-08-21, 2025/08/21, 2025-08-21T08:00:00Z already handled above.
    // Last resort: return the input unchanged so we at least surface something.
    return dateStr;
  }

  // Read JSON-LD objects of type BlogPosting / NewsArticle for dates/images
  function readJsonLdDates() {
    const out = {};
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(s => {
      try {
        const data = JSON.parse(s.textContent.trim());
        const nodes = Array.isArray(data) ? data : [data];
        nodes.forEach(node => {
          if (!node || typeof node !== "object") return;
          const type = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
          if (type && (type.includes("BlogPosting") || type.includes("NewsArticle") || type.includes("Article"))) {
            if (node.datePublished && !out.datePublished) out.datePublished = node.datePublished;
            if (node.dateModified && !out.dateModified) out.dateModified = node.dateModified;
            if (node.image && !out.image) out.image = typeof node.image === "string" ? node.image : (node.image.url || (Array.isArray(node.image) ? node.image[0] : ""));
            if (node.headline && !out.title) out.title = node.headline;
            if (node.description && !out.description) out.description = node.description;
          }
        });
      } catch { /* ignore broken ld+json */ }
    });
    return out;
  }

  // -------------------- PUBLISH DATE DETECTION --------------------
  function getPublishedDate() {
    // 1) Meta tags (common variants; case-sensitive selectors so include likely cases)
    const metaSelectors = [
      'meta[property="article:published_time"]',
      'meta[property="og:published_time"]',
      'meta[name="publishdate"]',
      'meta[name="PublishDate"]',
      'meta[name="date"]',
      'meta[name="datepublished"]',
      'meta[name="datePublished"]',
      'meta[itemprop="datePublished"]',
      'meta[name="DC.date.issued"]',
      'meta[name="DC.Date"]',
    ];
    for (const sel of metaSelectors) {
      const el = document.querySelector(sel);
      const content = el?.getAttribute("content");
      if (content) return toISO(content.trim());
    }

    // 2) <time datetime="..."> or <time>text</time>
    const timeEl = document.querySelector("time[datetime]") || document.querySelector("time");
    if (timeEl) return toISO(timeEl.getAttribute("datetime") || timeEl.textContent?.trim());

    // 3) Blogger / CMS visible nodes
    const blogger = document.querySelector(".published, .post-date, .entry-date");
    if (blogger) return toISO(blogger.getAttribute("datetime") || blogger.textContent?.trim());

    // 4) JSON-LD (BlogPosting / Article)
    const fromLd = readJsonLdDates();
    if (fromLd.datePublished) return toISO(fromLd.datePublished);

    // 5) Fallback: null (caller can decide next steps)
    return null;
  }

  // -------------------- INIT --------------------
  onDomReady(() => {
    // We do not block the enhancer on window.postMetadata; we run immediately.
    // Related posts will wait for it separately if available later.
    initSeoEnhancer();

    // If you still want to enhance with postMetadata when it appears later (SPA, async):
    waitFor(() => !!window.postMetadata, () => {
      try {
        enhanceWithPostMetadata(); // fills related posts once meta arrives
      } catch (e) {
        console.warn("Related posts enhancement skipped:", e);
      }
    }, 100, 3000);
  });

  function initSeoEnhancer() {
    try {
      const slug = location.pathname.split("/").pop()?.replace(".html", "") || "";
      const pathSlug = location.pathname.replace(/^\/+/, "").replace(/\.html$/, "");
      const skipPages = ["about", "contact", "privacy-policy", "terms"];
      if (skipPages.includes(pathSlug)) return;

      const article = document.querySelector("article");
      if (!article) return;

      addNavigation();

      // Build metadata (will use detected publish date)
      const meta = setupMetadata(article, slug);

      // Hero needs the publish date too
      setupHero(article, meta);

      // Async microtasks to keep first paint snappy
      setTimeout(() => {
        loadTOC(article);
        loadShareButtons(article);
        // Related posts handled in enhanceWithPostMetadata (so it can run even if postMetadata loads late)
        if (window.postMetadata) loadRelatedPosts(slug, article);
      }, 0);

      addFooter();
      applyDarkMode();

      if (location.search.includes("debugSEO")) {
        console.log("🔍 SEO Meta Loaded:", meta);
      }
    } catch (e) {
      console.error("❌ SEO Enhancer Error:", e);
    }
  }

  // If postMetadata shows up later (some templates inject it after the article)
  function enhanceWithPostMetadata() {
    const article = document.querySelector("article");
    if (!article) return;
    const slug = location.pathname.split("/").pop()?.replace(".html", "") || "";
    if (!document.querySelector("#related-posts")) loadRelatedPosts(slug, article);
  }

  // -------------------- NAVIGATION --------------------
  function addNavigation() {
    if (document.querySelector("header.site-header")) return;

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

  // -------------------- METADATA --------------------
  function setupMetadata(article, slug) {
    const h1 = article.querySelector("h1");
    const titleText = (h1?.textContent || document.title || "").trim();
    const existingDesc = document.querySelector('meta[name="description"]')?.content || "";
    const desc = existingDesc || "Digital strategy and free tools.";
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;

    // Prefer first content image; fallback to OG; fallback to default
    const firstImg = article.querySelector("img");
    const ogImg = document.querySelector('meta[property="og:image"]')?.content || "";
    const image = firstImg?.src || ogImg || "/assets/og-image.jpg";

    // Detect published date directly from post (your requirement)
    const detectedPublished = getPublishedDate();
    const publishedISO = detectedPublished || new Date().toISOString();

    // Compute keywords from title (basic)
    const keywords = titleText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 10)
      .join(", ");

    // Build meta model (optionally merge with postMetadata if present)
    const fromPM = (window.postMetadata && window.postMetadata[slug]) || {};
    const meta = {
      title: fromPM.title || titleText,
      description: fromPM.description || desc,
      image: fromPM.image || image,
      published: fromPM.published || publishedISO,
      keywords
    };

    // Remove old meta we control, then inject fresh
    const namesToClear = [
      "og:title","og:description","og:url","og:type","og:image",
      "twitter:title","twitter:description","twitter:image","twitter:card",
      "keywords","description"
    ];
    namesToClear.forEach(name => {
      document.querySelectorAll(`meta[property='${name}'], meta[name='${name}']`).forEach(tag => tag.remove());
    });

    function injectMeta(name, content, attr = "name") {
      if (!content) return;
      const tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
    }

    // Title & Description
    if (meta.title) document.title = meta.title;
    injectMeta("description", meta.description);
    injectMeta("keywords", meta.keywords);

    // Open Graph
    injectMeta("og:title", meta.title, "property");
    injectMeta("og:description", meta.description, "property");
    injectMeta("og:type", "article", "property");
    injectMeta("og:url", canonical, "property");
    injectMeta("og:image", meta.image, "property");

    // Twitter
    injectMeta("twitter:card", "summary_large_image");
    injectMeta("twitter:title", meta.title);
    injectMeta("twitter:description", meta.description);
    injectMeta("twitter:image", meta.image);

    // JSON-LD (overwrite or add a compact BlogPosting)
    // Try to preserve existing JSON-LD if present (we only append our own minimal block)
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
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      publisher: {
        "@type": "Organization",
        name: "MaxClickEmpire",
        logo: { "@type": "ImageObject", url: "https://read.maxclickempire.com/assets/favicon.png" }
      }
    });
    document.head.appendChild(ld);

    // For quick visual/debug confirmation – add data- attribute on <article>
    article.setAttribute("data-detected-published", meta.published);

    return meta;
  }

  // -------------------- HERO --------------------
  function setupHero(article, meta) {
    const h1 = article.querySelector("h1");
    if (!h1 || document.querySelector(".post-hero")) return;

    const hero = document.createElement("section");
    hero.className = "post-hero";
    const dateDisplay = (meta.published || "").split("T")[0] || meta.published || "";
    hero.innerHTML = `
      <div style="background: linear-gradient(to right, #f5f7fa, #e4ecf3); border-radius: 20px; padding: 2rem; text-align: center; margin-bottom: 2.5rem;">
        <p style="font-size: 0.9rem; color: #666;">📅 ${dateDisplay}</p>
        <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description || ""}</p>
        <img src="${meta.image}" alt="Post image" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
      </div>`;
    const h1Clone = h1.cloneNode(true);
    h1.remove();
    hero.querySelector("div").insertAdjacentElement("afterbegin", h1Clone);
    article.insertAdjacentElement("afterbegin", hero);
  }

  // -------------------- FOOTER --------------------
  function addFooter() {
    if (document.querySelector("footer.site-footer")) return;

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.style.cssText = "text-align:center;padding:2rem;color:#888;font-size:0.9rem;border-top:1px solid #eee;margin-top:3rem;background:#fafafa;";
    footer.innerHTML = `&copy; ${new Date().getFullYear()} MaxClickEmpire. All rights reserved. |
      <a href="/privacy-policy.html" style="color:#666;">Privacy Policy</a>`;
    document.body.insertAdjacentElement("beforeend", footer);
  }

  // -------------------- DARK MODE --------------------
  function applyDarkMode() {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }
  }

  // -------------------- TOC --------------------
  function loadTOC(article) {
    if (document.querySelector("#toc")) return;
    const headings = article.querySelectorAll("h2, h3");
    if (!headings.length) return;

    const toc = document.createElement("div");
    toc.id = "toc";
    toc.style.cssText = "border:1px solid #ccc;padding:1rem;margin-bottom:1rem;background:#f9f9f9;font-family:Arial,sans-serif;";
    toc.innerHTML = `
      <h2 style="margin-top:0;">📚 Table of Contents</h2>
      <button id="toggle-toc" style="margin-bottom:0.5rem;">Hide TOC</button>
      <ul style="padding-left:1rem;"></ul>
      <button id="back-to-top" style="margin-top:0.5rem; display:block;">Back to Top ↑</button>
    `;

    const ul = toc.querySelector("ul");
    let currentH2Li = null;

    headings.forEach((h, i) => {
      const id = `toc-${i}`;
      h.id = id;

      if (h.tagName === "H2") {
        const li = document.createElement("li");
        li.style.listStyle = "none";
        li.style.marginBottom = "0.3rem";
        li.innerHTML = `<span style="display:inline-block; cursor:pointer; user-select:none; transition: transform 0.3s;">▼</span>
                        <a href="#${id}" style="margin-left:0.3rem;text-decoration:none;color:#333;">${h.textContent}</a>`;
        ul.appendChild(li);
        currentH2Li = li;
      } else if (h.tagName === "H3" && currentH2Li) {
        let subUl = currentH2Li.querySelector("ul");
        if (!subUl) {
          subUl = document.createElement("ul");
          subUl.style.cssText = "padding-left:1.5rem;overflow:hidden;max-height:0;transition:max-height 0.3s;";
          currentH2Li.appendChild(subUl);
        }
        const li = document.createElement("li");
        li.style.listStyle = "disc";
        li.style.marginBottom = "0.2rem";
        li.innerHTML = `<a href="#${id}" style="text-decoration:none;color:#555;">${h.textContent}</a>`;
        subUl.appendChild(li);
      }
    });

    article.insertAdjacentElement("afterbegin", toc);

    // Toggle TOC
    const toggleBtn = toc.querySelector("#toggle-toc");
    const backToTopBtn = toc.querySelector("#back-to-top");
    const tocState = localStorage.getItem("tocVisible");
    if (tocState === "hidden") {
      ul.style.display = "none";
      toggleBtn.textContent = "Show TOC";
    }

    toggleBtn.addEventListener("click", () => {
      if (ul.style.display === "none") {
        ul.style.display = "block";
        toggleBtn.textContent = "Hide TOC";
        localStorage.setItem("tocVisible", "visible");
      } else {
        ul.style.display = "none";
        toggleBtn.textContent = "Show TOC";
        localStorage.setItem("tocVisible", "hidden");
      }
    });

    // Collapse/expand h3 groups
    ul.querySelectorAll("li > span").forEach(span => {
      const subUl = span.parentElement.querySelector("ul");
      if (subUl) {
        span.style.transform = "rotate(-90deg)";
        span.style.cursor = "pointer";
        span.addEventListener("click", () => {
          if (subUl.style.maxHeight === "0px") {
            subUl.style.maxHeight = subUl.scrollHeight + "px";
            span.style.transform = "rotate(0deg)";
          } else {
            subUl.style.maxHeight = "0px";
            span.style.transform = "rotate(-90deg)";
          }
        });
      } else {
        span.style.visibility = "hidden";
      }
    });

    // Smooth scroll
    ul.querySelectorAll("a[href^='#']").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute("href"));
        if (target) window.scrollTo({ top: target.offsetTop - 20, behavior: "smooth" });
      });
    });

    backToTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // -------------------- RELATED POSTS --------------------
  function loadRelatedPosts(slug, article) {
    if (!window.postMetadata || document.querySelector("#related-posts")) return;
    const metaData = window.postMetadata[slug];
    if (!metaData) return;

    const stopWords = ["the","and","or","of","a","an","in","on","for","with","to","at","by","is","it","this"];
    const extractWords = text => (text.toLowerCase().match(/\b\w+\b/g) || []);
    let keywords = [...extractWords(metaData.title || ""), ...extractWords(metaData.description || "")];
    if (metaData.tags) keywords = [...keywords, ...metaData.tags.map(t => (t || "").toLowerCase())];
    keywords = keywords.filter(w => w && !stopWords.includes(w));

    const scoredPosts = Object.entries(window.postMetadata)
      .filter(([key]) => key !== slug)
      .map(([key, data]) => {
        const dataText = ((data.title || "") + " " + (data.description || "") + (data.tags ? " " + data.tags.join(" ") : "")).toLowerCase();
        let score = 0;
        keywords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          if (regex.test(data.title || "")) score += 3;
          else if (regex.test(data.description || "")) score += 1;
          else if (data.tags && data.tags.some(tag => regex.test((tag || "").toLowerCase()))) score += 2;
        });
        return { slug: key, data, score, dataText };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scoredPosts.length) {
      const relatedBlock = document.createElement("section");
      relatedBlock.id = "related-posts";
      relatedBlock.style.marginTop = "3rem";
      relatedBlock.innerHTML = `
        <h2 style="margin-bottom:1rem;">🔗 Related Posts</h2>
        <div style="display:flex; flex-wrap:wrap; gap:1rem; justify-content:space-between;">
          ${scoredPosts.map(item => `
            <a href="/posts/${item.slug}.html" style="
              flex:1 1 calc(33% - 1rem);
              text-decoration:none;
              border:1px solid #ccc;
              border-radius:8px;
              padding:1rem;
              transition: transform 0.2s, box-shadow 0.2s;
              background:#fff;
              position:relative;
            " data-slug="${item.slug}" data-preview="${(item.data.description || "").slice(0,150)}">
              <strong style="color:#333;">${item.data.title || item.slug}</strong><br/>
              <small style="color:#777;">${(item.data.description || "").slice(0,100)}${(item.data.description || "").length>100?"...":""}</small>
            </a>
          `).join("")}
        </div>
      `;
      article.appendChild(relatedBlock);
    }
  }

  // -------------------- SHARE BUTTONS --------------------
  function loadShareButtons(article) {
    if (document.querySelector(".share-article")) return;
    if (!article) return;

    const shareContainer = document.createElement("div");
    shareContainer.className = "share-article";
    shareContainer.style.cssText = `
      display:flex;
      flex-wrap:wrap;
      gap:0.5rem;
      margin:2rem 0;
      justify-content:flex-start;
      align-items:center;
      font-family:Arial,sans-serif;
    `;

    const buttons = [
      { 