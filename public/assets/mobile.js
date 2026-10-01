/* VELORA MOBILE APP — dedicated mobile UI controller */
(() => {
  const MOBILE = 767;
  let observer;
  let scheduled = false;

  const isMobile = () => window.innerWidth <= MOBILE;
  const route = () => location.hash.replace(/^#/, "") || "/";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  const svg = (name) => {
    const icons = {
      home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      grid:'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
      package:'<path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
      heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
      user:'<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
      search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      bag:'<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.grid)+'</svg>';
  };

  function counts() {
    const app = document.querySelector("#app");
    const cart = app?.querySelector(".cart-count,.count");
    const cartCount = window.__VELORA_CART_COUNT || "";
    const wishCount = window.__VELORA_WISH_COUNT || "";
    return {cartCount,wishCount};
  }

  function header() {
    const r = route();
    const existingUser = document.querySelector(".avatar,.mobile-appbar-avatar");
    const letter = existingUser?.textContent?.trim()?.slice(0,1) || "A";
    return `
      <header class="vm-header" data-vm-ui>
        <div class="vm-head-row">
          <a class="vm-brand" href="#/">
            <span class="vm-brand-mark">${svg("grid")}</span>
            <span><strong>VELORA</strong><small>COOKIES</small></span>
          </a>
          <div class="vm-head-actions">
            <a class="vm-head-btn" href="#/notifications" aria-label="Notifikasi">${svg("bell")}</a>
            <a class="vm-head-btn" href="#/cart" aria-label="Keranjang">${svg("bag")}</a>
            <a class="vm-head-btn" href="#/profile" aria-label="Akun">${existingUser ? esc(letter.toUpperCase()) : svg("user")}</a>
          </div>
        </div>
        <form class="vm-search" data-vm-search>
          ${svg("search")}
          <input name="q" autocomplete="off" placeholder="Cari cookies, hampers, favoritmu..." />
        </form>
      </header>
    `;
  }

  function nav() {
    const r = route();
    const active = key => key==="home" ? r==="/" : key==="shop" ? r==="/shop" || r.startsWith("/product/") : key==="orders" ? r.startsWith("/orders") : key==="wishlist" ? r.startsWith("/wishlist") : r.startsWith("/profile") || r.startsWith("/notifications");
    const item = (key,href,ic,label) => `<a class="${active(key)?"active":""}" href="${href}">${svg(ic)}<span>${label}</span></a>`;
    return `<nav class="vm-bottom" data-vm-ui>
      ${item("home","#/","home","Beranda")}
      ${item("shop","#/shop","grid","Koleksi")}
      ${item("orders","#/orders","package","Pesanan")}
      ${item("wishlist","#/wishlist","heart","Wishlist")}
      ${item("profile","#/profile","user","Akun")}
    </nav>`;
  }

  function decorateHome() {
    const hero = document.querySelector(".hero-home");
    if (!hero) return;
    hero.classList.add("vm-home-hero");
    const image = hero.querySelector(".hero-main-image");
    if (image) image.classList.add("vm-home-image");
    const copy = hero.querySelector(".hero-home-copy");
    if (copy) copy.classList.add("vm-home-copy");
  }

  function mount() {
    const mobile = isMobile();
    document.body.classList.toggle("vm-active", mobile);

    document.querySelectorAll("[data-vm-ui]").forEach(x => x.remove());
    if (!mobile) return;

    const app = document.querySelector("#app");
    if (!app) return;

    app.insertAdjacentHTML("afterbegin", header());
    document.body.insertAdjacentHTML("beforeend", nav());
    decorateHome();

    const search = document.querySelector("[data-vm-search]");
    search?.addEventListener("submit", e => {
      e.preventDefault();
      const q = new FormData(search).get("q")?.toString().trim() || "";
      location.hash = q ? "/shop?q="+encodeURIComponent(q)+"&category=&sort=featured" : "/shop";
    });

    refresh();
  }

  function refresh() {
    if (!isMobile()) return;
    decorateHome();
    const navEl = document.querySelector(".vm-bottom");
    if (navEl) {
      const r=route();
      navEl.querySelectorAll("a").forEach(a => {
        const h=a.getAttribute("href")||"";
        const on=(h==="#/"&&r==="/")||(h==="#/shop"&&(r==="/shop"||r.startsWith("/product/")))||(h==="#/orders"&&r.startsWith("/orders"))||(h==="#/wishlist"&&r.startsWith("/wishlist"))||(h==="#/profile"&&(r.startsWith("/profile")||r.startsWith("/notifications")));
        a.classList.toggle("active",on);
      });
    }
  }

  function queue() {
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;if(isMobile() && document.querySelector(".vm-header")) refresh(); else mount();});
  }

  window.addEventListener("resize",queue);
  window.addEventListener("hashchange",queue);
  observer = new MutationObserver(queue);
  observer.observe(document.querySelector("#app") || document.body,{childList:true,subtree:true});
  queue();
})();