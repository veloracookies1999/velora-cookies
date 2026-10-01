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

    const homeRoot = app.querySelector(".velora-home");
    const mobileHome = homeRoot?.querySelector(":scope > main.mobile-commerce-home");

    /*
     * HARD MOBILE HOME ISOLATION:
     * The mobile homepage is detached from the desktop .velora-home
     * wrapper so legacy desktop/mobile CSS can no longer hide it.
     */
    if (mobileHome && !mobileHome.dataset.vmDetached) {
      mobileHome.dataset.vmDetached = "1";

      const shell = document.createElement("div");
      shell.className = "vm-home-shell";
      shell.setAttribute("data-vm-home-shell", "1");

      mobileHome.parentNode.insertBefore(shell, mobileHome);
      shell.appendChild(mobileHome);

      const footer = homeRoot?.querySelector(":scope > .footer");
      if (footer) {
        footer.classList.add("vm-mobile-footer");
        shell.appendChild(footer);
      }

      if (homeRoot) {
        homeRoot.remove();
      }
    }

    const detachedHome = document.querySelector(".vm-home-shell .m3-home");

    if (detachedHome) {
      detachedHome.style.setProperty("display", "block", "important");
      detachedHome.style.setProperty("visibility", "visible", "important");
      detachedHome.style.setProperty("opacity", "1", "important");
      detachedHome.hidden = false;

      const title = detachedHome.querySelector(".m3-title");
      if (title) {
        title.textContent = "Cookies kecil, mood besar.";
        title.style.setProperty("display", "block", "important");
        title.style.setProperty("width", "100%", "important");
        title.style.setProperty("height", "auto", "important");
        title.style.setProperty("min-height", "0", "important");
        title.style.setProperty("max-height", "none", "important");
        title.style.setProperty("overflow", "visible", "important");
        title.style.setProperty("visibility", "visible", "important");
        title.style.setProperty("opacity", "1", "important");
        title.style.setProperty("animation", "none", "important");
        title.style.setProperty("transition", "none", "important");
        title.style.setProperty("clip-path", "none", "important");
        title.style.setProperty("white-space", "normal", "important");
      }
    }

    const shell = document.querySelector(".vm-home-shell");
    if (shell) {
      shell.style.setProperty("display", "block", "important");
      shell.style.setProperty("visibility", "visible", "important");
      shell.style.setProperty("opacity", "1", "important");
    }

    document.body.insertAdjacentHTML("afterbegin", header());
    document.body.insertAdjacentHTML("beforeend", bottom());

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