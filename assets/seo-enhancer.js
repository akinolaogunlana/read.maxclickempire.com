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
      { platform: "facebook", label: "Facebook", icon: "🔵" },
      { platform: "twitter", label: "Twitter", icon: "🐦" },
      { platform: "linkedin", label: "LinkedIn", icon: "💼" },
      { platform: "whatsapp", label: "WhatsApp", icon: "🟢" },
      { platform: "telegram", label: "Telegram", icon: "✈️" },
      { platform: "email", label: "Email", icon: "✉️" },
      { platform: "copy", label: "Copy Link", icon: "📋" },
      { platform: "native", label: "Share", icon: "🔗" },
    ];

    shareContainer.innerHTML = `<span style="font-weight:bold;">Share:</span> `;

    buttons.forEach(btn => {
      const button = document.createElement("button");
      button.className = "share-btn";
      button.dataset.platform = btn.platform;
      button.innerHTML = `${btn.icon} ${btn.label}`;
      button.style.cssText = `
        padding:0.5rem 0.8rem;
        border:none;
        border-radius:5px;
        cursor:pointer;
        background:#f0f0f0;
        transition: background 0.2s;
        font-size:0.9rem;
      `;
      button.addEventListener("mouseover", () => button.style.background = "#e0e0e0");
      button.addEventListener("mouseout", () => button.style.background = "#f0f0f0");
      shareContainer.appendChild(button);
    });

    const hero = document.querySelector(".post-hero");
    if (hero) hero.insertAdjacentElement("afterend", shareContainer);
    else article.insertAdjacentElement("afterbegin", shareContainer);

    const url = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    const title = document.title;

    shareContainer.querySelectorAll(".share-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const platform = btn.dataset.platform;
        try {
          if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400");
          else if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank", "width=600,height=400");
          else if (platform === "linkedin") window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, "_blank", "width=600,height=400");
          else if (platform === "whatsapp") window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`, "_blank");
          else if (platform === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank");
          else if (platform === "email") window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
          else if (platform === "copy") {
            await navigator.clipboard.writeText(url);
            alert("✅ Link copied to clipboard!");
          } else if (platform === "native") {
            if (navigator.share) await navigator.share({ title, url });
            else alert("⚠️ Native sharing not supported on this device. Use the buttons above.");
          }
        } catch (err) {
          console.error("Share failed:", err);
        }
      });
    });
  }
})();















  
// Advanced Nested Breadcrumb JSON-LD (h1 + h2 + h3 hierarchy)
(function() {
  function injectNestedBreadcrumb() {
    const skipKeywords = ["FAQ","Frequent Ask Questios","Frequent Ask Questios","Conclusion", "References"];
    const maxSubHeadings = 20; // limit depth for JSON-LD
    const pathSegments = window.location.pathname
      .split("/")
      .filter(seg => seg.length > 0);

    const itemList = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": window.location.origin + "/"
      }
    ];

    let positionCounter = 2;

    pathSegments.forEach((seg, index) => {
      let name = seg.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

      if (index === pathSegments.length - 1) {
        name = name.replace(/\.[^/.]+$/, "");
        const h1 = document.querySelector("h1");
        if (h1 && h1.textContent.trim()) name = h1.textContent.trim();
        else {
          const title = document.querySelector("title");
          if (title && title.textContent.trim()) name = title.textContent.trim();
        }
      }

      let itemUrl = window.location.origin + "/" + pathSegments.slice(0, index + 1).join("/");
      if (index < pathSegments.length - 1) itemUrl += "/";

      itemList.push({
        "@type": "ListItem",
        "position": positionCounter++,
        "name": name,
        "item": itemUrl
      });

      // Last segment: process h2 and h3 as nested
      if (index === pathSegments.length - 1) {
        const headings = Array.from(document.querySelectorAll("h2, h3"))
          .filter(h => !skipKeywords.some(kw => new RegExp(kw, "i").test(h.textContent)))
          .filter(h => !h.closest("aside") && h.offsetParent !== null)
          .slice(0, maxSubHeadings);

        let lastH2Id = null;

        headings.forEach((heading, idx) => {
          if (!heading.id) heading.id = "breadcrumb-sub-" + idx;
          const url = window.location.href.split("#")[0] + "#" + heading.id;

          if (heading.tagName.toLowerCase() === "h2") {
            // h2 = new top-level under page
            itemList.push({
              "@type": "ListItem",
              "position": positionCounter++,
              "name": heading.textContent.trim(),
              "item": url
            });
            lastH2Id = heading.id;
          } else if (heading.tagName.toLowerCase() === "h3" && lastH2Id) {
            // h3 = nested under last h2
            itemList.push({
              "@type": "ListItem",
              "position": positionCounter++,
              "name": heading.textContent.trim(),
              "item": url
            });
          }
        });
      }
    });

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemList
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(breadcrumb, null, 2);
    document.head.appendChild(script);

    console.log("✅ Nested Dynamic Breadcrumb JSON-LD injected (h2 + h3 hierarchy)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectNestedBreadcrumb);
  } else {
    injectNestedBreadcrumb();
  }
})();










  









    
<!-- ✅ FAQ JSON-LD Generator -->


/* ✅ Thorough FAQ JSON-LD generator
   - Targets the FAQ section (H2 "Frequently Asked Questions") if present
   - Supports multi-element answers and lists
   - Creates unique slug IDs for deep links
   - Replaces any previously injected schema inserted by this script
*/
(function () {
  function generateFAQSchema() {
    try {
      // ----------------- Config -----------------
      const cfg = {
        containerSelectors: ['.post-body', 'main', 'article', '#post-content'],
        faqHeadingText: 'Frequently Asked Questions', // case-insensitive match
        questionTag: 'H3', // tag used for question headings in your posts
        stopOnNextHeadingOfSameLevel: true, // stop parsing FAQs after next H2
        allowedAnswerTags: ['P', 'DIV', 'UL', 'OL', 'BLOCKQUOTE', 'TABLE', 'LI'],
        schemaClass: 'faq-schema', // marker class for injected <script>
        injectIntoHead: true,
        maxAnswerLength: 3000 // truncate very long answers (safety)
      };

      // --- helper regexes
      const qPatterns = [/^q\d*[:.\s-]*/i, /^question\d*[:.\s-]*/i];
      const aPatterns = [/^a\d*[:.\s-]*/i, /^answer\d*[:.\s-]*/i];

      // ----------------- helpers -----------------
      const isQuestionText = txt =>
        qPatterns.some(p => p.test(txt)) || txt.trim().endsWith('?') || txt.trim().toLowerCase().startsWith('q:');

      const stripPattern = (txt, patterns) =>
        patterns.reduce((out, p) => out.replace(p, '').trim(), txt || '');

      function extractText(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return '';
        return Array.from(node.childNodes).map(extractText).filter(Boolean).join(' ').trim();
      }

      function slugify(s) {
        return (s || '')
          .toString()
          .trim()
          .toLowerCase()
          .normalize('NFKD')                 // remove accents
          .replace(/[\u0300-\u036F]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'faq';
      }

      function uniqueId(base) {
        let id = base;
        let i = 1;
        while (document.getElementById(id)) {
          id = `${base}-${i++}`;
        }
        return id;
      }

      // ----------------- locate container -----------------
      let container = null;
      for (const sel of cfg.containerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          container = el;
          break;
        }
      }
      if (!container) {
        console.warn('FAQ schema: no container found (tried selectors)', cfg.containerSelectors);
        return;
      }

      // ----------------- find FAQ section -----------------
      // Prefer explicit "Frequently Asked Questions" H2; fallback to using entire container.
      const headingCandidates = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      let faqHeading = headingCandidates.find(h =>
        (h.textContent || '').trim().toLowerCase().includes(cfg.faqHeadingText.toLowerCase())
      );

      // If not found, try "Frequently Asked Questions" variants (short)
      if (!faqHeading) {
        faqHeading = headingCandidates.find(h =>
          /faq|frequently asked questions/i.test((h.textContent || '').trim())
        );
      }

      // Build list of nodes to scan:
      const nodesToScan = [];
      if (faqHeading) {
        // iterate siblings after the heading until next H2 (or next heading of same tag)
        let node = faqHeading.nextElementSibling;
        const stopTag = faqHeading.tagName; // typically H2
        while (node) {
          // stop if we hit another heading of same level (configurable)
          if (cfg.stopOnNextHeadingOfSameLevel && node.tagName === stopTag) break;

          nodesToScan.push(node);
          node = node.nextElementSibling;
        }
      } else {
        // fallback: scan the whole container direct children in order
        nodesToScan.push(...Array.from(container.children));
      }

      // ----------------- parse Q&A pairs -----------------
      const faqItems = []; // { question, answers[], id }
      let currentQuestion = null;
      let currentQuestionEl = null;
      let answerBuffer = [];

      // Traverse nodes sequentially (keeps original ordering)
      nodesToScan.forEach(node => {
        if (!node || node.nodeType !== 1) return;
        // skip hidden elements
        if (node.offsetParent === null && !(node.tagName === 'BODY')) return;

        const tag = node.tagName;
        const text = extractText(node);
        if (!text) return;

        // If this node is an H3 (question tag) and looks like a question, start a new Q
        if (tag === cfg.questionTag && isQuestionText(text)) {
          // finalize previous question (if any)
          if (currentQuestion) {
            const answerText = answerBuffer.join('\n\n').trim();
            if (answerText) {
              // store item
              faqItems.push({
                question: currentQuestion,
                answer: answerText,
                id: currentQuestionEl.id || currentQuestionEl.getAttribute('id')
              });
            }
            // reset buffer
            answerBuffer = [];
          }

          // new question
          currentQuestion = stripPattern(text, qPatterns);
          currentQuestionEl = node;

          // ensure ID on the element (slug + unique)
          if (!currentQuestionEl.id) {
            const base = 'faq-' + slugify(currentQuestion).slice(0, 60);
            currentQuestionEl.id = uniqueId(base);
          }
          return;
        }

        // Otherwise, if a question was started, treat eligible tags as part of the answer
        if (currentQuestion) {
          // include content for allowed tags only (this avoids pulling unrelated H2/H1 etc)
          if (cfg.allowedAnswerTags.includes(tag) || tag === 'LI' || tag === 'P' || tag === 'DIV') {
            // strip any leading "A:" or "Answer:" on the first paragraph(s)
            const cleaned = stripPattern(text, aPatterns);
            if (cleaned) answerBuffer.push(cleaned);
          }
        }
      });

      // finalize last Q if present
      if (currentQuestion) {
        const answerText = answerBuffer.join('\n\n').trim();
        if (answerText) {
          faqItems.push({
            question: currentQuestion,
            answer: answerText,
            id: currentQuestionEl.id
          });
        }
      }

      if (!faqItems.length) {
        console.info('FAQ schema: no Q/A pairs found in the FAQ section.');
        return;
      }

      // ----------------- build JSON-LD -----------------
      const mainEntity = faqItems.map(item => {
        let answerText = item.answer;
        if (cfg.maxAnswerLength && answerText.length > cfg.maxAnswerLength) {
          answerText = answerText.slice(0, cfg.maxAnswerLength - 1) + '…';
        }
        return {
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": answerText,
            "url": `${window.location.href.split('#')[0]}#${item.id}`
          }
        };
      });

      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": mainEntity
      };

      // ----------------- inject (replace previous) -----------------
      const existing = document.querySelector(`script[type="application/ld+json"].${cfg.schemaClass}`);
      if (existing) existing.remove(); // replace old injection from this script

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.className = cfg.schemaClass;
      script.text = JSON.stringify(faqSchema, null, 2);

      if (cfg.injectIntoHead && document.head) {
        document.head.appendChild(script);
      } else {
        document.body.appendChild(script);
      }

      console.log('✅ FAQ Schema injected (items):', faqItems.map(i => i.question));
    } catch (err) {
      console.error('FAQ schema generation failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateFAQSchema);
  } else {
    generateFAQSchema();
  }
})();


















