/* VELORA COOKIES — MOBILE EXPERIENCE
   Dedicated mobile UI controller.
   Desktop layout is left untouched.
*/
(() => {
  "use strict";

  if (window.__VELORA_MOBILE_APP_V3__) return;
  window.__VELORA_MOBILE_APP_V3__ = true;

  const BP = 767;
  const isMobile = () => window.innerWidth <= BP;
  const currentRoute = () => (location.hash || "#/").replace(/^#/, "") || "/";

  const svg = (name) => {
    const paths = {
      home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
      grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      bag:'<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      heart:'<path d="M20.8 8.9c0 5.1-8.8 10.3-8.8 10.3S3.2 14 3.2 8.9A5 5 0 0 1 12 6a5 5 0 0 1 8.8 2.9Z"/>',
      user:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name] || paths.grid)+'</svg>';
  };

  function active(key) {
    const r = currentRoute();
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
            <span class="vm-brand-mark">${svg("bag")}</span>
            <span class="vm-brand-copy"><strong>VELORA</strong><small>COOKIES</small></span>
          </a>
          <div class="vm-header-actions">
            <a class="vm-head-icon" href="#/notifications" aria-label="Notifikasi">${svg("bell")}<i></i></a>
            <a class="vm-head-icon" href="#/cart" aria-label="Keranjang">${svg("bag")}</a>
          </div>
        </div>
        <form class="vm-search" data-vm-search>
          <span class="vm-search-icon">${svg("search")}</span>
          <input name="q" inputmode="search" autocomplete="off" placeholder="Cari cookies favoritmu..." aria-label="Cari cookies">
          <button type="submit" aria-label="Cari">${svg("arrow")}</button>
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
          ${items.map(([key,href,label]) => `
            <a class="vm-nav-item ${active(key) ? "active" : ""}" data-key="${key}" href="${href}">
              <span class="vm-nav-icon">${svg(key==="shop"?"grid":key==="orders"?"bag":key==="wishlist"?"heart":key)} </span>
              <span class="vm-nav-label">${label}</span>
            </a>
          `).join("")}
        </div>
      </nav>
    `;
  }

  function bindSearch() {
    const form = document.querySelector("[data-vm-search]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    form.addEventListener("submit", e => {
      e.preventDefault();
      const q = form.querySelector("input")?.value.trim() || "";
      location.hash = q ? "/shop?q=" + encodeURIComponent(q) + "&category=&sort=featured" : "/shop";
    });
  }

  function cleanLegacyMobileUI() {
    document.querySelectorAll(".top,.mobile-appbar,.mobile-bottom-nav").forEach(el => {
      el.style.setProperty("display","none","important");
    });
  }

  function ensureHomeVisibility() {
    const app = document.querySelector("#app");
    if (!app) return;

    const home = app.querySelector(".velora-home");
    if (!home) return;

    const desktopMain = home.querySelector(":scope > main:not(.mobile-commerce-home)");
    const mobileMain = home.querySelector(":scope > main.mobile-commerce-home");

    if (desktopMain) {
      desktopMain.style.setProperty("display","none","important");
      desktopMain.style.setProperty("visibility","hidden","important");
      desktopMain.style.setProperty("opacity","0","important");
    }

    if (mobileMain) {
      mobileMain.style.setProperty("display","block","important");
      mobileMain.style.setProperty("visibility","visible","important");
      mobileMain.style.setProperty("opacity","1","important");
      mobileMain.hidden = false;

      // Force a plain, permanent mobile title. No typewriter, no animated text.
      let title = mobileMain.querySelector(".vm-mobile-static-title");
      if (!title) {
        title = document.createElement("h1");
        title.className = "vm-mobile-static-title";
        title.textContent = "Cookies kecil, mood besar.";
        const copy = mobileMain.querySelector(".m3-hero-copy");
        if (copy) copy.prepend(title);
        else mobileMain.prepend(title);
      }

      title.textContent = "Cookies kecil, mood besar.";
      Object.assign(title.style, {
        display:"block",
        visibility:"visible",
        opacity:"1",
        width:"100%",
        height:"auto",
        minHeight:"0",
        maxHeight:"none",
        overflow:"visible",
        whiteSpace:"normal",
        animation:"none",
        transition:"none",
        transform:"none",
        clipPath:"none",
        margin:"0 0 12px",
        padding:"0",
        color:"#281b31",
        fontFamily:'"Playfair Display", Georgia, serif',
        fontSize:"36px",
        lineHeight:"1.02",
        letterSpacing:"-.055em"
      });
    }
  }

  function mount() {
    if (!isMobile()) return;

    document.body.classList.add("vm-active");
    cleanLegacyMobileUI();

    document.querySelectorAll("[data-vm-ui]").forEach(el => el.remove());
    document.body.insertAdjacentHTML("afterbegin", header());
    document.body.insertAdjacentHTML("beforeend", bottom());

    ensureHomeVisibility();
    bindSearch();

    document.querySelectorAll(".vm-nav-item").forEach(el => {
      el.classList.toggle("active", active(el.dataset.key));
    });
  }

  function unmount() {
    document.body.classList.remove("vm-active");
    document.querySelectorAll("[data-vm-ui]").forEach(el => el.remove());
  }

  let queued = false;
  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!isMobile()) {
        unmount();
        return;
      }
      mount();
    });
  }

  function init() {
    // mobile.js is a classic script while app.js is a deferred module.
    // Therefore app.js may render #app AFTER this controller starts.
    // Observe the document body so the mobile layer also mounts when
    // the SPA finishes its first render or rerenders the current route.
    refresh();

    window.addEventListener("hashchange", refresh);
    window.addEventListener("resize", refresh);

    const root = document.body;
    if (root) {
      const observer = new MutationObserver(() => {
        if (isMobile()) refresh();
      });

      observer.observe(root, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();