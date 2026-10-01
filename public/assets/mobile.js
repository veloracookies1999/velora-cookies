/* ====================================================================
   VELORA MOBILE APP CONTROLLER v2
   Dedicated mobile UI manager + route handling + safe area support
   ==================================================================== */

(() => {
  'use strict';

  /* Constants */
  const MOBILE_BREAKPOINT = 767;
  const ROUTE_HOME = '/';
  const ROUTE_SHOP = '/shop';
  const ROUTE_PRODUCT = '/product/';
  const ROUTE_CART = '/cart';
  const ROUTE_CHECKOUT = '/checkout';
  const ROUTE_ORDERS = '/orders';
  const ROUTE_WISHLIST = '/wishlist';
  const ROUTE_PROFILE = '/profile';
  const ROUTE_ADMIN = '/admin';

  /* State */
  let currentRoute = '';
  let isMobileMode = false;
  let mutationObserver = null;
  let resizeScheduled = false;
  let hashChangeScheduled = false;

  /* Utilities */
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

  const getRoute = () => location.hash.replace(/^#/, '') || ROUTE_HOME;

  const escapeHtml = (str) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str || '').replace(/[&<>"']/g, (c) => map[c]);
  };

  const createSvg = (name) => {
    const icons = {
      home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
      package: '<path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5v6.9"/>',
      heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
      user: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
      menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
      close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.grid}</svg>`;
  };

  const matchRoute = (pattern, pathname) => {
    if (pattern === ROUTE_HOME) return pathname === ROUTE_HOME;
    if (pattern === ROUTE_SHOP) return pathname === ROUTE_SHOP || pathname.startsWith(ROUTE_PRODUCT);
    if (pattern === ROUTE_ORDERS) return pathname.startsWith(ROUTE_ORDERS);
    if (pattern === ROUTE_WISHLIST) return pathname.startsWith(ROUTE_WISHLIST);
    if (pattern === ROUTE_PROFILE) return pathname.startsWith(ROUTE_PROFILE);
    return false;
  };

  /* ====================================================================
     MOBILE HEADER
     ==================================================================== */

  function renderMobileHeader() {
    const userElement = document.querySelector('.avatar, .mobile-appbar-avatar');
    const userLetter = userElement?.textContent?.trim()?.charAt(0)?.toUpperCase() || 'A';

    return `
      <header class="vm-header" data-vm-component="header">
        <div class="vm-head-row">
          <a class="vm-brand" href="#/" title="VELORA Cookies">
            <span class="vm-brand-mark">${createSvg('grid')}</span>
            <span>
              <strong>VELORA</strong>
              <small>COOKIES</small>
            </span>
          </a>
          <div class="vm-head-actions">
            <a class="vm-head-btn" href="#/notifications" title="Notifikasi" aria-label="Notifikasi">
              ${createSvg('bell')}
              <span class="vm-dot" style="display: none;"></span>
            </a>
            <a class="vm-head-btn" href="#/cart" title="Keranjang" aria-label="Keranjang">
              ${createSvg('bag')}
              <span class="vm-dot" style="display: none;"></span>
            </a>
            <a class="vm-head-btn" href="#/profile" title="Akun" aria-label="Akun">
              ${userElement ? escapeHtml(userLetter) : createSvg('user')}
            </a>
          </div>
        </div>
        <form class="vm-search" data-vm-component="search">
          ${createSvg('search')}
          <input 
            type="text" 
            name="q" 
            placeholder="Cari cookies, hampers..." 
            autocomplete="off" 
            spellcheck="false"
          />
        </form>
      </header>
    `;
  }

  /* ====================================================================
     BOTTOM NAVIGATION
     ==================================================================== */

  function renderBottomNav() {
    const pathname = getRoute();
    const navItems = [
      { key: 'home', href: ROUTE_HOME, icon: 'home', label: 'Beranda' },
      { key: 'shop', href: ROUTE_SHOP, icon: 'grid', label: 'Koleksi' },
      { key: 'orders', href: ROUTE_ORDERS, icon: 'package', label: 'Pesanan' },
      { key: 'wishlist', href: ROUTE_WISHLIST, icon: 'heart', label: 'Wishlist' },
      { key: 'profile', href: ROUTE_PROFILE, icon: 'user', label: 'Akun' }
    ];

    const navHTML = navItems
      .map((item) => {
        const isActive = matchRoute(item.href, pathname);
        return `
          <a 
            class="vm-nav-item ${isActive ? 'active' : ''}" 
            href="#${item.href}" 
            data-route="${item.key}"
            title="${item.label}"
          >
            ${createSvg(item.icon)}
            <span>${item.label}</span>
          </a>
        `;
      })
      .join('');

    return `
      <nav class="vm-bottom" data-vm-component="nav" role="navigation">
        ${navHTML}
      </nav>
    `;
  }

  /* ====================================================================
     MOUNT MOBILE UI
     ==================================================================== */

  function mountMobileUI() {
    const appContainer = document.querySelector('#app');
    if (!appContainer) return;

    // Remove old mobile UI
    document.querySelectorAll('[data-vm-component]').forEach((el) => el.remove());

    // Insert new mobile UI
    appContainer.insertAdjacentHTML('afterbegin', renderMobileHeader());
    document.body.insertAdjacentHTML('beforeend', renderBottomNav());

    // Setup event listeners
    setupSearchListener();
    setupNavListener();
    setupCartBadge();
    updateMobileSpecificUI();
  }

  /* ====================================================================
     EVENT LISTENERS
     ==================================================================== */

  function setupSearchListener() {
    const searchForm = document.querySelector('[data-vm-component="search"]');
    if (!searchForm) return;

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = searchForm.querySelector('input[name="q"]');
      const query = input?.value?.trim() || '';

      if (query) {
        location.hash = `${ROUTE_SHOP}?q=${encodeURIComponent(query)}&category=&sort=featured`;
      } else {
        location.hash = ROUTE_SHOP;
      }

      input.blur();
    });

    // Clear button (optional)
    searchForm.addEventListener('reset', () => {
      location.hash = ROUTE_SHOP;
    });
  }

  function setupNavListener() {
    const navItems = document.querySelectorAll('.vm-nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        // Prevent default for hash-based navigation
        // Update active state
        navItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  function setupCartBadge() {
    const cartBadge = document.querySelector('.vm-head-btn[href="#/cart"] .vm-dot');
    const cartCount = window.__VELORA_CART_COUNT || 0;

    if (cartBadge && cartCount > 0) {
      cartBadge.style.display = 'grid';
      cartBadge.textContent = cartCount > 99 ? '99+' : cartCount;
    }
  }

  /* ====================================================================
     MOBILE-SPECIFIC UI UPDATES
     ==================================================================== */

  function updateMobileSpecificUI() {
    const pathname = getRoute();

    // Update nav active state
    document.querySelectorAll('.vm-nav-item').forEach((item) => {
      const route = item.getAttribute('data-route');
      const isActive = matchRoute(item.getAttribute('href').replace('#', ''), pathname);
      item.classList.toggle('active', isActive);
    });

    // Mobile-specific page handling
    if (pathname === ROUTE_HOME) {
      setupMobileHome();
    } else if (pathname === ROUTE_SHOP || pathname.startsWith(ROUTE_PRODUCT)) {
      setupMobileShop();
    } else if (pathname === ROUTE_CART) {
      setupMobileCart();
    } else if (pathname === ROUTE_CHECKOUT) {
      setupMobileCheckout();
    } else if (pathname === ROUTE_ORDERS) {
      setupMobileOrders();
    } else if (pathname === ROUTE_PROFILE) {
      setupMobileProfile();
    }
  }

  /* ====================================================================
     PAGE-SPECIFIC MOBILE SETUPS
     ==================================================================== */

  function setupMobileHome() {
    const heroSection = document.querySelector('.hero-home');
    if (heroSection) {
      heroSection.classList.add('vm-home-hero');
    }
  }

  function setupMobileShop() {
    const filterSection = document.querySelector('.filters');
    if (filterSection) {
      // Ensure filters are properly wrapped
      filterSection.classList.add('vm-filters');
    }

    // Optimize product grid
    const gridContainer = document.querySelector('.product-grid, .grid');
    if (gridContainer) {
      gridContainer.classList.add('vm-grid');
    }
  }

  function setupMobileCart() {
    const cartLayout = document.querySelector('.cart-layout, .cart-grid');
    if (cartLayout) {
      cartLayout.classList.add('vm-cart-layout');
    }

    // Fix checkout button positioning
    const checkoutBtn = document.querySelector('[data-checkout-action]');
    if (checkoutBtn) {
      checkoutBtn.classList.add('vm-sticky-action');
    }
  }

  function setupMobileCheckout() {
    const checkoutForm = document.querySelector('form[data-checkout]');
    if (checkoutForm) {
      checkoutForm.classList.add('vm-checkout-form');
    }

    // Ensure Midtrans container is mobile-friendly
    const snapContainer = document.querySelector('.snap-container');
    if (snapContainer) {
      snapContainer.classList.add('vm-snap-container');
    }
  }

  function setupMobileOrders() {
    const ordersList = document.querySelector('.orders-grid, .orders-list');
    if (ordersList) {
      ordersList.classList.add('vm-orders-list');
    }
  }

  function setupMobileProfile() {
    const profileGrid = document.querySelector('.profile-grid, .profile-content');
    if (profileGrid) {
      profileGrid.classList.add('vm-profile-grid');
    }
  }

  /* ====================================================================
     VIEWPORT & ROUTE MANAGEMENT
     ==================================================================== */

  function handleViewportChange() {
    const mobile = isMobile();

    if (mobile === isMobileMode) return; // No change

    isMobileMode = mobile;
    document.body.classList.toggle('vm-active', mobile);

    if (mobile) {
      mountMobileUI();
    } else {
      // Remove mobile UI on desktop view
      document.querySelectorAll('[data-vm-component]').forEach((el) => el.remove());
    }
  }

  function handleRouteChange() {
    const newRoute = getRoute();
    if (newRoute === currentRoute) return;

    currentRoute = newRoute;

    if (isMobileMode) {
      updateMobileSpecificUI();
    }
  }

  function scheduleViewportCheck() {
    if (resizeScheduled) return;
    resizeScheduled = true;

    requestAnimationFrame(() => {
      resizeScheduled = false;
      handleViewportChange();
    });
  }

  function scheduleRouteCheck() {
    if (hashChangeScheduled) return;
    hashChangeScheduled = true;

    requestAnimationFrame(() => {
      hashChangeScheduled = false;
      handleRouteChange();
    });
  }

  /* ====================================================================
     INITIALIZATION
     ==================================================================== */

  function init() {
    // Initial state
    currentRoute = getRoute();
    isMobileMode = isMobile();
    document.body.classList.toggle('vm-active', isMobileMode);

    if (isMobileMode) {
      mountMobileUI();
    }

    // Event listeners
    window.addEventListener('resize', scheduleViewportCheck, { passive: true });
    window.addEventListener('hashchange', scheduleRouteCheck, { passive: true });

    // Mutation observer for dynamic content
    mutationObserver = new MutationObserver(() => {
      if (isMobileMode) {
        scheduleRouteCheck();
      }
    });

    const appContainer = document.querySelector('#app');
    if (appContainer) {
      mutationObserver.observe(appContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  /* ====================================================================
     START
     ==================================================================== */

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on navigation
  window.addEventListener('beforeunload', () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
  });

  // Expose for debugging
  window.__VELORA_MOBILE = {
    isMobile,
    getRoute,
    isMobileMode: () => isMobileMode,
    currentRoute: () => currentRoute
  };
})();
