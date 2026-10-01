/* VELORA COOKIES — MOBILE EXPERIENCE
   Mobile-only controller. Desktop DOM/behavior is intentionally untouched.
*/
(() => {
  "use strict";

  if (window.__VELORA_MOBILE_APP_V2__) return;
  window.__VELORA_MOBILE_APP_V2__ = true;

  const BP = 767;
  const mobile = () => window.innerWidth <= BP;
  const route = () => (location.hash || "#/").replace(/^#/, "") || "/";
  const icon = (name) => {
    const paths = {
      home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
      grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      bag:'<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      heart:'<path d="M20.8 8.9c0 5.1-8.8 10.3-8.8 10.3S3.2 14 3.2 8.9A5 5 0 0 1 12 6a5 5 0 0 1 8.8 2.9Z"/>',
      user:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
      chevron:'<path d="m9 18 6-6-6-6"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.grid)+'</svg>';
  };

  function active(key) {
    const r = route();
    if (key === "home") return r === "/";
    if (key === "shop") return r === "/shop" || r.startsWith("/product/");
    if (key === "orders") return r.startsWith("/orders");
    if (key === "wishlist") return r.startsWith("/wishlist");
    if (key === "profile") return r.startsWith("/profile") || r.startsWith("/notifications");
    return false;
  }

  function header() {
    return `
      <header class="vm-header" data-vm-ui>
        <div class="vm-header-main">
          <a class="vm-brand" href="#/" aria-label="VELORA Cookies">
            <span class="vm-brand-mark">${icon("bag")}</span>
            <span class="vm-brand-copy">
              <strong>VELORA</strong>
              <small>COOKIES</small>
            </span>
          </a>
          <div class="vm-header-actions">
            <a class="vm-head-icon" href="#/notifications" aria-label="Notifikasi">${icon("bell")}<i></i></a>
            <a class="vm-head-icon" href="#/cart" aria-label="Keranjang">${icon("bag")}</a>
          </div>
        </div>
        <form class="vm-search" data-vm-search>
          <span class="vm-search-icon">${icon("search")}</span>
          <input name="q" inputmode="search" autocomplete="off" placeholder="Cari cookies favoritmu..." aria-label="Cari cookies">
          <button type="submit" aria-label="Cari">${icon("arrow")}</button>
        </form>
      </header>
    `;
  }

  function bottom() {
    const items = [
      ["home","#/","Beranda"],
      ["shop","#/shop","Koleksi"],
      ["orders","#/orders","Pesanan"],
      ["wishlist","#/wishlist","Wishlist"],
      ["profile","#/profile","Akun"]
    ];
    return `
      <nav class="vm-bottom" data-vm-ui aria-label="Navigasi mobile">
        <div class="vm-bottom-inner">
          ${items.map(([key,href,label])=>`
            <a class="vm-nav-item ${active(key)?"active":""}" data-key="${key}" href="${href}">
              <span class="vm-nav-icon">${icon(key==="shop"?"grid":key==="orders"?"bag":key==="wishlist"?"heart":key)}</span>
              <span class="vm-nav-label">${label}</span>
            </a>`).join("")}
        </div>
      </nav>
    `;
  }

  function setBodyState() {
    document.body.classList.toggle("vm-active", mobile());
  }

  function markExistingMobileRegions() {
    document.querySelector(".hero-home")?.classList.add("vm-home-region");
    document.querySelector(".hero-home-copy")?.classList.add("vm-home-copy");
    document.querySelector(".hero-home-inner")?.classList.add("vm-home-inner");
  }

  function refreshNav() {
    document.querySelectorAll(".vm-nav-item").forEach(el => {
      el.classList.toggle("active", active(el.dataset.key));
    });
  }


  function startMobileTypewriter() {
    if (!mobile()) return;
    const title = document.querySelector(".m3-title");
    const first = title?.querySelector(".m3-type-one");
    const second = title?.querySelector(".m3-type-two");
    if (!title || !first || !second) {
      window.setTimeout(startMobileTypewriter, 120);
      return;
    }
    if (title.dataset.typewriterDone === "1" || title.dataset.typewriterRunning === "1") return;

    const a = first.dataset.text || "Cookies kecil,";
    const b = second.dataset.text || "mood besar.";
    first.dataset.text = a;
    second.dataset.text = b;
    title.dataset.typewriterRunning = "1";
    first.textContent = "";
    second.textContent = "";

    let i = 0;
    let j = 0;
    const finish = () => {
      first.textContent = a;
      second.textContent = b;
      title.dataset.typewriterRunning = "0";
      title.dataset.typewriterDone = "1";
    };
    const typeSecond = () => {
      if (!document.body.contains(title) || !mobile()) return;
      if (j < b.length) {
        second.textContent = b.slice(0, ++j);
        window.setTimeout(typeSecond, 65);
      } else {
        finish();
      }
    };
    const typeFirst = () => {
      if (!document.body.contains(title) || !mobile()) return;
      if (i < a.length) {
        first.textContent = a.slice(0, ++i);
        window.setTimeout(typeFirst, 65);
      } else {
        window.setTimeout(typeSecond, 220);
      }
    };
    typeFirst();
  }
  function bindSearch() {
    const form = document.querySelector("[data-vm-search]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    form.addEventListener("submit", e => {
      e.preventDefault();
      const q = form.querySelector("input")?.value.trim() || "";
      location.hash = q ? "/shop?q="+encodeURIComponent(q)+"&category=&sort=featured" : "/shop";
    });
  }

  function mount() {
    if (!mobile()) return;
    setBodyState();

    document.querySelectorAll("[data-vm-ui]").forEach(el => el.remove());

    const app = document.querySelector("#app");
    if (!app) return;

    /* IMPORTANT: header belongs BEFORE app content, never after it. */
    app.insertAdjacentHTML("beforebegin", header());
    document.body.insertAdjacentHTML("beforeend", bottom());

    markExistingMobileRegions();
    startMobileTypewriter();
    window.setTimeout(startMobileTypewriter, 180);
    bindSearch();
    refreshNav();
  }

  function unmount() {
    document.body.classList.remove("vm-active");
    document.querySelectorAll("[data-vm-ui]").forEach(el => el.remove());
  }

  let refreshQueued = false;
  function refresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      if (!mobile()) return unmount();
      setBodyState();
      if (!document.querySelector(".vm-header")) mount();
      else {
        markExistingMobileRegions();
        startMobileTypewriter();
        window.setTimeout(startMobileTypewriter, 180);
        refreshNav();
        bindSearch();
      }
    });
  }

  function init() {
    refresh();

    window.addEventListener("hashchange", refresh, {passive:true});
    window.addEventListener("resize", refresh, {passive:true});

    const app = document.querySelector("#app");
    if (app) {
      new MutationObserver(() => {
        if (mobile()) refresh();
      }).observe(app, {childList:true, subtree:true});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();