// ===== SEO Enhancer & Site Enhancements (Async Version) =====
(function () {
  console.log("✅ seo-enhancer.js loaded");

  // ===== UTILITY =====
  function waitFor(conditionFn, callback, interval = 50, timeout = 3000) {
    const start = Date.now();
    const poll = () => {
      if (conditionFn()) return callback();
      if (Date.now() - start >= timeout) return console.warn("⏳ postMetadata not loaded in time.");
      setTimeout(poll, interval);
    };
    poll();
  }

  function onDomReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else callback();
  }

  // ===== INIT =====
  onDomReady(() => waitFor(() => !!window.postMetadata, initSeoEnhancer));

  function initSeoEnhancer() {
    try {
      const slug = location.pathname.split("/").pop()?.replace(".html", "") || "";
      const pathSlug = location.pathname.replace(/^\/+/, "").replace(/.html$/, "");
      const skipPages = ["about", "contact", "privacy-policy", "terms"];
      if (skipPages.includes(pathSlug)) return;

      const article = document.querySelector("article");  
      if (!article) return;  

      addNavigation();  
      const meta = setupMetadata(article, slug);  
      setupHero(article, meta);  

      // Async enhancements  
      setTimeout(() => {  
        loadTOC(article);  
        loadRelatedPosts(slug, article);  
        loadShareButtons(article);  
      }, 0);  

      addFooter();  
      applyDarkMode();  

      if (location.search.includes("debugSEO")) console.log("🔍 SEO Meta Loaded:", meta);  

    } catch (e) {  
      console.error("❌ SEO Enhancer Error:", e);  
    }
  }

  // ===== NAVIGATION =====
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

  // ===== METADATA =====
  function setupMetadata(article, slug) {
    const h1 = article.querySelector("h1");
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

    // Remove old meta  
    ["og:title","og:description","og:url","og:type","og:image",  
     "twitter:title","twitter:description","twitter:image","twitter:card",  
     "keywords","description"].forEach(name => {  
      document.querySelectorAll(`meta[property='${name}'], meta[name='${name}']`).forEach(tag => tag.remove());  
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

    // JSON-LD  
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

    return meta;
  }

  // ===== HERO =====
  function setupHero(article, meta) {
    const h1 = article.querySelector("h1");
    if (!h1 || document.querySelector(".post-hero")) return;

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

  // ===== FOOTER =====
  function addFooter() {
    if (document.querySelector("footer.site-footer")) return;

    const footer = document.createElement("footer");  
    footer.className = "site-footer";  
    footer.style.cssText = "text-align:center;padding:2rem;color:#888;font-size:0.9rem;border-top:1px solid #eee;margin-top:3rem;background:#fafafa;";  
    footer.innerHTML = `&copy; ${new Date().getFullYear()} MaxClickEmpire. All rights reserved. |  
      <a href="/privacy-policy.html" style="color:#666;">Privacy Policy</a>`;  
    document.body.insertAdjacentElement("beforeend", footer);
  }

  // ===== DARK MODE =====
  function applyDarkMode() {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-theme");
    }
  }

  // ===== ASYNC TOC =====
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

    // TOC toggle  
    const toggleBtn = toc.querySelector("#toggle-toc");  
    const backToTopBtn = toc.querySelector("#back-to-top");  
    const tocState = localStorage.getItem("tocVisible");  
    if (tocState === "hidden") ul.style.display = "none", toggleBtn.textContent = "Show TOC";  

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

    // Sublist collapse/expand  
    ul.querySelectorAll("li > span").forEach(span => {  
      const subUl = span.parentElement.querySelector("ul");  
      if (subUl) {  
        span.style.transform = "rotate(-90deg)";  
        span.addEventListener("click", () => {  
          if (subUl.style.maxHeight === "0px") {  
            subUl.style.maxHeight = subUl.scrollHeight + "px";  
            span.style.transform = "rotate(0deg)";  
          } else {  
            subUl.style.maxHeight = "0px";  
            span.style.transform = "rotate(-90deg)";  
          }  
        });  
      } else span.style.visibility = "hidden";  
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

  // ===== ASYNC Related Posts =====
  function loadRelatedPosts(slug, article) {
    if (!window.postMetadata || document.querySelector("#related-posts")) return;
    const metaData = window.postMetadata[slug];
    if (!metaData) return;

    const stopWords = ["the","and","or","of","a","an","in","on","for","with","to","at","by","is","it","this"];  
    const extractWords = text => (text.toLowerCase().match(/\b\w+\b/g) || []);  
    let keywords = [...extractWords(metaData.title), ...extractWords(metaData.description)];  
    if (metaData.tags) keywords = [...keywords, ...metaData.tags.map(t => t.toLowerCase())];  
    keywords = keywords.filter(w => !stopWords.includes(w));  

    const scoredPosts = Object.entries(window.postMetadata)  
      .filter(([key]) => key !== slug)  
      .map(([key, data]) => {  
        const dataText = (data.title + " " + data.description + (data.tags ? " " + data.tags.join(" ") : "")).toLowerCase();  
        let score = 0;  
        keywords.forEach(word => {  
          const regex = new RegExp(word, "i");  
          if (regex.test(data.title)) score += 3;  
          else if (regex.test(data.description)) score += 1;  
          else if (data.tags && data.tags.some(tag => regex.test(tag.toLowerCase()))) score += 2;  
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
              <small style="color:#777;">${item.data.description.slice(0,100)}${item.data.description.length>100?"...":""}</small>  
            </a>  
          `).join("")}  
        </div>  
      `;  
      article.appendChild(relatedBlock);  
    }
  }

  // ===== ASYNC Share Buttons (Professional + Responsive) =====
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

    const url = window.location.href;
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
          }
          else if (platform === "native") {  
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




















// ===== MaxClickEmpire – Full Email + Push + IP Tracking + Auto-Push =====
(function () {
  console.log("✅ enhancer.js loaded");

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCO-ekZJ_sT3oJM3JdvPzlwsJOU3VvU0Hu2zSFSuqDuH8KI/exec";
  const IPINFO_TOKEN = "91dbe52aeb0873";
  const SW_PATH = "/sw.js";
  const AUTO_DISMISS_TIME = 25000; // 25 seconds

  const uuid = () => ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c/4))).toString(16));

  async function getIPInfo() {
    try {
      const res = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
      return await res.json();
    } catch (e) {
      console.warn("❌ IP fetch failed:", e);
      return {};
    }
  }

  function getUserAgent() {
    return navigator.userAgent || "unknown";
  }

  async function saveData(email, pushPermission) {
    const ipInfo = await getIPInfo();
    const ua = getUserAgent();

    if (!localStorage.getItem("user_id")) localStorage.setItem("user_id", uuid());
    const userId = localStorage.getItem("user_id");

    const payload = {
      Timestamp: new Date().toISOString(),
      Email: email,
      PushPermission: pushPermission || "denied",
      LastPushSent: "",
      IP: ipInfo.ip || "",
      City: ipInfo.city || "",
      Region: ipInfo.region || "",
      Country: ipInfo.country || "",
      Postal: ipInfo.postal || "",
      ISP: ipInfo.org || "",
      Location: ipInfo.loc || "",
      Timezone: ipInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      UserAgent: ua,
      PageURL: location.href,
      Referrer: document.referrer || "",
      UserID: userId,
      Page: location.href
    };

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      });
      const text = await res.text();
      console.log("📩 Apps Script response:", text);

      // Save local consent to prevent re-showing popup
      localStorage.setItem("user_consent", JSON.stringify({ email, pushPermission, timestamp: new Date() }));
    } catch (err) {
      console.error("❌ Failed to save data:", err);
    }
  }

  async function requestPush() {
    if (!("Notification" in window)) return "unsupported";
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted" && "serviceWorker" in navigator) {
        await navigator.serviceWorker.register(SW_PATH);
        await navigator.serviceWorker.ready;
      }
      return perm;
    } catch (err) {
      console.warn("❌ Push permission error:", err);
      return "error";
    }
  }

  async function showPopup() {
    if (typeof Swal === "undefined") {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    let storedEmail = null;
    try {
      const consent = JSON.parse(localStorage.getItem("user_consent"));
      if (consent && consent.email) storedEmail = consent.email;
    } catch (e) {
      console.warn("Failed to parse stored consent:", e);
    }

    const popup = Swal.fire({
      title: "✨ Stay Ahead ✨",
      html: `
        <p style="font-size:16px; line-height:1.5; color:#444;">
          Join <b>10,000+ smart users</b> who get instant updates, insights & tools.  
          <br><br>
          Just one click gives you:<br>
          ✅ Free insider updates to your email<br>
          ✅ Push notifications directly to your device
        </p>
        <input type="email" id="userEmail" class="swal2-input" placeholder="Enter your email" value="${storedEmail || ''}" required>
      `,
      icon: "info",
      confirmButtonText: "🚀 Subscribe & Enable Alerts",
      confirmButtonColor: "#3085d6",
      allowOutsideClick: true,
      didOpen: () => {
        setTimeout(() => {
          if (Swal.isVisible()) Swal.close();
        }, AUTO_DISMISS_TIME);
      },
      preConfirm: () => {
        const emailInput = document.getElementById("userEmail").value.trim();
        if (!emailInput || !/^[^@\s]+@[^\s@]+\.[^@\s]+$/.test(emailInput)) {
          Swal.showValidationMessage("⚠️ Please enter a valid email address");
          return false;
        }
        return emailInput;
      }
    });

    const { value: email } = await popup;

    if (email) {
      const pushPermission = await requestPush();
      await saveData(email, pushPermission);

      Swal.fire({
        icon: "success",
        title: "🎉 You're In!",
        html: `Thanks! You're subscribed and push alerts are <b>${pushPermission}</b>.`,
        confirmButtonText: "Awesome!"
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!localStorage.getItem("user_consent")) showPopup();
  });
})();