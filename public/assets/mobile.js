/* ====================================================================
   VELORA MOBILE APP CONTROLLER
   Mobile-only behavior, no desktop changes
   ==================================================================== */
(() => {
  if (window.__VELORA_MOBILE_READY__) return;
  window.__VELORA_MOBILE_READY__ = true;

  const MOBILE_BREAKPOINT = 767;
  const HOME = '/';
  const SHOP = '/shop';
  const PRODUCT = '/product/';
  const CART = '/cart';
  const CHECKOUT = '/checkout';
  const ORDERS = '/orders';
  const WISHLIST = '/wishlist';
  const PROFILE = '/profile';

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  const getRoute = () => (location.hash || '#/').replace(/^#/, '') || HOME;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

  const svg = (name) => {
    const icons = {
      home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
      package: '<path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5v6.9"/>',
      heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
      user: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.grid}</svg>`;
  };

  function matchRoute(pathname, target) {
    if (target === HOME) return pathname === HOME;
    if (target === SHOP) return pathname === SHOP || pathname.startsWith(PRODUCT);
    if (target === ORDERS) return pathname.startsWith(ORDERS);
    if (target === WISHLIST) return pathname.startsWith(WISHLIST);
    if (target === PROFILE) return pathname.startsWith(PROFILE);
    if (target === CART) return pathname.startsWith(CART);
    if (target === CHECKOUT) return pathname.startsWith(CHECKOUT);
    return false;
  }

  function createHeader() {
    const userElement = document.querySelector('.avatar, .mobile-appbar-avatar');
    const userChar = userElement?.textContent?.trim()?.charAt(0)?.toUpperCase() || 'A';

    return `
      <header class="vm-header" data-vm-ui>
        <div class="vm-head-row">
          <a class="vm-brand" href="#/" aria-label="VELORA home">
            <span class="vm-brand-mark">${svg('grid')}</span>
            <span>
              <strong>VELORA</strong>
              <small>COOKIES</small>
            </span>
          </a>
          <div class="vm-head-actions">
            <a class="vm-head-btn" href="#/notifications" aria-label="Notifikasi">
              ${svg('bell')}
            </a>
            <a class="vm-head-btn" href="#/cart" aria-label="Keranjang">
              ${svg('bag')}
            </a>
            <a class="vm-head-btn" href="#/profile" aria-label="Akun">
              ${userElement ? esc(userChar) : svg('user')}
            </a>
          </div>
        </div>
        <form class="vm-search" data-vm-search>
          ${svg('search')}
          <input type="text" name="q" placeholder="Cari cookies, hampers, favoritmu..." autocomplete="off" />
        </form>
      </header>
    `;
  }

  function createBottomNav() {
    const pathname = getRoute();
    const entries = [
      { key: 'home', href: '#/', label: 'Beranda', icon: 'home' },
      { key: 'shop', href: '#/shop', label: 'Koleksi', icon: 'grid' },
      { key: 'orders', href: '#/orders', label: 'Pesanan', icon: 'package' },
      { key: 'wishlist', href: '#/wishlist', label: 'Wishlist', icon: 'heart' },
      { key: 'profile', href: '#/profile', label: 'Akun', icon: 'user' }
    ];

    return `
      <nav class="vm-bottom" data-vm-ui aria-label="Mobile navigation">
        ${entries.map((item) => {
          const active = matchRoute(pathname, item.href.replace(/^#/, ''));
          return `<a class="vm-nav-item ${active ? 'active' : ''}" href="${item.href}" data-key="${item.key}">${svg(item.icon)}<span>${item.label}</span></a>`;
        }).join('')}
      </nav>
    `;
  }

  function applyHomeMobileBoost() {
    const heroHome = document.querySelector('.hero-home');
    if (heroHome) heroHome.classList.add('vm-home-hero');
    const heroCopy = document.querySelector('.hero-home-copy');
    if (heroCopy) heroCopy.classList.add('vm-home-copy');
  }

  function refreshMobileNav() {
    const path = getRoute();
    document.querySelectorAll('.vm-nav-item').forEach((node) => {
      const key = node.getAttribute('data-key');
      const target = key === 'home' ? HOME : key === 'shop' ? SHOP : key === 'orders' ? ORDERS : key === 'wishlist' ? WISHLIST : PROFILE;
      node.classList.toggle('active', matchRoute(path, target));
    });
  }

  function setupSearch() {
    const form = document.querySelector('[data-vm-search]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[name="q"]');
      const q = input?.value?.trim() || '';
      location.hash = q ? `/shop?q=${encodeURIComponent(q)}&category=&sort=featured` : '/shop';
    }, { passive: false });
  }

  function setupNavClicks() {
    document.querySelectorAll('.vm-nav-item').forEach((node) => {
      node.addEventListener('click', () => {
        document.querySelectorAll('.vm-nav-item').forEach((el) => el.classList.remove('active'));
        node.classList.add('active');
      }, { passive: true });
    });
  }

  function mountMobile() {
    if (!isMobile()) return;
    document.body.classList.add('vm-active');

    document.querySelectorAll('[data-vm-ui]').forEach((node) => node.remove());

    const app = document.querySelector('#app');
    if (!app) return;

    app.insertAdjacentHTML('afterend', '');
    app.insertAdjacentHTML('afterend', createHeader());
    document.body.insertAdjacentHTML('beforeend', createBottomNav());

    applyHomeMobileBoost();
    refreshMobileNav();
    setupSearch();
    setupNavClicks();
  }

  function unmountMobile() {
    document.body.classList.remove('vm-active');
    document.querySelectorAll('[data-vm-ui]').forEach((node) => node.remove());
  }

  function refresh() {
    if (!isMobile()) {
      unmountMobile();
      return;
    }

    if (!document.querySelector('.vm-header')) {
      mountMobile();
      return;
    }

    refreshMobileNav();
    applyHomeMobileBoost();
  }

  function init() {
    const run = () => {
      if (isMobile()) {
        mountMobile();
      } else {
        unmountMobile();
      }
    };

    run();

    window.addEventListener('resize', () => {
      setTimeout(() => {
        if (isMobile()) {
          mountMobile();
        } else {
          unmountMobile();
        }
      }, 30);
    }, { passive: true });

    window.addEventListener('hashchange', () => {
      refresh();
    }, { passive: true });

    const app = document.querySelector('#app');
    if (app) {
      new MutationObserver(() => {
        if (isMobile()) refresh();
      }).observe(app, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