// Robust HowTo JSON-LD (improved detection + DOM-ready)
(function() {
  function run() {
    const steps = [];
    let totalMinutes = 0;
    let totalCost = 0;

    const toISO8601 = (minutes) => {
      minutes = Math.round(minutes);
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `PT${hrs > 0 ? hrs + 'H' : ''}${mins}M`;
    };

    const stopwords = new Set([
      "the","and","for","with","that","this","from","your","are","use","step","steps",
      "a","an","of","in","on","to","is","as","by","or","be","at","it","its","you"
    ]);
    const extractKeywords = (text, limit = 10) => {
      const words = (text || "").match(/\b[\w\-]{2,}\b/g) || [];
      const freq = {};
      words.forEach(w => {
        const lw = w.toLowerCase();
        if (!stopwords.has(lw)) freq[lw] = (freq[lw] || 0) + 1;
      });
      return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, limit).map(kv => kv[0]);
    };

    // Prefer main/article container if present
    const contentEl = document.querySelector('main, article, #post-content') || document.body;

    // collect candidate nodes in document order that have textual content
    const nodeList = Array.from(contentEl.querySelectorAll('h1,h2,h3,h4,ol,ul,li,p,div,span'));
    const nodes = nodeList.filter(n => (n.textContent || "").trim().length > 0);

    // Helper: test if a text looks like a numbered step marker
    const isNumberedStep = (text) => {
      return /^(?:Step\s*\d+[:.)]|\d+[.)]\s*|\d+\.\s+)/i.test(text.trim());
    };

    // Build list of main step indices (prefer numeric markers). If none, fallback to h2/h3 headings (excluding TOC)
    const mainStepEntries = [];
    nodes.forEach((node, idx) => {
      const txt = (node.textContent || "").trim();
      if (isNumberedStep(txt)) {
        // extract title after numeric marker
        const title = txt.replace(/^(?:Step\s*\d+[:.)]|\d+[.)]\s*|\d+\.\s+)/i, '').trim();
        mainStepEntries.push({ node, index: idx, title });
      }
    });

    // fallback: use headings if no numbered steps found
    if (!mainStepEntries.length) {
      nodes.forEach((node, idx) => {
        if (/^H[2-3]$/.test(node.tagName) && !/table of contents|toc/i.test(node.textContent || "")) {
          mainStepEntries.push({ node, index: idx, title: (node.textContent || "").trim() });
        }
      });
    }

    if (!mainStepEntries.length) {
      console.warn("No steps detected by numeric markers or headings — nothing to build for HowTo.");
    }

    // For each main step, collect content nodes from its index up to next main step (exclusive)
    for (let s = 0; s < mainStepEntries.length; s++) {
      const entry = mainStepEntries[s];
      const startIdx = entry.index;
      const endIdx = (s + 1 < mainStepEntries.length) ? mainStepEntries[s+1].index : nodes.length;
      // collect nodes belonging to this step
      const stepNodes = nodes.slice(startIdx, endIdx);
      // Compose a readable text for the step (include title + subsequent paragraphs)
      const title = entry.title || (entry.node.textContent || "").trim();
      let collectedText = title;
      // gather other node texts (skip the title node itself but include others)
      for (let k = 1; k < stepNodes.length; k++) {
        // if the node is a list (ol/ul) we gather each li text lines
        const cur = stepNodes[k];
        if (cur.tagName === 'OL' || cur.tagName === 'UL') {
          Array.from(cur.querySelectorAll('li')).forEach(li => {
            const liText = (li.textContent || "").trim();
            if (liText) collectedText += '\n' + liText;
          });
        } else {
          const txt = (cur.textContent || "").trim();
          if (txt) collectedText += '\n' + txt;
        }
      }

      // detect images inside the range
      const images = [];
      for (const n of stepNodes) {
        Array.from(n.querySelectorAll('img')).forEach(img => {
          if (img.src) images.push(img.src);
        });
      }

      // detect links inside the range (all links)
      const links = [];
      for (const n of stepNodes) {
        Array.from(n.querySelectorAll('a[href]')).forEach(a => {
          const href = a.href;
          const name = (a.textContent || "").trim() || href;
          links.push({ href, name });
        });
      }

      // detect downloadable media (pdf/docx/xlsx/zip/gsheet)
      const downloads = links.filter(l => /\.(pdf|docx?|xlsx?|zip|rar|7z|gsheet|gdoc)$/i.test(l.href));

      // detect sub-steps from any li inside stepNodes whose text looks like a sub-marker (a), i., 1.)
      const subSteps = [];
      stepNodes.forEach(n => {
        if (n.tagName === 'LI') {
          const liText = (n.textContent || "").trim();
          const subMatch = liText.match(/^([a-z]|\d+|[ivxlcdm]+)[\)\.\:]\s*(.+)/i);
          if (subMatch) {
            subSteps.push({ text: subMatch[2].trim() });
          } else {
            // also treat plain li as sub-step if there are multiple lis
            // (only if we don't already have subSteps from marker pattern)
            if (!subSteps.length) subSteps.push({ text: liText });
          }
        } else {
          // also check for inline lines that look like "a) ...", e.g. in p nodes
          const txt = (n.textContent || "").trim();
          const lines = txt.split(/\r?\n/);
          lines.forEach(line => {
            const subMatch = line.match(/^([a-z]|\d+|[ivxlcdm]+)[\)\.\:]\s*(.+)/i);
            if (subMatch) subSteps.push({ text: subMatch[2].trim() });
          });
        }
      });

      // time detection (supports ranges / decimals / hr/min)
      let minutes = 0;
      const timeRegex = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i;
      const timeMatch = collectedText.match(timeRegex);
      if (timeMatch) {
        let v1 = parseFloat(timeMatch[1]);
        const v2 = timeMatch[2] ? parseFloat(timeMatch[2]) : null;
        let unit = timeMatch[3].toLowerCase();
        let value = v2 ? (v1 + v2) / 2 : v1; // average if range
        if (/h|hour|hrs?/.test(unit)) value *= 60;
        minutes = value;
        totalMinutes += minutes;
      }

      // cost detection (allow commas like $24,750.00)
      let costValue = 0;
      const costRegex = /(?:\$|USD\s*)?(\d{1,3}(?:[,\d{3}])*(?:\.\d+)?)/i;
      const costMatch = collectedText.match(costRegex);
      if (costMatch) {
        const raw = costMatch[1].replace(/,/g, '');
        costValue = parseFloat(raw);
        if (!isNaN(costValue)) {
          totalCost += costValue;
        } else {
          costValue = 0;
        }
      }

      // difficulty detection
      const lower = collectedText.toLowerCase();
      let difficulty;
      if (/\beasy\b|\bbeginner\b/.test(lower)) difficulty = "Easy";
      else if (/\bmedium\b|\bintermediate\b/.test(lower)) difficulty = "Medium";
      else if (/\bhard\b|\badvanced\b|\bexpert\b/.test(lower)) difficulty = "Hard";

      // tips & warnings detection (lines starting with Tip: / Warning: / Note:)
      const tips = [];
      const warnings = [];
      stepNodes.forEach(n => {
        const txt = (n.textContent || "").trim();
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const t = line.replace(/^Tip[:\-\s]*/i,'').trim();
          const w = line.replace(/^Warning[:\-\s]*/i,'').trim();
          const note = line.replace(/^Note[:\-\s]*/i,'').trim();
          if (/^Tip[:\-\s]/i.test(line) || /^Note[:\-\s]/i.test(line)) tips.push(t || note);
          if (/^Warning[:\-\s]/i.test(line)) warnings.push(w);
        });
      });

      // keywords
      const keywords = extractKeywords(collectedText + ' ' + links.map(l => l.name).join(' '));

      // Build step JSON-LD object
      const stepObj = {
        "@type": "HowToStep",
        position: s + 1,
        name: title || `Step ${s+1}`,
        text: collectedText,
        url: window.location.href + `#step-${s+1}`,
        keywords: keywords
      };

      if (images.length) stepObj.image = [...new Set(images)];
      if (subSteps.length) {
        stepObj.step = subSteps.map((ss, i) => ({
          "@type": "HowToStep",
          position: i+1,
          name: `Sub-step ${i+1}`,
          text: ss.text,
          keywords: extractKeywords(ss.text)
        }));
      }
      if (minutes > 0) stepObj.totalTime = toISO8601(minutes);
      if (costValue > 0) stepObj.estimatedCost = { "@type": "MonetaryAmount", "currency": "USD", "value": costValue };
      if (difficulty) stepObj.difficulty = difficulty;
      if (tips.length) stepObj.tip = tips.map(t => ({ "@type": "HowToTip", text: t }));
      if (warnings.length) stepObj.warning = warnings.map(w => ({ "@type": "HowToWarning", text: w }));
      if (links.length) stepObj.relatedLink = links.map(l => ({ "@type": "WebPage", name: l.name, url: l.href }));
      if (downloads.length) stepObj.associatedMedia = downloads.map(d => ({ "@type": "MediaObject", contentUrl: d.href, name: d.name }));

      steps.push(stepObj);
    } // end for each step entry

    // Build final HowTo JSON-LD if we have steps
    if (!steps.length) {
      console.warn("No how-to steps assembled; JSON-LD will not be created.");
      return;
    }

    const howtoJsonLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: (document.querySelector('h1')?.textContent || document.title).trim(),
      description: (document.querySelector('meta[name="description"]')?.content || "").trim(),
      totalTime: totalMinutes > 0 ? toISO8601(totalMinutes) : undefined,
      step: steps,
      estimatedCost: totalCost > 0 ? { "@type": "MonetaryAmount", "currency": "USD", "value": Math.round(totalCost*100)/100 } : undefined,
      author: { "@type": "Person", name: (document.querySelector('meta[name="author"]')?.content || "Author").trim() },
      publisher: {
        "@type": "Organization",
        name: (document.querySelector('meta[name="publisher"]')?.content || document.location.hostname),
        logo: { "@type": "ImageObject", url: (document.querySelector('link[rel="icon"]')?.href || '') }
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": window.location.href }
    };

    // inject JSON-LD (remove existing HowTo scripts first to avoid duplicates)
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach(s => {
      try {
        const j = JSON.parse(s.textContent || '{}');
        if (j && (j["@type"] === "HowTo" || (Array.isArray(j) && j.some(x => x["@type"] === "HowTo")))) {
          s.remove();
        }
      } catch (e) { /* ignore parse errors */ }
    });

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(howtoJsonLd, null, 2);
    document.head.appendChild(script);

    console.log("✅ HowTo JSON-LD generated and injected:", howtoJsonLd);
  } // end run()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();



















