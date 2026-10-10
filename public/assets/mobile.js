/* VELORA COOKIES — DEDICATED MOBILE UI
   Desktop remains untouched. No typewriter.
*/
(() => {
  "use strict";

  const BP = 767;
  /* Desktop-site mode on Android can report a 980px viewport. */
  const isMobile = () => window.innerWidth <= BP || Math.min(screen.width || Infinity, window.innerWidth) <= BP;
  const FORCE_STYLE_ID = "velora-mobile-forced-viewport";
  function ensureForcedViewportStyles() {
    if (window.innerWidth <= BP || Math.min(screen.width || Infinity, window.innerWidth) > BP || document.getElementById(FORCE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = FORCE_STYLE_ID;
    style.textContent = `
      body.vm-active{margin:0!important;padding:0 0 100px!important;width:100%!important;max-width:100%!important;overflow-x:hidden!important;background:var(--theme-bg,#faf9fc)!important;color:var(--theme-text,#302638)!important}
      body.vm-active #app,body.vm-active #app>.velora-home{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}
      body.vm-active .velora-home>.top,body.vm-active .velora-home>main:not(.mobile-commerce-home),body.vm-active .velora-home>.velora-footer{display:none!important}
      body.vm-active .velora-home>main.mobile-commerce-home.m3-home{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;visibility:visible!important;opacity:1!important}
      body.vm-active .vm-header{display:block!important;position:sticky!important;top:0!important;z-index:9500!important;background:var(--theme-surface,#fff)!important;color:var(--theme-text,#241b2b)!important;padding:10px 14px!important}
      body.vm-active .vm-bottom{display:block!important;position:fixed!important;left:10px!important;right:10px!important;bottom:8px!important;z-index:9600!important;background:var(--theme-surface,#fff)!important}
      body.vm-active .m3-hero{display:flex!important;flex-direction:column!important;gap:18px!important;padding:24px 16px!important;width:100%!important;box-sizing:border-box!important}
      body.vm-active .m3-hero-copy{width:100%!important;min-width:0!important}
      body.vm-active .m3-title{display:block!important;width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important;white-space:normal!important;color:var(--theme-text,#241b2b)!important;font-size:clamp(34px,9vw,46px)!important;line-height:1.02!important;letter-spacing:-.045em!important;animation:none!important;transform:none!important;clip-path:none!important}
      body.vm-active .m3-description{font-size:14px!important;line-height:1.6!important;color:var(--theme-muted,#817687)!important}
      body.vm-active .m3-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
      body.vm-active .m3-visual{width:100%!important;aspect-ratio:1.25/1!important;height:auto!important;margin:0!important;border-radius:22px!important;overflow:hidden!important}
      body.vm-active .m3-visual img{width:100%!important;height:100%!important;object-fit:cover!important}
      body.vm-active .m3-quick{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;padding:0 14px!important}
      body.vm-active .m3-quick-card{min-width:0!important;padding:12px 8px!important}
      body.vm-active .m3-section{padding:28px 14px 0!important;min-width:0!important}
      body.vm-active .m3-section-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}
      body.vm-active .m3-section-head h2{font-size:25px!important;line-height:1.1!important;color:var(--theme-text,#241b2b)!important}
      body.vm-active .m3-products{display:flex!important;flex-flow:row nowrap!important;gap:12px!important;width:calc(100% + 28px)!important;margin-left:-14px!important;padding:4px 14px 16px!important;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory!important}
      body.vm-active .m3-product-card{display:block!important;flex:0 0 min(78vw,310px)!important;width:min(78vw,310px)!important;min-width:0!important;max-width:310px!important;overflow:hidden!important;border:1px solid var(--theme-line,#e9e2ee)!important;border-radius:18px!important;background:var(--theme-surface,#fff)!important;color:var(--theme-text,#302638)!important;box-shadow:var(--theme-shadow,0 8px 24px rgba(0,0,0,.06))!important;scroll-snap-align:start!important}
      body.vm-active .m3-product-media{position:relative!important;width:100%!important;aspect-ratio:1.15/1!important;overflow:hidden!important}
      body.vm-active .m3-product-media img{width:100%!important;height:100%!important;object-fit:cover!important}
      body.vm-active .m3-product-body{padding:13px!important}
      body.vm-active .m3-product-body h3{font-size:16px!important;line-height:1.3!important;color:var(--theme-text,#241b2b)!important}
      body.vm-active .m3-product-footer{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}
      body.vm-active .m3-product-add{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-height:38px!important;padding:8px 12px!important;border-radius:11px!important;background:#7040c7!important;color:#fff!important;white-space:nowrap!important}
      body.vm-active .m3-story,body.vm-active .m3-faq{width:calc(100% - 28px)!important;max-width:none!important;margin:26px 14px 0!important;box-sizing:border-box!important}
      body.vm-active .velora-footer{display:block!important;width:100%!important;padding-bottom:110px!important}
      html[data-theme="dark"] body.vm-active .m3-title,html[data-theme="dark"] body.vm-active .m3-section-head h2,html[data-theme="dark"] body.vm-active .m3-product-body h3{color:#f5f0fb!important}
      html[data-theme="dark"] body.vm-active .m3-product-card,html[data-theme="dark"] body.vm-active .m3-quick-card{background:#1c1a26!important;color:#eee8f7!important;border-color:#353044!important}
      html[data-theme="dark"] body.vm-active .m3-story{background:#21192f!important;color:#f5f0fb!important}
    `;
    document.head.appendChild(style);
  }
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
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',

      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
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
            <button class="vm-head-icon vm-theme-toggle" data-theme-toggle type="button" aria-label="Aktifkan dark mode" title="Dark mode" aria-pressed="false"><svg data-theme-icon viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/></svg></button>
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
    if (!isMobile()) return;

    const app = document.querySelector("#app");
    const home = app?.querySelector(".velora-home");
    if (!home) return;

    const mobile = home.querySelector("main.mobile-commerce-home.m3-home");
    const desktop = home.querySelector(":scope > main:not(.mobile-commerce-home)");

    /* Never move the homepage out of #app. The router owns that DOM.
       Moving it caused the mobile home to detach during rerenders. */
    if (desktop) {
      desktop.style.setProperty("display", "none", "important");
      desktop.style.setProperty("visibility", "hidden", "important");
    }
    if (!mobile) return;

    mobile.style.setProperty("display", "block", "important");
    mobile.style.setProperty("visibility", "visible", "important");
    mobile.style.setProperty("opacity", "1", "important");
    mobile.style.setProperty("position", "relative", "important");
    mobile.style.setProperty("width", "100%", "important");
    mobile.style.setProperty("max-width", "100%", "important");
    mobile.style.setProperty("min-width", "0", "important");
    mobile.style.setProperty("height", "auto", "important");
    mobile.style.setProperty("min-height", "0", "important");
    mobile.style.setProperty("overflow", "visible", "important");

    const title = mobile.querySelector(".m3-title");
    if (title) {
      title.style.setProperty("display", "block", "important");
      title.style.setProperty("position", "relative", "important");
      title.style.setProperty("width", "100%", "important");
      title.style.setProperty("height", "auto", "important");
      title.style.setProperty("min-height", "0", "important");
      title.style.setProperty("max-height", "none", "important");
      title.style.setProperty("overflow", "visible", "important");
      title.style.setProperty("white-space", "normal", "important");
      title.style.setProperty("visibility", "visible", "important");
      title.style.setProperty("opacity", "1", "important");
      title.style.setProperty("animation", "none", "important");
      title.style.setProperty("transform", "none", "important");
      title.style.setProperty("clip-path", "none", "important");
      title.style.setProperty("color", "var(--vm-ink, #281b31)", "important");
      title.innerHTML = "Cookies kecil,<br>mood besar.";
      title.classList.remove("vm-typewriter-active", "vm-typewriter-done");
      delete title.dataset.vmTypewriter;
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
    ensureForcedViewportStyles();
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