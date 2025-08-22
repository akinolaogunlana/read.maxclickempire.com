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
          <a href="/" style="font-weight:bold;color:#222;text-decoration:none;font-size:1.2rem;">🧠MaxClickEmpire</a>
          <ul style="display:flex;gap:1.5rem;list-style:none;margin:0;padding:0;">
            <li><a href="/" style="color:#444;text-decoration:none;">Home</a></li>
            <li><a href="/about.html" style="color:#444;text-decoration:none;">About</a></li>
            <li><a href="/contact.html" style="color:#444;text-decoration:none;">Contact</a></li>
          </ul>
        </nav>`;
      document.body.insertAdjacentElement("afterbegin", nav);
    }

    // ✅ SEO Metadata
    let h1 = article.querySelector("h1");
    const titleText = h1?.textContent.trim() || document.title;
    const desc = document.querySelector("meta[name='description']")?.content || "Digital strategy and free tools.";
    const firstImg = article.querySelector("img");
    const image = firstImg?.src || "/assets/og-image.jpg";

    const meta = window.postMetadata?.[slug] || {
      title: titleText,
      description: desc,
      image,
      published: new Date().toISOString()
    };

    [
      "og:title", "og:description", "og:url", "og:type", "og:image",
      "twitter:title", "twitter:description", "twitter:image", "twitter:card",
      "keywords"
    ].forEach(name => {
      const selector = `meta[property='${name}'], meta[name='${name}']`;
      const tag = document.querySelector(selector);
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
        logo: { "@type": "ImageObject", url: "https://read.maxclickempire.com" }
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": location.href }
    });
    document.head.appendChild(ld);

    // ✅ Hero
    if (h1 && !document.querySelector(".post-hero")) {
      const hero = document.createElement("section");
      hero.className = "post-hero";
      hero.innerHTML = `
        <div style="background: linear-gradient(to right, #f5f7fa, #e4ecf3); border-radius: 20px; padding: 2rem; text-align: center; margin-bottom: 2.5rem;">
          <p style="font-size: 0.9rem; color: #666;">📅 ${meta.published.split("T")[0]}</p>
          <p style="max-width:700px;margin:1rem auto;font-size:1rem;color:#444;">${meta.description}</p>
          <img src="${meta.image}" alt="Post image" style="max-width:100%;margin-top:1rem;border-radius:12px;" loading="lazy"/>
        </div>`;
      const h1Clone = h1.cloneNode(true);
      h1.remove();
      hero.querySelector("div").insertAdjacentElement("afterbegin", h1Clone);
      article.insertAdjacentElement("afterbegin", hero);
    }






    // ✅ Full-feature TOC with Back to Top
const headings = article.querySelectorAll("h2, h3");

if (headings.length && !document.querySelector("#toc")) {
  const toc = document.createElement("div");
  toc.id = "toc";
  toc.style.border = "1px solid #ccc";
  toc.style.padding = "1rem";
  toc.style.marginBottom = "1rem";
  toc.style.background = "#f9f9f9";
  toc.style.fontFamily = "Arial, sans-serif";

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
      li.innerHTML = `
        <span style="display:inline-block; cursor:pointer; user-select:none; transition: transform 0.3s;">▼</span>
        <a href="#${id}" style="margin-left:0.3rem; text-decoration:none; color:#333;">${h.textContent}</a>
      `;
      ul.appendChild(li);
      currentH2Li = li;
    } else if (h.tagName === "H3" && currentH2Li) {
      let subUl = currentH2Li.querySelector("ul");
      if (!subUl) {
        subUl = document.createElement("ul");
        subUl.style.paddingLeft = "1.5rem";
        subUl.style.overflow = "hidden";
        subUl.style.maxHeight = "0px"; // start collapsed
        subUl.style.transition = "max-height 0.3s ease";
        currentH2Li.appendChild(subUl);
      }
      const li = document.createElement("li");
      li.style.listStyle = "disc";
      li.style.marginBottom = "0.2rem";
      li.innerHTML = `<a href="#${id}" style="text-decoration:none; color:#555;">${h.textContent}</a>`;
      subUl.appendChild(li);
    }
  });

  article.insertAdjacentElement("afterbegin", toc);

  const toggleBtn = toc.querySelector("#toggle-toc");
  const backToTopBtn = toc.querySelector("#back-to-top");

  // ✅ Load saved TOC visibility
  const tocState = localStorage.getItem("tocVisible");
  if (tocState === "hidden") {
    ul.style.display = "none";
    toggleBtn.textContent = "Show TOC";
  }

  // ✅ Toggle TOC visibility
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

  // ✅ Collapse/Expand sublists with rotating arrows
  const h2Items = ul.querySelectorAll("li > span");
  h2Items.forEach(span => {
    const subUl = span.parentElement.querySelector("ul");
    if (subUl) {
      span.style.transform = "rotate(-90deg)"; // start collapsed
      span.addEventListener("click", e => {
        if (subUl.style.maxHeight === "0px") {
          subUl.style.maxHeight = subUl.scrollHeight + "px";
          span.style.transform = "rotate(0deg)";
        } else {
          subUl.style.maxHeight = "0px";
          span.style.transform = "rotate(-90deg)";
        }
      });
    } else {
      span.style.visibility = "hidden"; // hide arrow if no subitems
    }
  });

  // ✅ Smooth scroll for TOC links
  const tocLinks = ul.querySelectorAll("a[href^='#']");
  tocLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 20,
          behavior: "smooth"
        });
      }
    });
  });

  // ✅ Back to Top button
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // ✅ Highlight current section while scrolling
  const allTocLinks = ul.querySelectorAll("a");
  const headingOffsets = Array.from(headings).map(h => ({
    id: h.id,
    offset: h.offsetTop
  }));

  window.addEventListener("scroll", () => {
    const scrollPos = window.scrollY + 30;
    let current = headingOffsets[0].id;
    for (const h of headingOffsets) {
      if (scrollPos >= h.offset) current = h.id;
    }

    allTocLinks.forEach(a => {
      a.style.fontWeight = a.getAttribute("href").substring(1) === current ? "bold" : "normal";
      a.style.color = a.getAttribute("href").substring(1) === current ? "#007BFF" : a.style.color;
    });
  });
}







    // ✅ Ultra-Smart Related Posts + TOC

if (!document.querySelector("#related-posts") && window.postMetadata) {
  const meta = window.postMetadata[slug];
  if (!meta) return;

  const stopWords = ["the","and","or","of","a","an","in","on","for","with","to","at","by","is","it","this"];

  const extractWords = text => (text.toLowerCase().match(/\b\w+\b/g) || []);
  let keywords = [...extractWords(meta.title), ...extractWords(meta.description)];
  if (meta.tags) keywords = [...keywords, ...meta.tags.map(tag => tag.toLowerCase())];
  keywords = keywords.filter(word => !stopWords.includes(word));

  // ✅ Weighted and partial matches
  const scoredPosts = Object.entries(window.postMetadata)
    .filter(([key]) => key !== slug)
    .map(([key, data]) => {
      const dataText = (data.title + " " + data.description + (data.tags ? " " + data.tags.join(" ") : "")).toLowerCase();
      let score = 0;
      keywords.forEach(word => {
        const regex = new RegExp(word, "i"); // partial match
        if (regex.test(data.title)) score += 3; // title weight
        else if (regex.test(data.description)) score += 1; // description weight
        else if (data.tags && data.tags.some(tag => regex.test(tag.toLowerCase()))) score += 2; // tag weight
      });
      return { slug: key, data, score };
    })
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,3);

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
          " data-slug="${item.slug}" data-preview="${item.data.description.slice(0,150)}">
            <strong style="color:#333;">${item.data.title}</strong><br/>
            <small style="color:#777;">${item.data.description.slice(0,100)}${item.data.description.length > 100 ? "..." : ""}</small>
          </a>
        `).join("")}
      </div>
    `;
    article.appendChild(relatedBlock);

    // Hover effects + TOC expand + scroll + preview tooltip
    const links = relatedBlock.querySelectorAll("a");
    links.forEach(a => {
      // Hover animation
      a.addEventListener("mouseenter", () => {
        a.style.transform = "translateY(-3px)";
        a.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        // Tooltip preview
        const tooltip = document.createElement("div");
        tooltip.className = "related-tooltip";
        tooltip.style.position = "absolute";
        tooltip.style.top = "100%";
        tooltip.style.left = "0";
        tooltip.style.padding = "0.5rem";
        tooltip.style.background = "#fff";
        tooltip.style.border = "1px solid #ccc";
        tooltip.style.borderRadius = "6px";
        tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        tooltip.style.width = "250px";
        tooltip.style.zIndex = 9999;
        tooltip.innerText = a.dataset.preview;
        a.appendChild(tooltip);
      });
      a.addEventListener("mouseleave", () => {
        a.style.transform = "translateY(0)";
        a.style.boxShadow = "none";
        const tooltip = a.querySelector(".related-tooltip");
        if (tooltip) tooltip.remove();
      });

      // Click: scroll to section + TOC auto-expand
      a.addEventListener("click", e => {
        e.preventDefault();
        const relatedSlug = a.dataset.slug;
        const targetHeading = document.querySelector(`#toc a[href*='${relatedSlug}']`);
        if (targetHeading) {
          const parentLi = targetHeading.closest("li");
          const arrow = parentLi.querySelector("span");
          const subUl = parentLi.querySelector("ul");
          if (subUl && subUl.style.maxHeight === "0px") {
            subUl.style.maxHeight = subUl.scrollHeight + "px";
            if (arrow) arrow.style.transform = "rotate(0deg)";
          }
          const targetSection = document.querySelector(`#${relatedSlug}`);
          if (targetSection) {
            window.scrollTo({ top: targetSection.offsetTop - 20, behavior: "smooth" });
          }
        } else {
          window.location.href = `/posts/${relatedSlug}.html`; // fallback
        }
      });
    });
  }
}