<!-- ===== MaxClickEmpire – Smart Email + Push Popup ===== -->
(function () {
  "use strict";
  console.log("✅ MaxClickEmpire Smart Enhancer loaded");

  /* CONFIG */
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/8be743c5-c0ae-4203-bb9e-09a59a61067d";
  const SHEETBEST_KEY = "zT69WB-Oxz#EpxX_M2AWo5OhXJb3eR3N%Itxb-%VHL#c5#IpB1G21Gur%8S!ykom";
  const IPINFO_TOKEN = "91dbe52aeb0873";
  const AUTO_DISMISS_MS = 30000; // 30s
  const LS = { CONSENT:"user_consent", USER_ID:"user_id", QUEUE:"maxclick_memory_queue", SHOWN:"maxclick_popup_shown" };

  /* UTILS */
  const uuid = () => crypto?.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c/4))).toString(16));

  async function safeFetch(url, options={}, timeoutMs=15000){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeoutMs);
    try { return await fetch(url,{...options,signal:ctrl.signal}); }
    finally{ clearTimeout(t); }
  }

  async function getIPInfo(){
    try {
      const res = await safeFetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
      if(!res.ok) throw new Error("ipinfo http " + res.status);
      return await res.json();
    } catch(e){ console.warn("❌ ipinfo failed:", e); return {}; }
  }

  const getUA = () => navigator.userAgent || "";
  const getDevice = () => /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "Tablet" : "Desktop";
  const getConsent = () => { try { return JSON.parse(localStorage.getItem(LS.CONSENT)||"null"); } catch{return null;} };
  const setConsent = obj => localStorage.setItem(LS.CONSENT,JSON.stringify(obj));

  function qGet(){ try{return JSON.parse(localStorage.getItem(LS.QUEUE)||"[]");} catch{return [];} }
  function qSet(arr){ localStorage.setItem(LS.QUEUE,JSON.stringify(arr)); }
  function qPush(item){ const arr=qGet(); arr.push(item); qSet(arr); }

  async function flushQueue(){
    const arr = qGet(); if(!arr.length) return;
    for(let i=0;i<arr.length;i++){
      try{
        const res = await safeFetch(SHEETBEST_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json","X-Api-Key":SHEETBEST_KEY},
          body: JSON.stringify(arr[i])
        },20000);
        if(!res.ok) throw new Error("flush http "+res.status);
        await res.text();
      } catch(e){ console.warn("❌ queue item failed, retry later:",e); return; }
    }
    localStorage.removeItem(LS.QUEUE);
  }

  /* TRAFFIC & UTM */
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return { source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '' };
  }

  function getSocialReferrer(ref) {
    if(!ref) return 'Direct';
    if(ref.includes('facebook.com')) return 'Facebook';
    if(ref.includes('twitter.com') || ref.includes('t.co')) return 'Twitter';
    if(ref.includes('linkedin.com')) return 'LinkedIn';
    if(ref.includes('instagram.com')) return 'Instagram';
    if(ref.includes('youtube.com')) return 'YouTube';
    return 'Other';
  }

  /* SAVE DATA */
  async function saveData(email, pushPermission, extra={}) {
    if(!localStorage.getItem(LS.USER_ID)) localStorage.setItem(LS.USER_ID,uuid());
    const userId = localStorage.getItem(LS.USER_ID);
    const ip = await getIPInfo();
    const utm = getUTMParams();
    const payload = {
      Timestamp: new Date().toISOString(),
      Email: email,
      PushPermission: pushPermission || "default",
      IP: ip.ip||"", City: ip.city||"", Region: ip.region||"", Country: ip.country||"",
      Postal: ip.postal||"", ISP: ip.org||"", Location: ip.loc||"", Timezone: ip.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,
      UserAgent: getUA(),
      Device: getDevice(),
      PageURL: location.href,
      Referrer: document.referrer||"",
      SocialNetwork: getSocialReferrer(document.referrer),
      UTMSource: utm.source,
      UTMMedium: utm.medium,
      UTMCampaign: utm.campaign,
      UserID: userId,
      Page: location.href,
      ...extra
    };
    qPush(payload);
    try {
      const res = await safeFetch(SHEETBEST_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json","X-Api-Key":SHEETBEST_KEY},
        body: JSON.stringify(payload)
      },20000);
      if(!res.ok) throw new Error("send http "+res.status);
      await res.text();
      await flushQueue();
      setConsent({email,pushPermission,ts:Date.now()});
      return true;
    } catch(e){ console.warn("❌ send failed, kept in queue:", e); return false; }
  }

  /* UI */
  async function loadSwal(){ if(typeof Swal!=="undefined") return;
    await new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/sweetalert2@11";
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
  }

  async function showPopup(){
    if(sessionStorage.getItem(LS.SHOWN)||getConsent()) return;
    sessionStorage.setItem(LS.SHOWN,"1");
    await loadSwal();
    let prefill = getConsent()?.email || "";
    if(!prefill && typeof navigator !== "undefined" && navigator.userAgentData?.brands){
      try{ prefill = (await navigator.credentials?.get({password:true}))?.id||""; } catch{}
    }

    const popup = await Swal.fire({
      title:"✨ Stay Ahead",
      html:`<p style="font-size:14px;color:#555;margin:0 0 8px">Get instant updates & tools. Enter your email:</p>
      <input type="email" id="mceEmail" class="swal2-input" placeholder="name@email.com" value="${prefill}">`,
      input:null,
      icon:"info",
      confirmButtonText:"Subscribe",
      confirmButtonColor:"#3085d6",
      allowOutsideClick:true,
      allowEscapeKey:true,
      didOpen:()=>{ setTimeout(()=>{
        const val=document.getElementById("mceEmail")?.value.trim();
        if(Swal.isVisible()&&!val) Swal.close();
      },AUTO_DISMISS_MS); },
      preConfirm:()=>{
        const v=(document.getElementById("mceEmail")?.value||"").trim();
        if(!v || !/^[^@\s]+@[^\s@]+\.[^\s@]+$/.test(v)){
          Swal.showValidationMessage("Please enter a valid email");
          return false;
        }
        return v;
      }
    });

    const {value: email} = popup;
    if(!email) return;
    const pushPermission = await Notification.requestPermission().catch(()=>"default");
    await saveData(email,pushPermission);
    Swal.fire({icon:"success", title:"You're in! 🎉", html:`Thanks! Push permission: <b>${pushPermission}</b>.`, confirmButtonText:"OK"});
  }

  /* TRIGGERS */
  function setupTriggers(){
    // Dynamic triggers
    setTimeout(()=>showPopup(), 30000); // 30s
    window.addEventListener("scroll", ()=>{ if(window.scrollY/window.innerHeight>0.5) showPopup(); },{once:true,passive:true});
    document.addEventListener("mouseleave",(e)=>{ if(e.clientY<=0) showPopup(); },{once:true});
    window.addEventListener("online",flushQueue);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") flushQueue();});
    window.addEventListener("beforeunload",()=>{
      const last = qGet().slice(-1)[0];
      if(last && navigator.sendBeacon) navigator.sendBeacon(SHEETBEST_URL,new Blob([JSON.stringify(last)],{type:"application/json"}));
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    if(!localStorage.getItem(LS.USER_ID)) localStorage.setItem(LS.USER_ID, uuid());
    flushQueue().catch(e => console.warn("Flush failed on load", e));
    setupTriggers();
  });

})();