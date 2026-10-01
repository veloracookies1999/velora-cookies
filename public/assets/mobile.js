/* VELORA COOKIES — DEDICATED MOBILE UI
   Desktop remains untouched. No typewriter.
*/
(() => {
  "use strict";

  const BP = 767;
  const isMobile = () => window.innerWidth <= BP;
  const route = () => (location.hash || "#/").replace(/^#/, "") || "/";

  const svg = (name) => {
    const p = {
      home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
      grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      bag:'<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      heart:'<path d="M20.8 8.9c0 5.1-8.8 10.3-8.8 10.3S3.2 14 3.2 8.9A5 5 0 0 1 12 6a5 5 0 0 1 8.8 2.9Z"/>',
      user:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[name]||p.grid)+'</svg>';
  };

  const active = key => {
    const r = route();
    if (key === "home") return r === "/";
    if (key === "shop") return r === "/shop" || r.startsWith("/product/");
    if (key === "orders") return r.startsWith("/orders");
    if (key === "wishlist") return r.startsWith("/wishlist");
    if (key === "profile") return r.startsWith("/profile") || r.startsWith("/notifications");
    return false;
  };

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
      </header>`;
  }

  function bottom() {
    const items = [
      ["home","#/","Beranda"],["shop","#/shop","Koleksi"],["orders","#/orders","Pesanan"],
      ["wishlist","#/wishlist","Wishlist"],["profile","#/profile","Akun"]
    ];
    return `
      <nav class="vm-bottom" data-vm-ui aria-label="Navigasi mobile">
        <div class="vm-bottom-inner">
          ${items.map(([key,href,label]) => `
            <a class="vm-nav-item ${active(key)?"active":""}" data-key="${key}" href="${href}">
              <span class="vm-nav-icon">${svg(key==="shop"?"grid":key==="orders"?"bag":key==="wishlist"?"heart":key)}</span>
              <span class="vm-nav-label">${label}</span>
            </a>`).join("")}
        </div>
      </nav>`;
  }

  function cleanLegacy() {
    document.querySelectorAll(".top,.mobile-appbar,.mobile-bottom-nav").forEach(el => {
      el.style.setProperty("display","none","important");
    });
  }

  function ensureStaticHome() {
    const app = document.querySelector("#app");
    const home = app?.querySelector(".velora-home");
    const mobile = home?.querySelector(":scope > main.mobile-commerce-home.m3-home");
    const desktop = home?.querySelector(":scope > main:not(.mobile-commerce-home)");
    if (!home || !mobile) return;

    if (desktop) {
      desktop.style.setProperty("display","none","important");
      desktop.style.setProperty("visibility","hidden","important");
    }

    mobile.style.setProperty("display","block","important");
    mobile.style.setProperty("visibility","visible","important");
    mobile.style.setProperty("opacity","1","important");

    const old = mobile.querySelector(".m3-title");
    if (old) {
      old.style.setProperty("display","block","important");
      old.style.setProperty("width","100%","important");
      old.style.setProperty("height","auto","important");
      old.style.setProperty("min-height","0","important");
      old.style.setProperty("max-height","none","important");
      old.style.setProperty("overflow","visible","important");
      old.style.setProperty("white-space","normal","important");
      old.style.setProperty("animation","none","important");
      old.style.setProperty("transition","none","important");
      old.style.setProperty("transform","none","important");
      old.textContent = "Cookies kecil, mood besar.";
    }
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

  function updateNav() {
    document.querySelectorAll(".vm-nav-item").forEach(el => {
      el.classList.toggle("active", active(el.dataset.key));
    });
  }

  function mount() {
    if (!isMobile()) return;
    document.body.classList.add("vm-active");
    cleanLegacy();

    if (!document.querySelector(".vm-header")) {
      document.body.insertAdjacentHTML("afterbegin", header());
    }
    if (!document.querySelector(".vm-bottom")) {
      document.body.insertAdjacentHTML("beforeend", bottom());
    }

    bindSearch();
    updateNav();
    ensureStaticHome();
  }

  function unmount() {
    document.body.classList.remove("vm-active");
    document.querySelectorAll("[data-vm-ui]").forEach(el => el.remove());
  }

  let raf = 0;
  function refresh() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (isMobile()) mount();
      else unmount();
    });
  }

  function init() {
    refresh();
    window.addEventListener("hashchange", refresh);
    window.addEventListener("resize", refresh);

    const observer = new MutationObserver(records => {
      if (!isMobile()) return;
      const relevant = records.some(record =>
        [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && !node.matches("[data-vm-ui], [data-vm-ui] *")
        )
      );
      if (relevant) refresh();
    });

    observer.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();