// ✅ Ultra-smart TOC auto-highlight on scroll
const tocLinks = document.querySelectorAll("#toc a");
const headings = Array.from(tocLinks).map(a => {
  const id = a.getAttribute("href").replace("#","");
  return { id, link: a, offset: document.getElementById(id)?.offsetTop || 0 };
});

window.addEventListener("scroll", () => {
  const scrollPos = window.scrollY + 30;
  let current = headings[0];
  for (const h of headings) {
    if (scrollPos >= h.offset) current = h;
  }
  tocLinks.forEach(a => {
    if (a === current.link) {
      a.style.fontWeight = "bold";
      a.style.color = "#007BFF";
    } else {
      a.style.fontWeight = "normal";
      a.style.color = a.style.color.includes("#007BFF") ? "#333" : a.style.color;
    }
  });

  // Auto-expand collapsed TOC sections
  const currentLi = current.link.closest("li");
  if (currentLi) {
    const subUl = currentLi.querySelector("ul");
    const arrow = currentLi.querySelector("span");
    if (subUl && subUl.style.maxHeight === "0px") {
      subUl.style.maxHeight = subUl.scrollHeight + "px";
      if (arrow) arrow.style.transform = "rotate(0deg)";
    }
  }
});









    // ✅ Footer
if (!document.querySelector("footer.site-footer")) {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div style="text-align:center; padding:2rem; color:#888; font-size:0.9rem; border-top:1px solid #eee; margin-top:3rem;">
      &copy; ${new Date().getFullYear()} MaxClickEmpire. All rights reserved. |
      <a href="/privacy-policy.html" style="color:#666;">Privacy Policy</a>
    </div>
  `;
  document.body.appendChild(footer);
}

// ✅ Back to Top button (works if #back-to-top exists)
const backToTopBtn = document.querySelector("#back-to-top");
if (backToTopBtn) {
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}







    // ✅ Dark Mode
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }

    // ✅ Debug
    if (location.search.includes("debugSEO")) {
      console.log("🔍 SEO Meta Loaded:", meta);
    }
  }
})();
