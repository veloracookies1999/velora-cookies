const S = {
  cfg: null,
  sb: null,
  session: null,
  user: null,
  products: [],
  cats: [],
  cart: [],
  wish: [],
  orders: [],
  notes: [],
  admin: false,
  channel: null,
  notificationChannel: null,
  authListenerReady: false
};

const $ = (q, p = document) => p.querySelector(q);
const $$ = (q, p = document) => [...p.querySelectorAll(q)];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

const money = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n || 0));

const icon = (name, size = 18) =>
  `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;

const route = () => location.hash.replace(/^#/, "") || "/";
const go = (path) => {
  location.hash = path;
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function toast(message, type = "good") {
  let root = $("#toast-root");

  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;

  root.appendChild(t);

  setTimeout(() => {
    t.remove();
  }, 3000);
}

async function api(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (S.session?.access_token) {
    headers.Authorization = `Bearer ${S.session.access_token}`;
  }

  let body = options.body;

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      body
    });
  } catch (error) {
    console.error("FETCH ERROR:", error);
    throw new Error(
      "Tidak dapat terhubung ke server. Pastikan npm.cmd start masih berjalan."
    );
  }

  const raw = await response.text();

  console.log("========== API DEBUG ==========");
  console.log("URL:", url);
  console.log("METHOD:", options.method || "GET");
  console.log("BODY:", body);
  console.log("STATUS:", response.status);
  console.log("CONTENT-TYPE:", response.headers.get("content-type"));
  console.log("RAW:", raw);
  console.log("================================");

  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(
      `Server mengembalikan respons bukan JSON. Status ${response.status}.`
    );
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(
      data?.message || `Request gagal (${response.status})`
    );
  }

  return data;
}
/* =========================================================
   BOOT
========================================================= */

async function boot() {
  try {
    S.cfg = await fetch("/api/config").then((r) => r.json());

    async function loadMidtransSnap() {
  if (window.snap) {
    return true;
  }

  const clientKey =
    S.cfg?.midtransClientKey;

  if (!clientKey) {
    console.warn(
      "Midtrans Client Key tidak tersedia."
    );

    return false;
  }

  const isProduction =
    S.cfg?.midtransIsProduction === true;

  const script = document.createElement("script");

  script.src = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  script.setAttribute(
    "data-client-key",
    clientKey
  );

  script.async = true;

  await new Promise(
    (resolve, reject) => {
      script.onload = resolve;

      script.onerror = () =>
        reject(
          new Error(
            "Midtrans Snap gagal dimuat."
          )
        );

      document.head.appendChild(script);
    }
  );

  return Boolean(window.snap);
}

    if (
      !S.cfg?.supabaseUrl ||
      !S.cfg?.supabasePublishableKey
    ) {
      console.error("Supabase config tidak tersedia.");
      renderError(
        "Supabase belum dikonfigurasi. Periksa file .env."
      );
      return;
    }
    try {
  await loadMidtransSnap();
} catch (error) {
  console.error(
    "MIDTRANS SNAP ERROR:",
    error
  );
}

    if (!window.supabase?.createClient) {
      renderError(
        "Supabase JavaScript SDK belum termuat."
      );
      return;
    }

   S.sb = window.supabase.createClient(
  S.cfg.supabaseUrl,
  S.cfg.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

initPasswordRecovery();

    const sessionResult = await S.sb.auth.getSession();
    S.session = sessionResult.data?.session || null;

    if (!S.authListenerReady) {
      S.authListenerReady = true;

      S.sb.auth.onAuthStateChange(
        async (_event, session) => {
          S.session = session || null;

          try {
            await me();
            await data();
            await render();
          } catch (error) {
            console.error("Auth state error:", error);
          }
        }
      );
    }

    await me();
    await data();
    await render();

  } catch (error) {
    console.error("BOOT ERROR:", error);
    renderError(error.message);
  }
}

async function me() {
  if (!S.session) {
    S.user = null;
    S.admin = false;
    return;
  }

  try {
    const result = await api("/api/me");

    S.user = result.user || null;

    S.admin =
      !!S.user &&
      ["admin", "owner"].includes(S.user.role || "");

  } catch (error) {
    console.error("ME ERROR:", error);

    S.user = null;
    S.admin = false;
  }
}

async function data() {
  if (!S.user) {
    S.cart = [];
    S.wish = [];
    S.orders = [];
    S.notes = [];
    return;
  }

  try {
    const [
      cartData,
      wishData,
      orderData,
      notificationData
    ] = await Promise.all([
      api("/api/cart"),
      api("/api/wishlist"),
      api("/api/orders"),
      api("/api/notifications")
    ]);

    S.cart = cartData.items || [];
    S.wish = wishData.items || [];
    S.orders = orderData.orders || [];
    S.notes = notificationData.notifications || [];

    initNotificationRealtime();

  } catch (error) {
    console.error("USER DATA ERROR:", error);
  }
}

async function catalog() {
  const queryString =
    location.hash.split("?")[1] || "";

  const [productsData, categoriesData] =
    await Promise.all([
      api(`/api/products?${queryString}`),
      api("/api/categories")
    ]);

  S.products = productsData.products || [];
  S.cats = categoriesData.categories || [];
}

function renderError(message) {
  const app = $("#app");

  if (!app) return;

  app.innerHTML = `
    <main class="container page">
      <div class="panel empty">
        <div>${icon("triangle-alert", 42)}</div>
        <h2>VELORA mengalami masalah</h2>
        <p class="muted">${esc(message)}</p>
        <button
          class="btn primary"
          onclick="location.reload()"
        >
          Muat ulang
        </button>
      </div>
    </main>
  `;

  refreshIcons();
}

/* =========================================================
   NAVBAR / FOOTER
========================================================= */

function top() {
  const count = S.cart.reduce((a,b)=>a+b.qty,0);

  return `
    <header class="top">
      <a class="brand" href="#/">
        <span class="logo">${icon('cookie',19)}</span>
        <span>
          <b>VELORA</b>
          <small>COOKIES</small>
        </span>
      </a>

      <form class="search" id="search">
        <input name="q" placeholder="Cari cookies favoritmu...">
        <span>${icon('search',18)}</span>
      </form>


      <nav class="nav">
  <a href="#/">Beranda</a>
  <a href="#/shop">Koleksi</a>
  ${S.user ? `<a href="#/orders">Pesanan Saya</a>` : ""}
  <a href="#/about">Cerita</a>
  <a href="#/faq">FAQ</a>
  <a
  href="#/chat"
  class="nav-link"
  data-chat-menu
>
  ${icon("messages-square", 15)}
  Live Chat
</a>
</nav>

      <div class="actions">
        <a class="icon-btn" href="#/wishlist">
          ${icon('heart')}
          <span class="count">${S.wish.length || ''}</span>
        </a>

        <a class="icon-btn" href="#/cart">
          ${icon('shopping-bag')}
          <span class="count">${count || ''}</span>
        </a>

        ${
          S.user
            ? `
              <a class="icon-btn" href="#/notifications">
                ${icon('bell')}
                <span class="count">
                  ${S.notes.filter(x=>!x.is_read).length || ''}
                </span>
              </a>

              <a class="avatar" href="${S.admin ? '#/admin' : '#/profile'}">
                ${esc((S.user.name || 'V').slice(0,1).toUpperCase())}
              </a>
            `
            : `
              <button class="btn dark sm" id="openAuth">Masuk</button>
            `
        }
      </div>
    </header>
  `;
}

function foot() {
  return `
    <footer class="velora-footer">

      <!-- ================= FOOTER MAIN ================= -->
      <div class="container footer-main">

        <!-- BRAND -->
        <div class="footer-brand">

          <a href="#/" class="footer-logo">

            <span class="footer-logo-mark">
              ${icon("cookie")}
            </span>

            <span class="footer-logo-text">
              <strong>VELORA</strong>
              <small>COOKIES</small>
            </span>

          </a>

          <p>
            Cookies premium dengan pengalaman belanja
            yang modern, hangat, dan berkesan.
          </p>

          <a href="#/shop" class="footer-brand-link">
            Jelajahi koleksi
            ${icon("arrow-right")}
          </a>

        </div>


        <!-- BELANJA -->
        <div class="footer-column">

          <h3>Belanja</h3>

          <a href="#/">
            Beranda
          </a>

          <a href="#/shop">
            Koleksi
          </a>

          <a href="#/wishlist">
            Wishlist
          </a>

          <a href="#/cart">
            Keranjang
          </a>

          <a href="#/orders">
            Pesanan Saya
          </a>

        </div>


        <!-- BANTUAN -->
        <div class="footer-column">

          <h3>Bantuan</h3>

          <a href="#/faq">
            FAQ
          </a>

          <a href="#/chat">
            Live Chat
          </a>

          <a href="#/profile">
            Akun Saya
          </a>

          <a href="#/about">
            Tentang VELORA
          </a>

        </div>


        <!-- KONTAK -->
        <div class="footer-column footer-contact">

          <h3>Kontak</h3>

          <a href="mailto:veloracookies1999@gmail.com">
            veloracookies1999@gmail.com
          </a>

          <a
            href="https://wa.me/6285864306671"
            target="_blank"
            rel="noopener"
          >
            +62 858-6430-6671
          </a>

          <span>
            Indonesia
          </span>

        </div>

      </div>


      <!-- ================= PAYMENT ================= -->
      <div class="container footer-payment">

        <div class="footer-payment-head">

          <div>

            <span class="footer-payment-eyebrow">
              SECURE CHECKOUT
            </span>

            <h3>
              Metode pembayaran
            </h3>

          </div>

          <span class="footer-payment-note">
            Pilihan pembayaran tersedia saat checkout.
          </span>

        </div>


        <div class="payment-logo-row">

          <div class="payment-logo">
            <img
              src="/assets/gopay.png"
              alt="GoPay"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/dana.png"
              alt="DANA"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/qris.png"
              alt="QRIS"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/bca.png"
              alt="BCA"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/mandiri.png"
              alt="Mandiri"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/bni.png"
              alt="BNI"
            >
          </div>

          <div class="payment-logo">
            <img
              src="/assets/bri.png"
              alt="BRI"
            >
          </div>

        </div>

      </div>


      <!-- ================= FOOTER BOTTOM ================= -->
      <div class="container footer-bottom">

        <div class="footer-copy">
          © 2026 VELORA Cookies
        </div>

        <div class="footer-tagline">
          Crafted for a sweeter day.
        </div>

        <div class="footer-bottom-links">

          <a href="#/faq">
            FAQ
          </a>

          <a href="#/about">
            Tentang
          </a>

          <a href="#/chat">
            Bantuan
          </a>

        </div>

      </div>

    </footer>
  `;
}

/* =========================================================
   PRODUCT UI
========================================================= */

function visual(product, big = false) {
  if (product?.image) {
    return `
      <img
        src="${esc(product.image)}"
        alt="${esc(product.name || "Cookies")}"
        loading="lazy"
      >
    `;
  }

  return `
    <div
      class="${big ? "big-cookie" : "mini-cookie"}"
    ></div>
  `;
}

function card(product) {
  const wishActive = S.wish.some(
    item => String(item.id) === String(product.id)
  );

  return `
    <article
      class="card product rise"
      data-product="${product.id}"
    >

      <div class="media">

        ${visual(product)}

        <button
          class="wish ${wishActive ? "on" : ""}"
          data-wish="${product.id}"
          type="button"
          title="Wishlist"
          aria-label="Wishlist"
        >
          ${icon("heart", 17)}
        </button>

      </div>

      <div class="product-body">

        <span class="eyebrow">
          ${esc(product.categories?.name || "Cookies")}
        </span>

        <h3>
          ${esc(product.name)}
        </h3>

        <div class="price">
          ${money(product.price)}

          <span class="muted">
            / ${esc(product.unit || "box")}
          </span>
        </div>

        <div class="meta">

          <span class="stars">
            ★★★★★
          </span>

          <div
            style="
              display:flex;
              gap:8px;
              flex-wrap:wrap;
              justify-content:flex-end;
            "
          >

            <button
              class="btn soft sm"
              data-buy="${product.id}"
              type="button"
            >
              ${icon("shopping-bag", 15)}
              Beli Sekarang
            </button>

            <button
              class="btn primary sm"
              data-add="${product.id}"
              type="button"
            >
              ${icon("plus", 15)}
              Tambah
            </button>

          </div>

        </div>

      </div>

    </article>
  `;
}
function homeFaqPreview(){
  return `
    <div class="faq-preview-grid">

      <article class="faq-preview-item">
        <span>01</span>

        <strong>
          Berapa lama pengiriman?
        </strong>

        <p>
          Estimasi pengiriman dapat kamu lihat
          saat proses checkout.
        </p>
      </article>

      <article class="faq-preview-item">
        <span>02</span>

        <strong>
          Apakah cookies fresh?
        </strong>

        <p>
          Setiap batch dibuat dengan perhatian
          pada rasa, aroma, dan teksturnya.
        </p>
      </article>

      <article class="faq-preview-item">
        <span>03</span>

        <strong>
          Bagaimana cara order?
        </strong>

        <p>
          Pilih produk, masukkan ke keranjang,
          lalu lanjutkan ke checkout.
        </p>
      </article>

    </div>
  `;
}

/* =========================================================
   HOME
========================================================= */

function home() {
  const best = S.products
    .filter(product => product.featured)
    .slice(0, 4);

  return `
    <div class="velora-home">

      ${top()}

      <main>

        <!-- =====================================================
             HERO — SINGLE SLIDE
             ===================================================== -->

        <section class="hero-home">

          <div class="container hero-home-inner">

            <!-- LEFT -->
            <div class="hero-home-copy">

              <span class="eyebrow">
                BAKED WITH INTENTION
              </span>

              <h1 class="hero-title-type">
                <span class="type-line type-line-one">
                  Cookies kecil,
                </span>
                <br>
                <span class="type-line type-line-two">
                  mood besar.
                </span>
              </h1>

              <p class="hero-description">
                Cookies premium dengan tekstur chewy,
                bahan pilihan, dan rasa yang dibuat
                untuk bikin hari terasa lebih baik.
              </p>

              <div class="hero-actions">

                <a href="#/shop" class="btn primary">
                  Jelajahi koleksi
                </a>

                <a href="#/about" class="btn ghost">
                  Cerita VELORA
                </a>

              </div>

              <div class="hero-meta">
                <span></span>
                <span class=""></span>
                <span></span>
              </div>

            </div>


            <!-- RIGHT -->
            <div class="hero-home-visual">

              <div class="hero-glow"></div>

              <div class="hero-image-wrap">

                <img
                  src="/assets/hero-cookies.png"
                  alt="VELORA Cookies"
                  class="hero-main-image"
                >

              </div>

              <div class="hero-float-card hero-float-one">

                <span class="hero-float-dot"></span>

                Freshly baked

              </div>


              <div class="hero-float-card hero-float-two">

                Customer favorite

              </div>

            </div>

          </div>

        </section>


        <!-- =====================================================
             BRAND STRIP
             ===================================================== -->

        <section class="brand-strip">

          <div class="container brand-strip-inner">

            <span>SMALL BATCH</span>

            <i></i>

            <span>FRESHLY BAKED</span>

            <i></i>

            <span>MADE WITH CARE</span>

            <i></i>

            <span>VELORA COOKIES</span>

          </div>

        </section>


        <!-- =====================================================
             BEST SELLERS
             ===================================================== -->

        <section class="section home-products">

          <div class="container">

            <div class="section-head">

              <div>

                <span class="eyebrow">
                  CURATED FOR YOU
                </span>

                <h2>
                  Best sellers.
                </h2>

              </div>

              <a
                href="#/shop"
                class="text-link"
              >
                Lihat semua ${icon("arrow-right")}
              </a>

            </div>


            <div class="product-grid">

              ${
                best.length
                  ? best.map(card).join("")
                  : `
                    <div class="empty">
                      Belum ada produk unggulan.
                    </div>
                  `
              }

            </div>

          </div>

        </section>


        <!-- =====================================================
             STORY
             ===================================================== -->

        <section class="home-story">

  <div class="container home-story-grid">

    <!-- LEFT -->
    <div class="home-story-copy">

      <span class="eyebrow">
        THE VELORA STANDARD
      </span>

      <h2>
        Sesederhana cookies,
        <span>sedetail itu prosesnya.</span>
      </h2>

      <p>
        Kami percaya cookies yang bagus bukan hanya soal rasa.
        Tekstur, aroma, bahan, dan cara kami membuat setiap batch
        semuanya punya cerita.
      </p>

      <div class="story-actions">
        <a href="#/about" class="btn dark">
          Kenal lebih jauh
        </a>
      </div>

      <!-- DETAIL KECIL -->
      <div class="story-points">

        <div class="story-point">
          <span>01</span>
          <div>
            <strong>Small batch</strong>
            <p>Dibuat dalam jumlah terkontrol.</p>
          </div>
        </div>

        <div class="story-point">
          <span>02</span>
          <div>
            <strong>Freshly baked</strong>
            <p>Menjaga tekstur dan rasa tetap nyaman.</p>
          </div>
        </div>

        <div class="story-point">
          <span>03</span>
          <div>
            <strong>Made with care</strong>
            <p>Detail kecil yang menjadi ciri VELORA.</p>
          </div>
        </div>

      </div>

    </div>


    <!-- RIGHT -->
    <div class="home-story-mark">

  <div class="velora-3d-logo">

    <div class="velora-3d-ring ring-back"></div>
    <div class="velora-3d-ring ring-mid"></div>

    <div class="velora-3d-disc">

      <div class="velora-logo-top">
        VELORA
      </div>

      <div class="velora-logo-v">
        V
      </div>

      <div class="velora-logo-bottom">
        COOKIES · EST. 2026
      </div>

    </div>

  </div>

  <div class="velora-emblem-caption">
    SMALL BATCH <span>•</span> FRESHLY BAKED
  </div>

</div>
</section>

        <!-- =====================================================
             FAQ PREVIEW
             ===================================================== -->

        <section class="section home-faq">

          <div class="container">

            <div class="section-head">

              <div>

                <span class="eyebrow">
                  NEED TO KNOW
                </span>

                <h2>
                  Sebelum checkout.
                </h2>

              </div>

              <a
                href="#/faq"
                class="text-link"
              >
                Lihat FAQ ${icon("arrow-right")}
              </a>

            </div>


            <div class="faq-preview-grid">

              <div class="faq-preview-item">

                <span>01</span>

                <strong>
                  Berapa lama pengiriman?
                </strong>

                <p>
                  Informasi estimasi pengiriman
                  tersedia di halaman checkout.
                </p>

              </div>


              <div class="faq-preview-item">

                <span>02</span>

                <strong>
                  Apakah cookies fresh?
                </strong>

                <p>
                  Setiap batch dibuat dengan
                  perhatian pada rasa dan tekstur.
                </p>

              </div>


              <div class="faq-preview-item">

                <span>03</span>

                <strong>
                  Bagaimana cara order?
                </strong>

                <p>
                  Pilih produk, masukkan ke keranjang,
                  lalu lanjutkan checkout.
                </p>

              </div>

            </div>

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}

/* =========================================================
   SHOP
========================================================= */

function shop() {
  const params = new URLSearchParams(
    location.hash.split("?")[1] || ""
  );

  const category = params.get("category") || "";
  const sort = params.get("sort") || "featured";

  return `
    <div>

      ${top()}

      <main class="container page">

        <div class="page-title">

          <div>
            <span class="eyebrow">
              VELORA COLLECTION
            </span>

            <h1>
              Semua cookies
            </h1>
          </div>

          <span class="muted">
            ${S.products.length} produk
          </span>

        </div>

        <div class="filters">

          <input
            class="input"
            id="sq"
            value="${esc(params.get("q") || "")}"
            placeholder="Cari..."
            style="max-width:300px"
          >

          <select
            class="select"
            id="sc"
            style="max-width:220px"
          >
            <option value="">
              Semua kategori
            </option>

            ${S.cats
              .map(
                categoryItem => `
                  <option
                    value="${categoryItem.id}"
                    ${
                      category === String(categoryItem.id)
                        ? "selected"
                        : ""
                    }
                  >
                    ${esc(categoryItem.name)}
                  </option>
                `
              )
              .join("")}

          </select>

          <select
            class="select"
            id="ss"
            style="max-width:220px"
          >

            <option
              value="featured"
              ${sort === "featured" ? "selected" : ""}
            >
              Featured
            </option>

            <option
              value="newest"
              ${sort === "newest" ? "selected" : ""}
            >
              Terbaru
            </option>

            <option
              value="price_asc"
              ${sort === "price_asc" ? "selected" : ""}
            >
              Termurah
            </option>

            <option
              value="price_desc"
              ${sort === "price_desc" ? "selected" : ""}
            >
              Termahal
            </option>

          </select>

          <button
            class="btn dark"
            id="goSearch"
            type="button"
          >
            ${icon("search", 16)}
            Cari
          </button>

        </div>

        ${
          S.products.length
            ? `
              <div class="grid">
                ${S.products.map(card).join("")}
              </div>
            `
            : `
              <div class="panel empty">
                ${icon("search", 40)}
                <h3>
                  Produk tidak ditemukan
                </h3>
                <p>
                  Coba kata kunci atau kategori lain.
                </p>
              </div>
            `
        }

      </main>

      ${foot()}

    </div>
  `;
}

/* =========================================================
   PRODUCT DETAIL
========================================================= */

async function detail(id) {
  const result = await api(`/api/products/${id}`);
  const product = result.product;

  return `
    <div>

      ${top()}

      <main class="container page">

        <div class="detail">

          <div class="detail-media">
            ${visual(product, true)}
          </div>

          <div>

            <span class="eyebrow">
              ${esc(product.categories?.name || "Cookies")}
            </span>

            <h1>
              ${esc(product.name)}
            </h1>

            <div
              class="price"
              style="font-size:28px"
            >
              ${money(product.price)}
              /
              ${esc(product.unit || "box")}
            </div>

            <div class="rating">

              <span class="stars">
                ★★★★★
              </span>

              <span>
                ${result.reviews?.length || 0}
                review
              </span>

            </div>

            <p
              class="muted"
              style="line-height:1.85"
            >
              ${esc(
                product.description ||
                "Cookies premium VELORA."
              )}
            </p>

            <p class="muted">
              Stok:
              <b>
                ${product.stock}
              </b>
            </p>

            <div
              style="
                display:flex;
                gap:9px;
                margin-top:20px
              "
            >

              <button
                class="btn primary"
                data-add="${product.id}"
                type="button"
              >
                ${icon("shopping-bag", 17)}
                Tambah ke keranjang
              </button>

              <button
                class="icon-btn"
                data-wish="${product.id}"
                type="button"
              >
                ${icon("heart")}
              </button>

            </div>

          </div>

        </div>

        <section
          class="section"
          style="
            padding-left:0;
            padding-right:0;
          "
        >

          <div class="section-head">

            <div>
              <span class="eyebrow">
                COMMUNITY
              </span>

              <h2>
                Review pelanggan
              </h2>
            </div>

          </div>

          ${
            result.reviews?.length
              ? result.reviews
                  .map(
                    review => `
                      <div class="review">

                        <div class="review-head">

                          <b>
                            ${esc(
                              review.profiles?.name ||
                              "Customer"
                            )}
                          </b>

                          <span class="stars">
                            ${"★".repeat(
                              Number(review.rating || 0)
                            )}
                          </span>

                        </div>

                        <p class="muted">
                          ${esc(
                            review.comment || ""
                          )}
                        </p>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="panel empty">
                  Belum ada review.
                </div>
              `
          }

        </section>

      </main>

      ${foot()}

    </div>
  `;
}

/* =========================================================
   CART
========================================================= */

function cart() {

  if (!S.user) {
    return wrap(
      "Keranjang",
      loginBox("Login untuk melihat keranjang kamu.")
    );
  }

  const items = Array.isArray(S.cart)
    ? S.cart
    : [];

  if (!items.length) {

    return `
      <div class="cart-page">

        ${top()}

        <main class="container page">

          <section class="cart-empty-shell">

            <div class="cart-empty-glow cart-glow-a"></div>
            <div class="cart-empty-glow cart-glow-b"></div>

            <div class="cart-empty-icon">
              ${icon("shopping-bag", 31)}
            </div>

            <span class="eyebrow">
              YOUR BAG
            </span>

            <h1>
              Keranjangmu masih kosong.
            </h1>

            <p>
              Temukan cookies favoritmu dan isi keranjang
              dengan sesuatu yang enak.
            </p>

            <div class="cart-empty-actions">

              <a
                href="#/shop"
                class="btn primary"
              >
                ${icon("shopping-bag", 16)}
                Mulai Belanja
              </a>

              <a
                href="#/wishlist"
                class="btn ghost"
              >
                ${icon("heart", 16)}
                Lihat Wishlist
              </a>

            </div>

          </section>

        </main>

        ${foot()}

      </div>
    `;
  }

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        Number(item.products?.price || 0) *
        Number(item.qty || 0),
      0
    );

  const totalItems =
    items.reduce(
      (sum, item) =>
        sum + Number(item.qty || 0),
      0
    );

  const shippingEstimate = 12000;

  const grandTotal =
    subtotal + shippingEstimate;

  return `
    <div class="cart-page">

      ${top()}

      <main class="container page">

        <!-- =========================================
             HEADER
        ========================================== -->

        <section class="cart-heading">

          <div>

            <span class="eyebrow">
              YOUR BAG
            </span>

            <h1>
              Keranjang
            </h1>

            <p>
              ${totalItems}
              ${totalItems > 1 ? "produk" : "produk"}
              siap diproses ke checkout.
            </p>

          </div>

          <div class="cart-heading-badge">

            <span>
              ${icon("shopping-bag", 17)}
            </span>

            <div>

              <small>
                Total item
              </small>

              <strong>
                ${totalItems}
              </strong>

            </div>

          </div>

        </section>


        <!-- =========================================
             CART LAYOUT
        ========================================== -->

        <section class="cart-layout">

          <!-- =======================================
               ITEMS
          ======================================== -->

          <div class="cart-items-column">

            <div class="cart-section-head">

              <div>

                <h2>
                  Produk pilihanmu
                </h2>

                <span>
                  ${items.length}
                  ${items.length > 1 ? "jenis" : "jenis"}
                  cookies
                </span>

              </div>

              <a
                href="#/shop"
                class="btn soft sm"
              >
                ${icon("plus", 14)}
                Tambah produk
              </a>

            </div>


            <div class="cart-item-list">

              ${items
                .map(
                  item => {

                    const product =
                      item.products || {};

                    const quantity =
                      Math.max(
                        1,
                        Number(item.qty || 1)
                      );

                    const price =
                      Number(product.price || 0);

                    const lineTotal =
                      price * quantity;

                    return `
                      <article
                        class="cart-product-card"
                      >

                        <!-- PRODUCT VISUAL -->

                        <a
                          href="#/product/${product.id}"
                          class="cart-product-media"
                        >

                          ${visual(product)}

                        </a>


                        <!-- PRODUCT INFO -->

                        <div class="cart-product-main">

                          <div
                            class="cart-product-heading"
                          >

                            <div>

                              <span class="eyebrow">
                                ${esc(
                                  product.categories?.name ||
                                  "Cookies"
                                )}
                              </span>

                              <a
                                href="#/product/${product.id}"
                                class="cart-product-name"
                              >
                                ${esc(
                                  product.name ||
                                  "Produk"
                                )}
                              </a>

                            </div>

                            <button
                              class="cart-remove"
                              data-rm="${item.id}"
                              type="button"
                              title="Hapus produk"
                              aria-label="Hapus ${esc(
                                product.name || "produk"
                              )}"
                            >
                              ${icon("trash-2", 16)}
                            </button>

                          </div>


                          <div
                            class="cart-product-details"
                          >

                            <span class="cart-price">
                              ${money(price)}
                            </span>

                            <span class="cart-unit">
                              /
                              ${esc(
                                product.unit ||
                                "box"
                              )}
                            </span>

                            <span class="cart-dot">
                              •
                            </span>

                            <span class="cart-stock">
                              ${Number(
                                product.stock || 0
                              ) > 0
                                ? "Tersedia"
                                : "Stok habis"}
                            </span>

                          </div>


                          <div
                            class="cart-product-bottom"
                          >

                            <!-- QUANTITY -->

                            <div class="cart-qty-control">

                              <button
                                type="button"
                                class="cart-qty-btn"
                                data-cart-minus="${item.id}"
                                aria-label="Kurangi jumlah"
                              >
                                ${icon("minus", 14)}
                              </button>

                              <span
                                class="cart-qty-value"
                                data-cart-qty="${item.id}"
                              >
                                ${quantity}
                              </span>

                              <button
                                type="button"
                                class="cart-qty-btn"
                                data-cart-plus="${item.id}"
                                aria-label="Tambah jumlah"
                              >
                                ${icon("plus", 14)}
                              </button>

                            </div>


                            <!-- LINE TOTAL -->

                            <strong
                              class="cart-line-total"
                            >
                              ${money(lineTotal)}
                            </strong>

                          </div>

                        </div>

                      </article>
                    `;
                  }
                )
                .join("")}

            </div>

          </div>


          <!-- =======================================
               SUMMARY
          ======================================== -->

          <aside class="cart-summary">

            <div class="cart-summary-inner">

              <div class="cart-summary-top">

                <span class="eyebrow">
                  ORDER SUMMARY
                </span>

                <h2>
                  Ringkasan
                </h2>

              </div>


              <!-- SUMMARY ROWS -->

              <div class="cart-summary-lines">

                <div class="cart-summary-row">

                  <span>
                    Produk
                  </span>

                  <strong>
                    ${money(subtotal)}
                  </strong>

                </div>


                <div class="cart-summary-row">

                  <span>
                    Ongkir
                  </span>

                  <strong>
                    ${money(shippingEstimate)}
                  </strong>

                </div>


                <div
                  class="cart-summary-divider"
                ></div>


                <div
                  class="cart-summary-row cart-summary-total"
                >

                  <span>
                    Total
                  </span>

                  <strong>
                    ${money(grandTotal)}
                  </strong>

                </div>

              </div>


              <!-- CHECKOUT -->

              <a
                href="#/checkout"
                class="btn primary cart-checkout-btn"
              >
                Lanjut ke Checkout
                ${icon("arrow-right", 16)}
              </a>


              <!-- EXTRA INFO -->

              <div class="cart-safe-note">

                <span>
                  ${icon("shield-check", 15)}
                </span>

                <p>
                  Pesananmu diproses dengan aman
                  dan detailnya bisa kamu pantau
                  dari halaman Orders.
                </p>

              </div>

            </div>

          </aside>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}
/* =========================================================
   LOGIN BOX
========================================================= */

function loginBox(message) {
  return `
    <div class="panel empty">

      <p>
        ${esc(message)}
      </p>

      <button
        class="btn primary"
        id="openAuth2"
        type="button"
      >
        Masuk / Daftar
      </button>

    </div>
  `;
}

/* =========================================================
   WISHLIST
========================================================= */

function wish() {

  if (!S.user) {
    return wrap(
      "Wishlist",
      loginBox("Login untuk melihat wishlist kamu.")
    );
  }

  const items = Array.isArray(S.wish)
    ? S.wish
    : [];

  const count = items.length;

  const totalValue =
    items.reduce(
      (sum, product) =>
        sum +
        Number(product.price || 0),
      0
    );

  if (!count) {

    return `
      <div class="wishlist-page">

        ${top()}

        <main class="container page">

          <section class="wishlist-empty-shell">

            <div class="wishlist-empty-orb orb-a"></div>
            <div class="wishlist-empty-orb orb-b"></div>

            <div class="wishlist-empty-icon">
              ${icon("heart", 30)}
            </div>

            <span class="eyebrow">
              YOUR CURATED LIST
            </span>

            <h1>
              Belum ada yang kamu simpan.
            </h1>

            <p>
              Simpan cookies favoritmu di sini,
              lalu kembali kapan saja saat kamu siap checkout.
            </p>

            <div class="wishlist-empty-actions">

              <a
                href="#/shop"
                class="btn primary"
              >
                ${icon("shopping-bag", 16)}
                Jelajahi Cookies
              </a>

              <a
                href="#/"
                class="btn ghost"
              >
                ${icon("arrow-left", 16)}
                Kembali ke Home
              </a>

            </div>

          </section>

        </main>

        ${foot()}

      </div>
    `;
  }

  return `
    <div class="wishlist-page">

      ${top()}

      <main class="container page">

        <!-- =========================================
             HEADER
        ========================================== -->

        <section class="wishlist-hero">

          <div class="wishlist-heading">

            <div class="wishlist-heading-copy">

              <span class="eyebrow">
                YOUR CURATED LIST
              </span>

              <h1>
                Wishlist
              </h1>

              <p>
                Semua cookies yang menarik perhatianmu,
                dikumpulkan dalam satu tempat.
              </p>

            </div>

            <div class="wishlist-heart-mark">
              ${icon("heart", 25)}
            </div>

          </div>

          <!-- =========================================
               STATS
          ========================================== -->

          <div class="wishlist-stats">

            <div class="wishlist-stat">

              <span class="wishlist-stat-icon">
                ${icon("heart", 16)}
              </span>

              <div>
                <small>
                  Tersimpan
                </small>

                <strong>
                  ${count}
                </strong>
              </div>

            </div>

            <div class="wishlist-stat">

              <span class="wishlist-stat-icon">
                ${icon("shopping-bag", 16)}
              </span>

              <div>
                <small>
                  Koleksi
                </small>

                <strong>
                  ${count} item
                </strong>
              </div>

            </div>

            <div class="wishlist-stat wishlist-stat-value">

              <span class="wishlist-stat-icon">
                ${icon("wallet", 16)}
              </span>

              <div>
                <small>
                  Nilai produk
                </small>

                <strong>
                  ${money(totalValue)}
                </strong>
              </div>

            </div>

          </div>

        </section>


        <!-- =========================================
             TOOLBAR
        ========================================== -->

        <section class="wishlist-toolbar">

          <div>

            <span class="wishlist-toolbar-title">
              Pilihan kamu
            </span>

            <span class="wishlist-toolbar-count">
              ${count} produk
            </span>

          </div>

          <a
            href="#/shop"
            class="btn soft sm"
          >
            ${icon("plus", 14)}
            Tambah pilihan
          </a>

        </section>


        <!-- =========================================
             PRODUCT GRID
        ========================================== -->

        <section class="wishlist-grid">

          ${items
            .map(
              product => {

                const category =
                  product.categories?.name ||
                  "Cookies";

                return `
                  <article
                    class="wishlist-card product"
                    data-product="${product.id}"
                  >

                    <div class="wishlist-card-media">

                      ${visual(product)}

                      <div class="wishlist-card-overlay"></div>

                      <div class="wishlist-category">
                        ${esc(category)}
                      </div>

                      <button
                        class="wishlist-remove wish on"
                        data-wish="${product.id}"
                        type="button"
                        title="Hapus dari wishlist"
                        aria-label="Hapus ${esc(product.name)} dari wishlist"
                      >
                        ${icon("heart", 17)}
                      </button>

                    </div>


                    <div class="wishlist-card-body">

                      <div class="wishlist-product-top">

                        <div>

                          <span class="eyebrow">
                            ${esc(category)}
                          </span>

                          <h3>
                            ${esc(product.name)}
                          </h3>

                        </div>

                        <div class="wishlist-price">
                          ${money(product.price)}
                        </div>

                      </div>


                      <div class="wishlist-product-meta">

                        <span>
                          <span class="stars">
                            ★★★★★
                          </span>

                          <small>
                            Favorit
                          </small>
                        </span>

                        <span class="wishlist-unit">
                          / ${esc(product.unit || "box")}
                        </span>

                      </div>


                      <div class="wishlist-card-actions">

                        <button
                          class="btn soft sm"
                          data-add="${product.id}"
                          type="button"
                        >
                          ${icon("plus", 14)}
                          Tambah
                        </button>

                        <button
                          class="btn primary sm"
                          data-buy="${product.id}"
                          type="button"
                        >
                          ${icon("shopping-bag", 14)}
                          Beli Sekarang
                        </button>

                      </div>

                    </div>

                  </article>
                `;
              }
            )
            .join("")}

        </section>

      </main>

      ${foot()}

    </div>
  `;
}
/* =========================================================
   CHECKOUT
========================================================= */

function checkout() {

  if (!S.user) {
    return wrap(
      "Checkout",
      loginBox("Login sebelum checkout.")
    );
  }

  const isDirectCheckout =
    Boolean(S.directCheckout?.productId);

  const direct =
    isDirectCheckout
      ? S.products.find(
          product =>
            String(product.id) ===
            String(S.directCheckout.productId)
        )
      : null;

  if (isDirectCheckout && !direct) {
    return wrap(
      "Checkout",
      `
        <div class="panel empty">
          <h3>Produk tidak ditemukan</h3>

          <p class="muted">
            Produk yang ingin kamu beli sudah tidak tersedia
            atau gagal dimuat.
          </p>

          <br>

          <a
            href="#/shop"
            class="btn primary"
          >
            Kembali ke toko
          </a>
        </div>
      `
    );
  }

  const checkoutItems =
    direct
      ? [
          {
            products: direct,
            qty: Math.max(
              1,
              Number(
                S.directCheckout.qty || 1
              )
            )
          }
        ]
      : S.cart;

  if (!checkoutItems.length) {
    return wrap(
      "Checkout",
      `
        <div class="panel empty">

          <h3>
            Keranjang kamu masih kosong
          </h3>

          <p class="muted">
            Tambahkan produk terlebih dahulu
            sebelum melakukan checkout.
          </p>

          <br>

          <a
            href="#/shop"
            class="btn primary"
          >
            Belanja sekarang
          </a>

        </div>
      `
    );
  }

  const subtotal =
    checkoutItems.reduce(
      (sum, item) =>
        sum +
        Number(item.products.price || 0) *
        Number(item.qty || 0),
      0
    );

  const defaultShipping = 12000;

  const orderItemsHTML =
    checkoutItems
      .map(
        item => {

          const product =
            item.products || {};

          const qty =
            Number(item.qty || 1);

          const lineTotal =
            Number(product.price || 0) *
            qty;

          return `
            <div class="checkout-product">

              <div class="checkout-product-media">
                ${visual(product)}
              </div>

              <div class="checkout-product-info">

                <span class="checkout-product-category">
                  ${esc(
                    product.categories?.name ||
                    "VELORA COOKIES"
                  )}
                </span>

                <strong>
                  ${esc(
                    product.name ||
                    "Produk"
                  )}
                </strong>

                <span>
                  ${money(
                    Number(product.price || 0)
                  )}
                  × ${qty}
                </span>

              </div>

              <b class="checkout-product-price">
                ${money(lineTotal)}
              </b>

            </div>
          `;
        }
      )
      .join("");

  return `
    <div class="velora-checkout">

      ${top()}

      <main class="container page checkout-page">

        <!-- =========================================
             CHECKOUT HEADER
        ========================================== -->

        <section class="checkout-hero">

          <div>

            <span class="eyebrow">
              FINAL STEP
            </span>

            <h1>
              Selesaikan pesananmu.
            </h1>

            <p>
              Tinggal isi detail pengiriman,
              pilih pembayaran, lalu biarkan kami
              menyiapkan cookies favoritmu.
            </p>

          </div>

          <div class="checkout-secure">

            <span class="checkout-secure-icon">
              ${icon("shield-check",18)}
            </span>

            <div>
              <strong>
                Secure checkout
              </strong>

              <small>
                Data pesanan terlindungi
              </small>
            </div>

          </div>

        </section>


        <!-- =========================================
             PROGRESS
        ========================================== -->

        <div class="checkout-progress">

          <div class="checkout-progress-step active">

            <span>
              01
            </span>

            <div>
              <b>
                Detail
              </b>

              <small>
                Pengiriman
              </small>
            </div>

          </div>

          <div class="checkout-progress-line"></div>

          <div class="checkout-progress-step active">

            <span>
              02
            </span>

            <div>
              <b>
                Pembayaran
              </b>

              <small>
                Pilih metode
              </small>
            </div>

          </div>

          <div class="checkout-progress-line"></div>

          <div class="checkout-progress-step">

            <span>
              03
            </span>

            <div>
              <b>
                Selesai
              </b>

              <small>
                Pesanan diproses
              </small>
            </div>

          </div>

        </div>


        <!-- =========================================
             CHECKOUT FORM
        ========================================== -->

        <form
          id="checkout"
          class="checkout-layout"
          data-subtotal="${subtotal}"
        >

          <!-- =======================================
               LEFT
          ======================================== -->

          <div class="checkout-main">


            <!-- DELIVERY CARD -->

            <section class="checkout-card">

              <div class="checkout-card-head">

                <div class="checkout-section-number">
                  01
                </div>

                <div>

                  <span class="eyebrow">
                    DELIVERY DETAILS
                  </span>

                  <h2>
                    Detail pengiriman
                  </h2>

                  <p>
                    Pastikan informasi penerima
                    sudah benar.
                  </p>

                </div>

              </div>


              <div class="form-grid checkout-form-grid">

                <div class="field">

                  <label>
                    Nama penerima
                  </label>

                  <div class="checkout-input-wrap">

                    ${icon("user-round",16)}

                    <input
                      class="input"
                      name="recipient"
                      value="${esc(
                        S.user.name || ""
                      )}"
                      placeholder="Nama lengkap"
                      required
                    >

                  </div>

                </div>


                <div class="field">

                  <label>
                    WhatsApp
                  </label>

                  <div class="checkout-input-wrap">

                    ${icon("phone",16)}

                    <input
                      class="input"
                      name="phone"
                      value="${esc(
                        S.user.phone || ""
                      )}"
                      placeholder="08xxxxxxxxxx"
                      required
                    >

                  </div>

                </div>


                <div class="field full">

                  <label>
                    Alamat lengkap
                  </label>

                  <div class="checkout-input-wrap textarea-wrap">

                    ${icon("map-pin",16)}

                    <textarea
                      class="textarea"
                      rows="4"
                      name="address"
                      placeholder="Nama jalan, nomor rumah, kecamatan, kota..."
                      required
                    >${esc(
                      S.user.address || ""
                    )}</textarea>

                  </div>

                </div>


                <div class="field full">

                  <label>
                    Pengiriman
                  </label>

                  <div class="checkout-shipping-box">

                    <div class="checkout-shipping-icon">
                      ${icon("truck",18)}
                    </div>

                    <div class="checkout-shipping-info">

                      <strong>
                        Kurir pengiriman
                      </strong>

                      <small>
                        Estimasi pengiriman sesuai layanan
                      </small>

                    </div>

                    <select
                      class="select checkout-shipping-select"
                      name="shipping"
                      id="shipping"
                    >

                      <option value="regular">
                        Regular · Rp 12.000
                      </option>

                      <option value="express">
                        Express · Rp 25.000
                      </option>

                    </select>

                  </div>

                </div>

              </div>

            </section>


            <!-- PAYMENT CARD -->

            <section class="checkout-card">

              <div class="checkout-card-head">

                <div class="checkout-section-number">
                  02
                </div>

                <div>

                  <span class="eyebrow">
                    PAYMENT
                  </span>

                  <h2>
                    Pilih pembayaran
                  </h2>

                  <p>
                    Gunakan metode yang paling nyaman
                    untuk pesananmu.
                  </p>

                </div>

              </div>


              <div class="payment-options">


                <!-- MIDTRANS -->

                <label class="payment-option">

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="midtrans"
                    checked
                  >

                  <div class="payment-option-box">

                    <div class="payment-option-icon payment-purple">
                      ${icon("credit-card",19)}
                    </div>

                    <div class="payment-option-content">

                      <div class="payment-option-title">

                        <strong>
                          Midtrans
                        </strong>

                        <span class="payment-recommended">
                          RECOMMENDED
                        </span>

                      </div>

                      <p>
                        Pembayaran online melalui
                        QRIS, Virtual Account, e-wallet,
                        dan channel yang tersedia di Snap.
                      </p>

                    </div>

                    <div class="payment-option-radio">
                      <span></span>
                    </div>

                  </div>

                </label>


                <!-- COD -->

                <label class="payment-option">

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                  >

                  <div class="payment-option-box">

                    <div class="payment-option-icon payment-green">
                      ${icon("hand-coins",19)}
                    </div>

                    <div class="payment-option-content">

                      <div class="payment-option-title">

                        <strong>
                          COD
                        </strong>

                      </div>

                      <p>
                        Bayar saat pesanan
                        diterima.
                      </p>

                    </div>

                    <div class="payment-option-radio">
                      <span></span>
                    </div>

                  </div>

                </label>


                <!-- TRANSFER -->

                <label class="payment-option">

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                  >

                  <div class="payment-option-box">

                    <div class="payment-option-icon payment-dark">
                      ${icon("building-2",19)}
                    </div>

                    <div class="payment-option-content">

                      <div class="payment-option-title">

                        <strong>
                          Transfer manual
                        </strong>

                      </div>

                      <p>
                        Lakukan transfer dan
                        konfirmasi pembayaran
                        sesuai instruksi.
                      </p>

                    </div>

                    <div class="payment-option-radio">
                      <span></span>
                    </div>

                  </div>

                </label>


              </div>


              <div class="payment-security">

                <span>
                  ${icon("shield-check",16)}
                </span>

                <div>

                  <strong>
                    Pembayaran aman
                  </strong>

                  <p>
                    Untuk Midtrans, detail pembayaran
                    akan diproses melalui halaman
                    pembayaran resmi Midtrans.
                  </p>

                </div>

              </div>

            </section>


            <!-- VOUCHER + NOTE -->

            <section class="checkout-card">

              <div class="checkout-card-head compact">

                <div class="checkout-section-number">
                  03
                </div>

                <div>

                  <span class="eyebrow">
                    EXTRA
                  </span>

                  <h2>
                    Voucher & catatan
                  </h2>

                </div>

              </div>


              <div class="form-grid checkout-form-grid">

                <div class="field full">

                  <label>
                    Kode voucher
                  </label>

                  <div class="voucher-box">

                    <div class="checkout-input-wrap">

                      ${icon("ticket-percent",16)}

                      <input
                        class="input"
                        id="vc"
                        name="voucherCode"
                        placeholder="Masukkan kode voucher"
                        autocomplete="off"
                      >

                    </div>

                    <button
                      type="button"
                      class="btn soft voucher-button"
                      id="cv"
                    >
                      Terapkan
                    </button>

                  </div>

                  <small
                    id="vi"
                    class="checkout-voucher-info"
                  ></small>

                </div>


                <div class="field full">

                  <label>
                    Catatan pesanan
                  </label>

                  <div class="checkout-input-wrap textarea-wrap">

                    ${icon("notebook-pen",16)}

                    <textarea
                      class="textarea"
                      rows="3"
                      name="note"
                      placeholder="Contoh: Tolong packing dengan aman..."
                    ></textarea>

                  </div>

                </div>

              </div>

            </section>

          </div>


          <!-- =======================================
               RIGHT SUMMARY
          ======================================== -->

          <aside class="checkout-summary">

            <div class="checkout-summary-inner">

              <div class="checkout-summary-top">

                <div>

                  <span class="eyebrow">
                    ${
                      isDirectCheckout
                        ? "BUY NOW"
                        : "YOUR ORDER"
                    }
                  </span>

                  <h2>
                    Ringkasan pesanan
                  </h2>

                </div>

                <span class="checkout-summary-count">
                  ${checkoutItems.length}
                  ${checkoutItems.length === 1 ? "item" : "items"}
                </span>

              </div>


              <!-- PRODUCTS -->

              <div class="checkout-products">

                ${orderItemsHTML}

              </div>


              <!-- TOTALS -->

              <div class="checkout-total-list">

                <div class="checkout-total-row">

                  <span>
                    Subtotal
                  </span>

                  <strong>
                    ${money(subtotal)}
                  </strong>

                </div>


                <div class="checkout-total-row">

                  <span>
                    Diskon
                  </span>

                  <strong
                    id="disc"
                    class="discount-value"
                  >
                    ${money(0)}
                  </strong>

                </div>


                <div class="checkout-total-row">

                  <span>
                    Ongkir
                  </span>

                  <strong id="ship">
                    ${money(defaultShipping)}
                  </strong>

                </div>

              </div>


              <div class="checkout-grand-total">

                <div>

                  <span>
                    Total pembayaran
                  </span>

                  <small>
                    Sudah termasuk ongkir
                  </small>

                </div>

                <strong id="total">
                  ${money(
                    subtotal +
                    defaultShipping
                  )}
                </strong>

              </div>


              <!-- CTA -->

              <button
                class="checkout-submit"
                type="submit"
              >

                <span>

                  <small>
                    ${
                      isDirectCheckout
                        ? "Beli sekarang"
                        : "Lanjutkan checkout"
                    }
                  </small>

                  <strong>
                    Lanjut ke pembayaran
                  </strong>

                </span>

                <span class="checkout-submit-icon">
                  ${icon("arrow-right",19)}
                </span>

              </button>


              <div class="checkout-trust">

                <div>
                  ${icon("shield-check",15)}
                  Secure checkout
                </div>

                <div>
                  ${icon("lock-keyhole",15)}
                  Data terenkripsi
                </div>

              </div>


              <div class="checkout-mini-note">

                <span>
                  ${icon("cookie",16)}
                </span>

                <p>
                  Cookies dibuat dengan perhatian
                  untuk setiap pesanan VELORA.
                </p>

              </div>

            </div>

          </aside>

        </form>

      </main>

      ${foot()}

    </div>
  `;
}


/* =========================================================
   PROFILE
========================================================= */
function customerDashboard() {

  if (!S.user) {
    return wrap(
      "Dashboard",
      loginBox(
        "Login untuk membuka dashboard customer."
      )
    );
  }

  const latest =
    S.orders
      .slice(0, 3);

  const unread =
    S.notes.filter(
      item => !item.is_read
    ).length;

  const wishlistCount =
    S.wish.length;

  return `
    <div>

      ${top()}

      <main class="container page customer-dashboard">

        <section class="customer-welcome">

          <div>

            <span class="eyebrow">
              WELCOME BACK
            </span>

            <h1>
              Halo, ${esc(
                S.user.name ||
                "Customer"
              )}.
            </h1>

            <p class="muted">
              Temukan cookies favoritmu dan cek
              perjalanan pesananmu di satu tempat.
            </p>

          </div>

          <a
            href="#/shop"
            class="btn primary"
          >
            ${icon("shopping-bag",16)}
            Mulai Belanja
          </a>

        </section>


        <section class="customer-stats">

          <a
            href="#/orders"
            class="customer-stat"
          >

            <span class="customer-stat-icon">
              ${icon("shopping-bag",18)}
            </span>

            <div>
              <small>
                Pesanan
              </small>

              <strong>
                ${S.orders.length}
              </strong>
            </div>

          </a>


          <a
            href="#/wishlist"
            class="customer-stat"
          >

            <span class="customer-stat-icon">
              ${icon("heart",18)}
            </span>

            <div>
              <small>
                Wishlist
              </small>

              <strong>
                ${wishlistCount}
              </strong>
            </div>

          </a>


          <a
            href="#/notifications"
            class="customer-stat"
          >

            <span class="customer-stat-icon">
              ${icon("bell",18)}
            </span>

            <div>
              <small>
                Notifikasi
              </small>

              <strong>
                ${unread}
              </strong>
            </div>

          </a>

        </section>


        <section class="customer-layout">

          <div class="panel">

            <div class="section-head">

              <div>

                <span class="eyebrow">
                  RECENT ORDERS
                </span>

                <h2>
                  Pesanan terbaru
                </h2>

              </div>

              <a
                href="#/orders"
                class="btn soft sm"
              >
                Semua pesanan
              </a>

            </div>


            ${
              latest.length
                ? latest.map(
                    order => `

                      <a
                        href="#/orders"
                        class="customer-order"
                      >

                        <div>

                          <b>
                            ${esc(
                              order.order_code
                            )}
                          </b>

                          <small>
                            ${new Date(
                              order.created_at
                            ).toLocaleDateString(
                              "id-ID"
                            )}
                          </small>

                        </div>

                        <div>

                          <strong>
                            ${money(
                              order.total
                            )}
                          </strong>

                          <span
                            class="badge ${
                              order.status ===
                              "completed"
                                ? "good"
                                : ""
                            }"
                          >
                            ${esc(
                              order.status
                            )}
                          </span>

                        </div>

                      </a>

                    `
                  ).join("")
                : `
                  <div class="empty">
                    Belum ada pesanan.
                  </div>
                `
            }

          </div>


          <div class="panel customer-quick">

            <span class="eyebrow">
              QUICK ACCESS
            </span>

            <h3>
              Akses cepat
            </h3>


            <a
              href="#/orders"
              class="quick-link"
            >
              ${icon("package",17)}
              <span>
                Pesanan Saya
              </span>
              ${icon("chevron-right",15)}
            </a>


            <a
              href="#/wishlist"
              class="quick-link"
            >
              ${icon("heart",17)}
              <span>
                Wishlist
              </span>
              ${icon("chevron-right",15)}
            </a>


            <a
              href="#/chat"
              class="quick-link"
            >
              ${icon("message-circle",17)}
              <span>
                Live Chat
              </span>
              ${icon("chevron-right",15)}
            </a>


            <a
              href="#/profile"
              class="quick-link"
            >
              ${icon("user-round",17)}
              <span>
                Profil
              </span>
              ${icon("chevron-right",15)}
            </a>

          </div>

        </section>


        <section class="section customer-products">

          <div class="section-head">

            <div>

              <span class="eyebrow">
                DISCOVER
              </span>

              <h2>
                Mungkin kamu suka
              </h2>

            </div>

            <a
              href="#/shop"
              class="btn soft"
            >
              Lihat semua
            </a>

          </div>


          <div class="grid">

            ${S.products
              .slice(0,4)
              .map(card)
              .join("")}

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}


function profile() {

  if (!S.user) {
    return wrap(
      "Profil",
      loginBox("Login untuk melihat profil kamu.")
    );
  }

  const user =
    S.user || {};

  const name =
    String(
      user.name || "Velora User"
    ).trim();

  const email =
    String(
      user.email || ""
    ).trim();

  const phone =
    String(
      user.phone || ""
    ).trim();

  const address =
    String(
      user.address || ""
    ).trim();

  const initial =
    (
      name
        .trim()
        .charAt(0) ||
      "V"
    ).toUpperCase();

  const cartCount =
    Array.isArray(S.cart)
      ? S.cart.reduce(
          (sum, item) =>
            sum +
            Number(item.qty || 0),
          0
        )
      : 0;

  const wishlistCount =
    Array.isArray(S.wish)
      ? S.wish.length
      : 0;

  const notificationCount =
    Array.isArray(S.notes)
      ? S.notes.filter(
          item =>
            !item.read &&
            !item.is_read
        ).length
      : 0;

  return `
    <div class="profile-page">

      ${top()}

      <main class="container page">

        <!-- =========================================
             HEADER
        ========================================== -->

        <section class="profile-page-head">

          <div>

            <span class="eyebrow">
              MY ACCOUNT
            </span>

            <h1>
              Profil Saya
            </h1>

            <p>
              Kelola informasi akun dan preferensi
              kamu di Velora Cookies.
            </p>

          </div>

        </section>


        <!-- =========================================
             PROFILE LAYOUT
        ========================================== -->

        <section class="profile-layout">

          <!-- =======================================
               PROFILE IDENTITY
          ======================================== -->

          <aside class="profile-side">

            <div class="profile-identity-card">

              <div class="profile-cover">

                <div class="profile-cover-glow"></div>

              </div>


              <div class="profile-avatar-wrap">

                <div class="profile-avatar">
                  ${esc(initial)}
                </div>

                <span
                  class="profile-online-dot"
                  title="Akun aktif"
                ></span>

              </div>


              <div class="profile-identity-content">

                <span class="eyebrow">
                  CUSTOMER
                </span>

                <h2>
                  ${esc(name)}
                </h2>

                <p>
                  ${esc(
                    email ||
                    "Email belum tersedia"
                  )}
                </p>

                ${
                  phone
                    ? `
                      <span class="profile-phone">
                        ${icon("phone", 12)}
                        ${esc(phone)}
                      </span>
                    `
                    : ""
                }

              </div>


              <!-- ACCOUNT STATS -->

              <div class="profile-mini-stats">

                <a
                  href="#/wishlist"
                  class="profile-mini-stat"
                >

                  <span>
                    ${icon("heart", 15)}
                  </span>

                  <div>
                    <strong>
                      ${wishlistCount}
                    </strong>

                    <small>
                      Wishlist
                    </small>
                  </div>

                </a>


                <a
                  href="#/cart"
                  class="profile-mini-stat"
                >

                  <span>
                    ${icon("shopping-bag", 15)}
                  </span>

                  <div>
                    <strong>
                      ${cartCount}
                    </strong>

                    <small>
                      Keranjang
                    </small>
                  </div>

                </a>


                <a
                  href="#/notifications"
                  class="profile-mini-stat"
                >

                  <span>
                    ${icon("bell", 15)}
                  </span>

                  <div>
                    <strong>
                      ${notificationCount}
                    </strong>

                    <small>
                      Update
                    </small>
                  </div>

                </a>

              </div>


              <!-- QUICK LINKS -->

              <div class="profile-quick-links">

                <a href="#/orders">

                  <span>
                    ${icon("package", 15)}
                  </span>

                  <div>
                    <strong>
                      Pesanan Saya
                    </strong>

                    <small>
                      Lihat riwayat pesanan
                    </small>
                  </div>

                  ${icon(
                    "chevron-right",
                    15
                  )}

                </a>


                <a href="#/wishlist">

                  <span>
                    ${icon("heart", 15)}
                  </span>

                  <div>
                    <strong>
                      Wishlist
                    </strong>

                    <small>
                      Produk yang kamu simpan
                    </small>
                  </div>

                  ${icon(
                    "chevron-right",
                    15
                  )}

                </a>


                <a href="#/chat">

                  <span>
                    ${icon(
                      "messages-square",
                      15
                    )}
                  </span>

                  <div>
                    <strong>
                      Live Chat
                    </strong>

                    <small>
                      Ngobrol dengan komunitas
                    </small>
                  </div>

                  ${icon(
                    "chevron-right",
                    15
                  )}

                </a>

              </div>

            </div>

          </aside>


          <!-- =======================================
               PROFILE FORM
          ======================================== -->

          <div class="profile-main">

            <form
              id="profileForm"
              class="profile-form-card"
            >

              <div class="profile-form-head">

                <div>

                  <span class="eyebrow">
                    PERSONAL INFORMATION
                  </span>

                  <h2>
                    Informasi pribadi
                  </h2>

                  <p>
                    Pastikan informasi kontak kamu
                    selalu sesuai agar pesanan dapat diproses.
                  </p>

                </div>

                <div class="profile-form-head-icon">
                  ${icon("user-round", 20)}
                </div>

              </div>


              <div class="profile-form-grid">

                <!-- NAME -->

                <div class="field">

                  <label>
                    Nama lengkap
                  </label>

                  <div class="profile-input-wrap">

                    ${icon(
                      "user",
                      15
                    )}

                    <input
                      class="input profile-input"
                      name="name"
                      value="${esc(name)}"
                      autocomplete="name"
                      placeholder="Nama lengkap"
                      required
                    >

                  </div>

                </div>


                <!-- EMAIL -->

                <div class="field">

                  <label>
                    Email
                  </label>

                  <div class="profile-input-wrap locked">

                    ${icon(
                      "mail",
                      15
                    )}

                    <input
                      class="input profile-input"
                      value="${esc(email)}"
                      type="email"
                      readonly
                    >

                    <span
                      class="profile-locked"
                      title="Email akun"
                    >
                      ${icon(
                        "lock",
                        12
                      )}
                    </span>

                  </div>

                  <small class="profile-field-note">
                    Email akun digunakan untuk autentikasi.
                  </small>

                </div>


                <!-- PHONE -->

                <div class="field">

                  <label>
                    Nomor WhatsApp
                  </label>

                  <div class="profile-input-wrap">

                    ${icon(
                      "phone",
                      15
                    )}

                    <input
                      class="input profile-input"
                      name="phone"
                      value="${esc(phone)}"
                      type="tel"
                      autocomplete="tel"
                      placeholder="08xxxxxxxxxx"
                    >

                  </div>

                </div>


                <!-- ROLE -->

                <div class="field">

                  <label>
                    Tipe akun
                  </label>

                  <div class="profile-input-wrap locked">

                    ${icon(
                      "badge-check",
                      15
                    )}

                    <input
                      class="input profile-input"
                      value="Customer"
                      readonly
                    >

                    <span
                      class="profile-role-badge"
                    >
                      CUSTOMER
                    </span>

                  </div>

                </div>


                <!-- ADDRESS -->

                <div class="field full">

                  <label>
                    Alamat utama
                  </label>

                  <div class="profile-input-wrap textarea-wrap">

                    ${icon(
                      "map-pin",
                      15
                    )}

                    <textarea
                      class="
                        textarea
                        profile-input
                        profile-textarea
                      "
                      name="address"
                      rows="5"
                      autocomplete="street-address"
                      placeholder="Masukkan alamat lengkap untuk pengiriman..."
                    >${esc(address)}</textarea>

                  </div>

                  <small class="profile-field-note">
                    Gunakan alamat yang jelas agar pesanan lebih mudah dikirim.
                  </small>

                </div>

              </div>


              <!-- SAVE BAR -->

              <div class="profile-save-bar">

                <div class="profile-save-status">

                  <span>
                    ${icon(
                      "shield-check",
                      15
                    )}
                  </span>

                  <div>

                    <strong>
                      Data akun aman
                    </strong>

                    <small>
                      Perubahan disimpan ke akun kamu.
                    </small>

                  </div>

                </div>


                <button
                  type="submit"
                  class="btn primary"
                  id="profileSave"
                >

                  ${icon(
                    "save",
                    15
                  )}

                  Simpan perubahan

                </button>

              </div>

            </form>

            <!-- =========================================
     ACCOUNT ACTION
========================================= -->

<section class="profile-logout-card">

  <div class="profile-logout-info">

    <div class="profile-logout-icon">
      ${icon("log-out", 18)}
    </div>

    <div>

      <span class="eyebrow">
        ACCOUNT
      </span>

      <h3>
        Keluar dari akun
      </h3>

      <p>
        Sesi akun kamu akan diakhiri pada perangkat ini.
      </p>

    </div>

  </div>

  <button
  type="button"
  class="btn profile-logout-btn"
  onclick="window.logout()"
>
  ${icon("log-out", 15)}
  Keluar Akun
</button>

</section>


            <!-- =====================================
                 ACCOUNT LINKS
            ====================================== -->

            <section class="profile-links-card">

              <div class="profile-links-head">

                <div>

                  <span class="eyebrow">
                    VELORA
                  </span>

                  <h2>
                    Aktivitas akun
                  </h2>

                </div>

              </div>


              <div class="profile-links-grid">

                <a
                  href="#/orders"
                  class="profile-link-item"
                >

                  <span class="profile-link-icon order">
                    ${icon(
                      "package-check",
                      17
                    )}
                  </span>

                  <div>

                    <strong>
                      Pesanan
                    </strong>

                    <small>
                      Pantau pesanan dan statusnya
                    </small>

                  </div>

                  ${icon(
                    "arrow-up-right",
                    15
                  )}

                </a>


                <a
                  href="#/notifications"
                  class="profile-link-item"
                >

                  <span class="profile-link-icon notification">
                    ${icon(
                      "bell-ring",
                      17
                    )}
                  </span>

                  <div>

                    <strong>
                      Notifikasi
                    </strong>

                    <small>
                      Update terbaru akunmu
                    </small>

                  </div>

                  ${icon(
                    "arrow-up-right",
                    15
                  )}

                </a>


                <a
                  href="#/chat"
                  class="profile-link-item"
                >

                  <span class="profile-link-icon chat">
                    ${icon(
                      "messages-square",
                      17
                    )}
                  </span>

                  <div>

                    <strong>
                      Live Chat
                    </strong>

                    <small>
                      Bergabung dengan komunitas Velora
                    </small>

                  </div>

                  ${icon(
                    "arrow-up-right",
                    15
                  )}

                </a>


                <a
                  href="#/shop"
                  class="profile-link-item"
                >

                  <span class="profile-link-icon shop">
                    ${icon(
                      "store",
                      17
                    )}
                  </span>

                  <div>

                    <strong>
                      Belanja
                    </strong>

                    <small>
                      Temukan cookies favoritmu
                    </small>

                  </div>

                  ${icon(
                    "arrow-up-right",
                    15
                  )}

                </a>

              </div>

            </section>

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function notes() {

  if (!S.user) {
    return wrap(
      "Notifikasi",
      loginBox("Login untuk melihat notifikasi.")
    );
  }

  const items =
    Array.isArray(S.notes)
      ? S.notes
      : (
          Array.isArray(S.notifications)
            ? S.notifications
            : []
        );

  const unread =
    items.filter(
      item =>
        !item.read &&
        !item.is_read
    ).length;

  const formatTime = value => {

    if (!value) {
      return "Baru saja";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Baru saja";
    }

    return new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  };

  const getType = item => {

    const raw =
      String(
        item.type ||
        item.kind ||
        item.category ||
        ""
      )
        .toLowerCase()
        .trim();

    if (
      raw.includes("order") ||
      raw.includes("pesanan")
    ) {
      return "order";
    }

    if (
      raw.includes("voucher") ||
      raw.includes("promo") ||
      raw.includes("discount")
    ) {
      return "promo";
    }

    if (
      raw.includes("success") ||
      raw.includes("berhasil") ||
      raw.includes("completed")
    ) {
      return "success";
    }

    if (
      raw.includes("chat") ||
      raw.includes("message")
    ) {
      return "chat";
    }

    return "system";
  };

  const typeConfig = {
    order: {
      icon: "package-check",
      label: "PESANAN"
    },

    promo: {
      icon: "tag",
      label: "PROMO"
    },

    success: {
      icon: "circle-check",
      label: "UPDATE"
    },

    chat: {
      icon: "message-circle",
      label: "CHAT"
    },

    system: {
      icon: "bell",
      label: "VELORA"
    }
  };

  const renderItem = item => {

    const type =
      getType(item);

    const config =
      typeConfig[type];

    const isUnread =
      !item.read &&
      !item.is_read;

    const title =
      item.title ||
      item.name ||
      item.subject ||
      "Notifikasi Velora";

    const message =
      item.message ||
      item.body ||
      item.content ||
      item.description ||
      "";

    const time =
      item.created_at ||
      item.createdAt ||
      item.time ||
      item.date;

    const href =
      item.link ||
      item.href ||
      "";

    const content = `
      <div class="notification-icon ${type}">
        ${icon(config.icon, 18)}
      </div>

      <div class="notification-content">

        <div class="notification-top">

          <div class="notification-heading">

            <span class="notification-type">
              ${esc(config.label)}
            </span>

            <h3>
              ${esc(title)}
            </h3>

          </div>

          ${
            isUnread
              ? `
                <span
                  class="notification-unread-dot"
                  aria-label="Belum dibaca"
                ></span>
              `
              : ""
          }

        </div>

        ${
          message
            ? `
              <p>
                ${esc(message)}
              </p>
            `
            : ""
        }

        <div class="notification-meta">

          <span>
            ${icon("clock-3", 12)}
            ${esc(formatTime(time))}
          </span>

          ${
            isUnread
              ? `
                <span class="notification-status">
                  Baru
                </span>
              `
              : `
                <span class="notification-read">
                  Dibaca
                </span>
              `
          }

        </div>

      </div>

      <div class="notification-arrow">
        ${icon("chevron-right", 16)}
      </div>
    `;

    if (href) {

      return `
        <a
          class="
            notification-card
            ${isUnread ? "unread" : ""}
          "
          href="${esc(href)}"
        >
          ${content}
        </a>
      `;

    }

    return `
      <article
        class="
          notification-card
          ${isUnread ? "unread" : ""}
        "
      >
        ${content}
      </article>
    `;
  };

  if (!items.length) {

    return `
      <div class="notification-page">

        ${top()}

        <main class="container page">

          <section class="notification-empty">

            <div class="notification-empty-glow"></div>

            <div class="notification-empty-icon">
              ${icon("bell-off", 30)}
            </div>

            <span class="eyebrow">
              NOTIFICATION CENTER
            </span>

            <h1>
              Semua tenang di sini.
            </h1>

            <p>
              Belum ada notifikasi baru.
              Update pesanan, promo, dan aktivitas akunmu
              akan muncul di halaman ini.
            </p>

            <a
              href="#/shop"
              class="btn primary"
            >
              ${icon("shopping-bag", 16)}
              Jelajahi Cookies
            </a>

          </section>

        </main>

        ${foot()}

      </div>
    `;
  }

  return `
    <div class="notification-page">

      ${top()}

      <main class="container page">

        <!-- =========================================
             HEADER
        ========================================== -->

        <section class="notification-hero">

          <div class="notification-hero-copy">

            <span class="eyebrow">
              NOTIFICATION CENTER
            </span>

            <h1>
              Notifikasi
            </h1>

            <p>
              Semua update penting dari aktivitas
              akun dan pesananmu ada di sini.
            </p>

          </div>


          <div class="notification-counter">

            <div class="notification-counter-icon">
              ${icon("bell", 18)}
            </div>

            <div>

              <small>
                Belum dibaca
              </small>

              <strong>
                ${unread}
              </strong>

            </div>

          </div>

        </section>


        <!-- =========================================
             SUMMARY STRIP
        ========================================== -->

        <section class="notification-summary">

          <div class="notification-summary-item">

            <span>
              ${icon("bell-ring", 15)}
            </span>

            <div>

              <small>
                Total
              </small>

              <strong>
                ${items.length}
              </strong>

            </div>

          </div>


          <div class="notification-summary-item">

            <span>
              ${icon("circle-dot", 15)}
            </span>

            <div>

              <small>
                Belum dibaca
              </small>

              <strong>
                ${unread}
              </strong>

            </div>

          </div>


          <div class="notification-summary-item">

            <span>
              ${icon("shield-check", 15)}
            </span>

            <div>

              <small>
                Status
              </small>

              <strong>
                ${
                  unread
                    ? "Ada update"
                    : "Semua dibaca"
                }
              </strong>

            </div>

          </div>

        </section>


        <!-- =========================================
             LIST
        ========================================== -->

        <section class="notification-section">

          <div class="notification-section-head">

            <div>

              <h2>
                Aktivitas terbaru
              </h2>

              <span>
                Update terbaru dari Velora Cookies
              </span>

            </div>

          </div>


          <div class="notification-list">

            ${items
              .map(renderItem)
              .join("")}

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}
/* =========================================================
   CHAT
========================================================= */

function chat() {

  if (!S.user) {
    return wrap(
      "Live Chat",
      loginBox("Login untuk masuk ke Live Chat.")
    );
  }

  return `
    <div class="live-chat-page">

      ${top()}

      <main class="container page">

        <!-- =========================================
             HERO
        ========================================== -->

        <section class="live-chat-hero">

          <div class="live-chat-hero-copy">

            <span class="eyebrow">
              VELORA COMMUNITY
            </span>

            <div class="live-chat-title-row">

              <h1>
                Live Chat
              </h1>

              <span class="live-chat-live-pill">
                <i></i>
                LIVE
              </span>

            </div>

            <p>
              Ngobrol langsung bersama pelanggan Velora,
              berbagi rekomendasi cookies, promo, dan pengalaman.
            </p>

          </div>


          <div class="live-chat-online-card">

            <div class="live-chat-online-icon">
              ${icon("radio", 17)}
            </div>

            <div>

              <small>
                Community sekarang
              </small>

              <strong
                id="chatOnlineCount"
              >
                Online
              </strong>

            </div>

          </div>

        </section>


        <!-- =========================================
             CHAT APP
        ========================================== -->

        <section class="live-chat-shell">

          <!-- CHAT HEADER -->

          <header class="live-chat-header">

            <div class="live-chat-room">

              <div class="live-chat-room-avatar">
                ${icon("users", 18)}
              </div>

              <div>

                <strong>
                  Global Chat
                </strong>

                <span>
                  Semua pelanggan Velora
                </span>

              </div>

            </div>


            <div class="live-chat-header-status">

              <span class="live-chat-status-dot"></span>

              <span>
                Realtime
              </span>

            </div>

          </header>


          <!-- MESSAGE AREA -->

          <div
            id="chatList"
            class="live-chat-messages"
          >

            <div class="live-chat-loading">

              <div class="live-chat-loading-icon">
                ${icon("loader-circle", 18)}
              </div>

              <span>
                Memuat percakapan...
              </span>

            </div>

          </div>


          <!-- COMPOSER -->

          <form
            id="chatForm"
            class="live-chat-composer"
          >

            <div class="live-chat-input-wrap">

              <div class="live-chat-input-icon">
                ${icon("message-circle", 16)}
              </div>

              <input
                id="chatInput"
                class="input live-chat-input"
                name="message"
                type="text"
                autocomplete="off"
                maxlength="500"
                placeholder="Tulis pesan ke Global Chat..."
              >

              <span
                id="chatCounter"
                class="live-chat-counter"
              >
                0/500
              </span>

            </div>


            <button
              id="chatSend"
              type="submit"
              class="btn primary live-chat-send"
            >
              ${icon("send", 16)}
              <span>
                Kirim
              </span>
            </button>

          </form>


          <!-- FOOTER INFO -->

          <div class="live-chat-footer">

            <span>
              ${icon("shield-check", 13)}
              Community chat
            </span>

            <span>
              ${icon("zap", 13)}
              Pesan diperbarui otomatis
            </span>

          </div>

        </section>


        <!-- =========================================
             COMMUNITY INFO
        ========================================== -->

        <section class="live-chat-community-grid">

          <div class="live-chat-info-card">

            <div class="live-chat-info-icon">
              ${icon("sparkles", 18)}
            </div>

            <div>

              <span class="eyebrow">
                COMMUNITY
              </span>

              <h3>
                Bagikan rekomendasi favoritmu.
              </h3>

              <p>
                Ceritakan cookies favorit, promo yang kamu temukan,
                atau sekadar ngobrol dengan komunitas Velora.
              </p>

            </div>

          </div>


          <div class="live-chat-info-card accent">

            <div class="live-chat-info-icon">
              ${icon("store", 18)}
            </div>

            <div>

              <span class="eyebrow">
                SHOPPING
              </span>

              <h3>
                Temukan lebih banyak cookies.
              </h3>

              <p>
                Temukan produk baru setelah berbincang
                dengan komunitas Velora.
              </p>

              <a
                href="#/shop"
                class="btn soft sm"
              >
                ${icon("shopping-bag", 14)}
                Jelajahi Shop
              </a>

            </div>

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}

function chatPaint(messages) {

  const box =
    $("#chatList");

  if (!box) {
    console.warn(
      "CHAT PAINT: #chatList tidak ditemukan."
    );
    return;
  }


  if (
    !Array.isArray(messages) ||
    messages.length === 0
  ) {

    box.innerHTML = `

      <div class="live-chat-empty">

        <div class="live-chat-empty-icon">

          ${icon(
            "messages-square",
            24
          )}

        </div>

        <strong>
          Belum ada percakapan
        </strong>

        <p>
          Jadilah orang pertama yang menyapa
          komunitas Velora.
        </p>

      </div>

    `;

    refreshIcons();

    return;
  }


  box.innerHTML =
    messages
      .map(
        message => {

          const mine =
            String(
              message.user_id || ""
            ) ===
            String(
              S.user?.id || ""
            );


          const name =
            message.profiles?.name ||
            message.profile?.name ||
            message.user_name ||
            message.username ||
            "User";


          let time = "";

          if (
            message.created_at
          ) {

            const date =
              new Date(
                message.created_at
              );

            if (
              !Number.isNaN(
                date.getTime()
              )
            ) {

              time =
                date.toLocaleTimeString(
                  "id-ID",
                  {
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                );

            }

          }


          return `

            <div
              class="
                msg
                ${mine ? "mine" : ""}
              "
            >

              <b>
                ${esc(name)}
              </b>

              <div>
                ${esc(
                  message.message || ""
                )}
              </div>

              ${
                time
                  ? `
                    <small>
                      ${esc(time)}
                    </small>
                  `
                  : ""
              }

            </div>

          `;

        }
      )
      .join("");


  refreshIcons();


  requestAnimationFrame(
    () => {

      box.scrollTop =
        box.scrollHeight;

    }
  );

}

/* =====================================================
   REALTIME CHAT
===================================================== */

async function initChat() {

  if (!S.user) {
    return;
  }

  try {

    /* ===================================================
       1. LOAD CHAT DULU DARI BACKEND
       Ini TIDAK bergantung pada S.sb
    =================================================== */

    const result =
      await api(
        "/api/chat"
      );

    if (
      !result ||
      result.ok === false
    ) {

      throw new Error(
        result?.message ||
        "Gagal memuat chat."
      );

    }

    chatPaint(
      result.messages || []
    );


    /* ===================================================
       2. HAPUS CHANNEL LAMA
    =================================================== */

    if (
      S.channel &&
      S.sb
    ) {

      try {

        await S.sb.removeChannel(
          S.channel
        );

      } catch (channelError) {

        console.warn(
          "Gagal membersihkan channel lama:",
          channelError
        );

      }

      S.channel = null;

    }


    /* ===================================================
       3. REALTIME SUPABASE
       Dipakai hanya kalau S.sb memang tersedia
    =================================================== */

    if (S.sb) {

      S.channel =
        S.sb
          .channel(
            "velora-global-chat"
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chat_messages",
              filter: "room=eq.global"
            },
            async () => {

              try {

                const fresh =
                  await api(
                    "/api/chat"
                  );

                if (
                  fresh &&
                  fresh.ok !== false
                ) {

                  chatPaint(
                    fresh.messages || []
                  );

                }

              } catch (error) {

                console.error(
                  "CHAT REALTIME REFRESH:",
                  error
                );

              }

            }
          )
          .subscribe(
            status => {

              console.log(
                "CHAT CHANNEL:",
                status
              );

            }
          );

    }


    /* ===================================================
       4. FALLBACK POLLING
       Jalan kalau S.sb belum tersedia
    =================================================== */

    if (
      window.veloraChatPoll
    ) {

      clearInterval(
        window.veloraChatPoll
      );

    }

    window.veloraChatPoll =
      setInterval(
        async () => {

          /*
            Jangan request lagi kalau
            user sudah meninggalkan halaman chat.
          */

          if (
            route() !== "/chat"
          ) {

            clearInterval(
              window.veloraChatPoll
            );

            window.veloraChatPoll =
              null;

            return;

          }


          /*
            Kalau realtime Supabase aktif,
            polling tidak perlu terlalu agresif.
          */

          if (S.sb) {
            return;
          }


          try {

            const fresh =
              await api(
                "/api/chat"
              );

            if (
              fresh &&
              fresh.ok !== false
            ) {

              chatPaint(
                fresh.messages || []
              );

            }

          } catch (error) {

            console.error(
              "CHAT POLLING:",
              error
            );

          }

        },
        3000
      );


    /* ===================================================
       5. FORM CHAT
    =================================================== */

    const form =
      $("#chatForm");

    if (
      form &&
      !form.dataset.bound
    ) {

      form.dataset.bound =
        "1";


      form.addEventListener(
        "submit",
        async event => {

          event.preventDefault();


          const input =
            $("#chatInput");

          if (!input) {
            return;
          }


          const message =
            String(
              input.value || ""
            ).trim();


          if (!message) {
            return;
          }


          if (
            message.length > 500
          ) {

            toast(
              "Pesan maksimal 500 karakter.",
              "bad"
            );

            return;

          }


          const submit =
            form.querySelector(
              'button[type="submit"]'
            );


          try {

            if (submit) {

              submit.disabled =
                true;

              submit.dataset.oldText =
                submit.innerHTML;

              submit.innerHTML = `
                ${icon(
                  "loader-circle",
                  15
                )}
                Mengirim...
              `;

              refreshIcons();

            }


            await api(
              "/api/chat",
              {
                method: "POST",
                body: {
                  message
                }
              }
            );


            input.value = "";


            /*
              Langsung refresh agar pesan
              milik sendiri langsung terlihat.
            */

            const fresh =
              await api(
                "/api/chat"
              );

            chatPaint(
              fresh?.messages || []
            );


          } catch (error) {

            console.error(
              "CHAT SEND ERROR:",
              error
            );

            toast(
              error.message ||
              "Pesan gagal dikirim.",
              "bad"
            );


          } finally {

            if (submit) {

              submit.disabled =
                false;

              submit.innerHTML =
                submit.dataset.oldText ||
                `
                  ${icon(
                    "send",
                    16
                  )}
                  <span>
                    Kirim
                  </span>
                `;

              refreshIcons();

            }

          }

        }
      );

    }


    /* ===================================================
       6. ENTER = SEND
    =================================================== */

    const input =
      $("#chatInput");

    if (
      input &&
      !input.dataset.keybound
    ) {

      input.dataset.keybound =
        "1";


      input.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {

            event.preventDefault();

            form?.requestSubmit();

          }

        }
      );

    }


    /* ===================================================
       7. CHARACTER COUNTER
    =================================================== */

    const counter =
      $("#chatCounter");

    if (
      input &&
      counter &&
      !input.dataset.counterBound
    ) {

      input.dataset.counterBound =
        "1";


      const updateCounter =
        () => {

          counter.textContent =
            `${input.value.length}/500`;

        };


      input.addEventListener(
        "input",
        updateCounter
      );


      updateCounter();

    }


  } catch (error) {

    console.error(
      "INIT CHAT ERROR:",
      error
    );


    const list =
      $("#chatList");


    if (list) {

      list.innerHTML = `

        <div class="live-chat-empty">

          <div class="live-chat-empty-icon">

            ${icon(
              "wifi-off",
              24
            )}

          </div>

          <strong>
            Chat gagal dimuat
          </strong>

          <p>
            ${esc(
              error.message ||
              "Terjadi kesalahan saat mengambil chat."
            )}
          </p>

          <button
            type="button"
            class="btn soft sm"
            id="chatRetry"
          >
            ${icon(
              "refresh-cw",
              14
            )}
            Coba lagi
          </button>

        </div>

      `;


      refreshIcons();


      $("#chatRetry")
        ?.addEventListener(
          "click",
          () => initChat()
        );

    }


    toast(
      error.message ||
      "Gagal memuat chat.",
      "bad"
    );

  }

}

function initNotificationRealtime() {
  if (!S.user || !S.sb) return;

  if (S.notificationChannel) {
    S.sb.removeChannel(
      S.notificationChannel
    );
  }

  S.notificationChannel = S.sb
    .channel(
      `notifications-${S.user.id}`
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${S.user.id}`
      },
      async () => {
        await data();

        if (route() === "/notifications") {
          await render();
        }
      }
    )
    .subscribe();
}

/* =========================================================
   ABOUT / FAQ
========================================================= */

function wrap(title, body) {
  return `
    <div>

      ${top()}

      <main class="container page">

        <div class="page-title">

          <div>
            <span class="eyebrow">
              VELORA
            </span>

            <h1>
              ${esc(title)}
            </h1>
          </div>

        </div>

        ${body}

      </main>

      ${foot()}

    </div>
  `;
}
function about() {
  return `
    <div class="velora-about">

      ${top()}

      <main>

        <!-- =====================================================
             INTRO
             ===================================================== -->

        <section class="about-hero">

          <div class="container about-hero-grid">

            <div class="about-hero-copy reveal-up">

              <span class="eyebrow">
                OUR STORY
              </span>

              <h1>
                A little story
                <span>behind every bite.</span>
              </h1>

              <p>
                VELORA lahir dari satu hal sederhana:
                keinginan untuk membuat cookies yang terasa
                personal, hangat, dan dibuat dengan perhatian.
              </p>

              <div class="about-scroll-note">
                <span></span>
                Scroll to discover
              </div>

            </div>


            <div class="about-hero-visual reveal-up">

              <div class="about-image-glow"></div>

              <div class="about-main-image">

                <img
                  src="/assets/hero-cookies.png"
                  alt="VELORA Cookies"
                >

              </div>

              <div class="about-floating-note">
                <strong>VELORA</strong>
                <span>Made with intention</span>
              </div>

            </div>

          </div>

        </section>


        <!-- =====================================================
             STORY
             ===================================================== -->

        <section class="about-story">

          <div class="container">

            <div class="about-story-grid">

              <div class="about-story-label">
                <span>01</span>
                <p>
                  HOW IT STARTED
                </p>
              </div>

              <div class="about-story-content">

                <h2>
                  Dari sesuatu yang kecil,
                  menjadi sesuatu yang ingin
                  <span>dibagikan.</span>
                </h2>

                <p>
                  VELORA dibangun dari kecintaan pada cookies
                  yang sederhana, tetapi punya karakter.
                  Kami ingin setiap produk terasa seperti
                  sesuatu yang dibuat untuk dinikmati perlahan,
                  bukan sekadar sesuatu yang dibeli lalu dilupakan.
                </p>

                <p>
                  Karena itu, kami memperhatikan hal-hal kecil:
                  tekstur yang tepat, aroma yang hangat,
                  rasa yang seimbang, dan pengalaman ketika
                  membuka pesanan sampai gigitan terakhir.
                </p>

              </div>

            </div>

          </div>

        </section>


        <!-- =====================================================
             STANDARD
             ===================================================== -->

        <section class="about-standard">

          <div class="container">

            <div class="about-standard-head">

              <div>
                <span class="eyebrow">
                  THE VELORA STANDARD
                </span>

                <h2>
                  Simple ingredients.
                  <span>Careful details.</span>
                </h2>
              </div>

              <p>
                Kami percaya kualitas terasa dari
                detail-detail yang sering tidak terlihat.
              </p>

            </div>


            <div class="about-standard-grid">

              <article class="about-standard-card">

                <span class="about-card-number">
                  01
                </span>

                <div class="about-card-icon">
                  ${icon("sparkles")}
                </div>

                <h3>
                  Ingredients
                </h3>

                <p>
                  Memilih bahan dengan perhatian agar
                  rasa dan tekstur tetap seimbang.
                </p>

              </article>


              <article class="about-standard-card featured">

                <span class="about-card-number">
                  02
                </span>

                <div class="about-card-icon">
                  ${icon("layers")}
                </div>

                <h3>
                  Small Batch
                </h3>

                <p>
                  Setiap batch dibuat dalam jumlah terkontrol
                  agar setiap cookies mendapat perhatian.
                </p>

              </article>


              <article class="about-standard-card">

                <span class="about-card-number">
                  03
                </span>

                <div class="about-card-icon">
                  ${icon("flame")}
                </div>

                <h3>
                  Freshly Baked
                </h3>

                <p>
                  Kami menjaga proses agar cookies tetap
                  terasa fresh dan nyaman dinikmati.
                </p>

              </article>

            </div>

          </div>

        </section>


        <!-- =====================================================
             MANIFESTO
             ===================================================== -->

        <section class="about-manifesto">

          <div class="container">

            <span class="eyebrow">
              THE VELORA WAY
            </span>

            <blockquote>
              “Good cookies don't need
              <span>to be complicated.</span>”
            </blockquote>

            <p>
              Mereka hanya perlu dibuat dengan niat yang benar.
            </p>

          </div>

        </section>


        <!-- =====================================================
             CTA
             ===================================================== -->

        <section class="about-cta">

          <div class="container about-cta-inner">

            <div>

              <span class="eyebrow">
                READY FOR A LITTLE SWEETNESS?
              </span>

              <h2>
                Temukan cookies
                <span>favoritmu.</span>
              </h2>

            </div>

            <a
              href="#/shop"
              class="btn primary"
            >
              Jelajahi koleksi ${icon("arrow-right")}
            </a>

          </div>

        </section>

      </main>

      ${foot()}

    </div>
  `;
}

function faqpage() {
  const items = [
    {
      q: "Berapa lama pengiriman?",
      a: "Estimasi pengiriman dapat dilihat pada halaman checkout dan dapat berbeda sesuai lokasi."
    },
    {
      q: "Apakah cookies dibuat fresh?",
      a: "Setiap batch dibuat dengan perhatian pada rasa, aroma, dan tekstur agar tetap nyaman dinikmati."
    },
    {
      q: "Bagaimana cara melakukan pemesanan?",
      a: "Pilih produk yang kamu inginkan, tambahkan ke keranjang, lalu lanjutkan ke halaman checkout."
    },
    {
      q: "Apakah saya bisa melihat status pesanan?",
      a: "Bisa. Setelah login, kamu dapat melihat pesanan dan perkembangan statusnya melalui menu Pesanan Saya."
    },
    {
      q: "Apakah saya bisa menggunakan wishlist?",
      a: "Bisa. Tekan ikon hati pada produk untuk menyimpan produk favoritmu."
    },
    {
      q: "Bagaimana cara menghubungi VELORA?",
      a: "Kamu dapat menghubungi VELORA melalui Live Chat atau informasi kontak yang tersedia di footer."
    }
  ];

  return wrap(
    "FAQ",
    `
      <div class="faq">

        ${items
          .map(
            item => `
              <details>

                <summary>
                  ${esc(item.q)}
                </summary>

                <p class="muted">
                  ${esc(item.a)}
                </p>

              </details>
            `
          )
          .join("")}

      </div>
    `
  );
}

/* =========================================================
   RENDER
========================================================= */

async function render() {

  const r = route();
  const app = $("#app");

  if (!app) return;

  try {
async function render() {
  const r = route();
  const app = $("#app");

  if (!app) return;

  try {
    await data();

    let html = "";

    switch (r) {
      case "/":
      case "":
        html = home();
        break;

      case "/shop":
        html = shop();
        break;

      case "/cart":
        html = cart();
        break;

      case "/checkout":
        html = checkout();
        break;

      case "/wishlist":
        html = wish();
        break;

      case "/orders":
        html = orders();
        break;

      case "/profile":
        html = profile();
        break;

      case "/about":
        html = about();
        break;

      case "/faq":
        html = faq();
        break;

      default:
        html = home();
        break;
    }

    app.innerHTML = html;
    bind();

    if (typeof initOrdersPage === "function") {
      initOrdersPage();
    }

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

  } catch (error) {
    console.error("RENDER ERROR:", error);

    app.innerHTML = `
      <div class="container page">
        <div class="panel empty">
          <h3>Terjadi kesalahan</h3>
          <p class="muted">
            Halaman gagal dimuat. Cek Console untuk detail error.
          </p>
        </div>
      </div>
    `;
  }
}
    /* =====================================================
       HOME
    ===================================================== */

    if (r === "/") {

      await catalog();
      await data();

      app.innerHTML =
        home();


    /* =====================================================
       CUSTOMER DASHBOARD
    ===================================================== */

    } else if (r === "/customer") {

      await catalog();
      await data();

      app.innerHTML =
        customerDashboard();


    /* =====================================================
       SHOP
    ===================================================== */

    } else if (r.startsWith("/shop")) {

      await catalog();
      await data();

      app.innerHTML =
        shop();


    /* =====================================================
       PRODUCT DETAIL
    ===================================================== */

    } else if (r.startsWith("/product/")) {

      await data();

      app.innerHTML =
        await detail(
          r.split("/")[2]
        );


    /* =====================================================
       CART
    ===================================================== */

    } else if (r === "/cart") {

      await data();

      app.innerHTML =
        cart();


    /* =====================================================
       WISHLIST
    ===================================================== */

    } else if (r === "/wishlist") {

      await data();

      app.innerHTML =
        wish();


    /* =====================================================
       CHECKOUT
    ===================================================== */

    } else if (r === "/checkout") {

      await data();

      app.innerHTML =
        checkout();


    /* =====================================================
       ORDERS
    ===================================================== */

    } else if (r === "/orders") {

      await data();

      app.innerHTML =
        orders();


    /* =====================================================
       PROFILE
    ===================================================== */

    } else if (r === "/profile") {

      await data();

      app.innerHTML =
        profile();


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    } else if (r === "/notifications") {

      await data();

      app.innerHTML =
        notes();


    /* =====================================================
       CHAT
    ===================================================== */

    } else if (r === "/chat") {

      app.innerHTML =
        chat();


    /* =====================================================
       ABOUT
    ===================================================== */

    } else if (r === "/about") {

      app.innerHTML =
        about();


    /* =====================================================
       FAQ
    ===================================================== */

    } else if (r === "/faq") {

      app.innerHTML =
        faqpage();


    /* =====================================================
       ADMIN
    ===================================================== */

    } else if (
      r === "/admin" ||
      r.startsWith("/admin/")
    ) {

      if (!S.admin) {

        app.innerHTML =
          wrap(
            "Admin",
            loginBox(
              "Akses admin diperlukan."
            )
          );

      } else {

        await adminRender(
          r.split("/")[2] ||
          "dashboard"
        );

        return;
      }


    /* =====================================================
       FALLBACK
    ===================================================== */

    } else {

      await catalog();
      await data();

      app.innerHTML =
        home();

    }


    /* =====================================================
       BIND UI
    ===================================================== */

    bind();
refreshIcons();

if(r === "/orders"){
  initOrdersPage();
}




    /* =====================================================
       REALTIME CHAT
    ===================================================== */

    if (
      r === "/chat" &&
      S.user
    ) {

      await initChat();

    }


  } catch (error) {

    console.error(
      "RENDER ERROR:",
      error
    );


    app.innerHTML = `

      <main class="container page">

        <div class="panel empty">

          ${icon(
            "triangle-alert",
            42
          )}

          <h2>
            Terjadi kesalahan
          </h2>

          <p class="muted">
            ${esc(
              error.message
            )}
          </p>

          <button
            class="btn primary"
            onclick="location.reload()"
          >
            Muat ulang
          </button>

        </div>

      </main>

    `;

    refreshIcons();

  }

}

function orders() {
  const orders = Array.isArray(S.orders) ? S.orders : [];

  const statusLabel = {
    pending: "Menunggu",
    processing: "Diproses",
    shipped: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan"
  };

  const statusClass = {
    pending: "pending",
    processing: "processing",
    shipped: "shipped",
    completed: "completed",
    cancelled: "cancelled"
  };

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const getItems = (order) => {
    if (Array.isArray(order.items)) return order.items;
    if (Array.isArray(order.order_items)) return order.order_items;
    return [];
  };

  const itemCount = (order) => {
    const items = getItems(order);

    return items.reduce((total, item) => {
      return total + Number(
        item.quantity ??
        item.qty ??
        1
      );
    }, 0);
  };

  const itemPreview = (order) => {
    const items = getItems(order);

    if (!items.length) {
      return `
        <div class="orders-empty-items">
          <div class="orders-empty-icon">
            ${icon("package")}
          </div>
          <span>Detail item belum tersedia.</span>
        </div>
      `;
    }

    return `
      <div class="orders-items">

        ${items.slice(0, 3).map((item) => {

          const name = esc(
            item.product_name ||
            item.name ||
            item.product?.name ||
            "Produk VELORA"
          );

          const qty = Number(
            item.quantity ??
            item.qty ??
            1
          );

          const image =
            item.image_url ||
            item.image ||
            item.product_image ||
            item.product?.image_url ||
            "/assets/hero-cookies.png";

          return `
            <div class="order-item">

              <div class="order-item-image">
                <img
                  src="${esc(image)}"
                  alt="${name}"
                  loading="lazy"
                >
              </div>

              <div class="order-item-info">
                <strong>${name}</strong>
                <span>Qty ${qty}</span>
              </div>

            </div>
          `;
        }).join("")}

        ${
          items.length > 3
            ? `
              <div class="order-more-items">
                +${items.length - 3} produk lainnya
              </div>
            `
            : ""
        }

      </div>
    `;
  };

  const renderTimeline = (status) => {

    if (status === "cancelled") {
      return `
        <div class="order-timeline cancelled-timeline">
          <div class="timeline-step is-done">
            <span></span>
            <strong>Pesanan dibatalkan</strong>
          </div>
        </div>
      `;
    }

    const steps = [
      ["pending", "Pesanan"],
      ["processing", "Diproses"],
      ["shipped", "Dikirim"],
      ["completed", "Selesai"]
    ];

    const currentIndex = Math.max(
      0,
      steps.findIndex(step => step[0] === status)
    );

    return `
      <div class="order-timeline">

        ${steps.map((step, index) => {

          const isDone = index <= currentIndex;

          return `
            <div class="timeline-step ${isDone ? "is-done" : ""}">
              <span></span>
              <strong>${step[1]}</strong>
            </div>

            ${
              index < steps.length - 1
                ? `<i class="${index < currentIndex ? "is-done" : ""}"></i>`
                : ""
            }
          `;

        }).join("")}

      </div>
    `;
  };

  if (!orders.length) {
    return `
      <div class="page orders-page">

        ${top()}

        <main class="container orders-shell">

          <div class="orders-header">
            <div>
              <span class="eyebrow">
                YOUR VELORA
              </span>

              <h1>Pesanan Saya</h1>

              <p>
                Pantau perjalanan pesananmu dari awal
                sampai tiba di tanganmu.
              </p>
            </div>
          </div>

          <div class="orders-empty-state">

            <div class="orders-empty-art">
              ${icon("package")}
            </div>

            <span class="eyebrow">
              BELUM ADA PESANAN
            </span>

            <h2>
              Saatnya menemukan favoritmu.
            </h2>

            <p>
              Pesanan yang kamu buat akan muncul
              di halaman ini.
            </p>

            <a href="#/shop" class="btn primary">
              Mulai belanja
            </a>

          </div>

        </main>

        ${foot()}

      </div>
    `;
  }

  const summary = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => o.status === "processing").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    completed: orders.filter(o => o.status === "completed").length
  };

  return `
    <div class="page orders-page">

      ${top()}

      <main class="container orders-shell">

        <!-- HEADER -->

        <div class="orders-header">

          <div>

            <span class="eyebrow">
              YOUR VELORA
            </span>

            <h1>Pesanan Saya</h1>

            <p>
              Pantau setiap pesanan dan lihat progresnya
              dalam satu tempat.
            </p>

          </div>

          <a
            href="#/shop"
            class="btn ghost orders-shop-btn"
          >
            Lanjut belanja ${icon("arrow-right")}
          </a>

        </div>


        <!-- SUMMARY -->

        <div class="orders-summary">

          <div class="orders-stat featured">
            <span>Total pesanan</span>
            <strong>${summary.all}</strong>
            <small>semua transaksi</small>
          </div>

          <div class="orders-stat">
            <span>Menunggu</span>
            <strong>${summary.pending}</strong>
          </div>

          <div class="orders-stat">
            <span>Diproses</span>
            <strong>${summary.processing}</strong>
          </div>

          <div class="orders-stat">
            <span>Dikirim</span>
            <strong>${summary.shipped}</strong>
          </div>

          <div class="orders-stat">
            <span>Selesai</span>
            <strong>${summary.completed}</strong>
          </div>

        </div>


        <!-- FILTER -->

        <div class="orders-toolbar">

          <div class="orders-filter-label">
            Pesanan
          </div>

          <div class="orders-filters">

            <button
              type="button"
              class="orders-filter active"
              data-order-filter="all"
            >
              Semua
            </button>

            <button
              type="button"
              class="orders-filter"
              data-order-filter="pending"
            >
              Menunggu
            </button>

            <button
              type="button"
              class="orders-filter"
              data-order-filter="processing"
            >
              Diproses
            </button>

            <button
              type="button"
              class="orders-filter"
              data-order-filter="shipped"
            >
              Dikirim
            </button>

            <button
              type="button"
              class="orders-filter"
              data-order-filter="completed"
            >
              Selesai
            </button>

          </div>

        </div>


        <!-- ORDER LIST -->

        <div class="orders-list">

          ${orders.map((o) => {

            const status = o.status || "pending";

            const label =
              statusLabel[status] ||
              status;

            const cls =
              statusClass[status] ||
              "pending";

            const items = getItems(o);

            return `
              <article
                class="order-card"
                data-order-card
                data-status="${esc(status)}"
              >

                <!-- TOP -->

                <div class="order-card-top">

                  <div>

                    <div class="order-number">
                      ORDER #${esc(String(o.id).slice(0, 8).toUpperCase())}
                    </div>

                    <div class="order-date">
                      ${formatDate(o.created_at)}
                    </div>

                  </div>

                  <span class="order-status ${cls}">
                    <i></i>
                    ${esc(label)}
                  </span>

                </div>


                <!-- TIMELINE -->

                ${renderTimeline(status)}


                <!-- CONTENT -->

                <div class="order-card-content">

                  <div class="order-products">

                    ${itemPreview(o)}

                  </div>


                  <div class="order-total">

                    <span>
                      ${itemCount(o)}
                      ${itemCount(o) === 1 ? "item" : "items"}
                    </span>

                    <strong>
                      ${money(Number(o.total || 0))}
                    </strong>

                  </div>

                </div>


                <!-- FOOTER -->

                <div class="order-card-footer">

                  <div class="order-payment">

                    <span class="order-footer-label">
                      Total pembayaran
                    </span>

                    <strong>
                      ${money(Number(o.total || 0))}
                    </strong>

                  </div>


                  <div class="order-actions">

                    ${
                      status === "completed" && items.length
                        ? `
                          <button
                            type="button"
                            class="btn soft sm"
                            data-review
                            data-order="${esc(o.id)}"
                            data-product="${esc(items[0].product_id || items[0].id || "")}"
                            data-name="${esc(
                              items[0].product_name ||
                              items[0].name ||
                              "Produk VELORA"
                            )}"
                          >
                            ${icon("star")}
                            Rating
                          </button>
                        `
                        : ""
                    }

                    <a
                      href="#/orders/${esc(o.id)}"
                      class="btn ghost sm"
                    >
                      Lihat detail
                      ${icon("arrow-right")}
                    </a>

                  </div>

                </div>

              </article>
            `;

          }).join("")}

        </div>

      </main>

      ${foot()}

    </div>
  `;
}

function initOrdersPage(){
  const filters = document.querySelectorAll("[data-order-filter]");
  const cards = document.querySelectorAll("[data-order-card]");

  if(!filters.length || !cards.length) return;

  filters.forEach((filter) => {

    filter.addEventListener("click", () => {

      const target = filter.dataset.orderFilter || "all";

      filters.forEach((item) => {
        item.classList.toggle(
          "active",
          item === filter
        );
      });

      cards.forEach((card) => {

        const status = card.dataset.status || "";

        const visible =
          target === "all" ||
          status === target;

        card.hidden = !visible;

      });

    });

  });
}

function reviewModal(orderId, productId, productName) {

  const modal = document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-card">

      <div class="modal-head">

        <div>
          <span class="eyebrow">
            CUSTOMER REVIEW
          </span>

          <h3>
            Beri Rating
          </h3>
        </div>

        <button
          type="button"
          class="icon-btn"
          id="reviewClose"
        >
          ${icon("x")}
        </button>

      </div>


      <div style="margin-bottom:18px">

        <b>
          ${esc(productName)}
        </b>

        <p
          class="muted"
          style="margin-top:5px"
        >
          Bagaimana pengalamanmu dengan produk ini?
        </p>

      </div>


      <form id="reviewForm">

        <div class="field">

          <label>
            Rating
          </label>

          <select
            class="select"
            name="rating"
            required
          >
            <option value="5">
              5 — Sangat puas
            </option>

            <option value="4">
              4 — Puas
            </option>

            <option value="3">
              3 — Cukup
            </option>

            <option value="2">
              2 — Kurang
            </option>

            <option value="1">
              1 — Tidak puas
            </option>
          </select>

        </div>


        <div
          class="field"
          style="margin-top:12px"
        >

          <label>
            Review
          </label>

          <textarea
            class="textarea"
            name="comment"
            rows="5"
            maxlength="1000"
            placeholder="Ceritakan pengalamanmu..."
          ></textarea>

        </div>


        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:9px;
            margin-top:16px;
          "
        >

          <button
            type="button"
            class="btn soft"
            id="reviewCancel"
          >
            Batal
          </button>

          <button
            type="submit"
            class="btn primary"
            id="reviewSubmit"
          >
            ${icon("send",15)}
            Kirim Review
          </button>

        </div>

      </form>

    </div>
  `;


  document.body.appendChild(modal);

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }


  const closeButton =
    modal.querySelector("#reviewClose");

  const cancelButton =
    modal.querySelector("#reviewCancel");

  const form =
    modal.querySelector("#reviewForm");

  const submitButton =
    modal.querySelector("#reviewSubmit");


  closeButton?.addEventListener(
    "click",
    () => modal.remove()
  );


  cancelButton?.addEventListener(
    "click",
    () => modal.remove()
  );


  form?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const formData =
        new FormData(form);

      const rating =
        Number(formData.get("rating"));

      const comment =
        String(
          formData.get("comment") || ""
        ).trim();


      if (
        !rating ||
        rating < 1 ||
        rating > 5
      ) {
        toast(
          "Rating harus 1 sampai 5.",
          "bad"
        );

        return;
      }


      submitButton.disabled = true;

      submitButton.innerHTML = `
        Mengirim...
      `;


      try {

        await api(
          `/api/orders/${orderId}/review`,
          {
            method: "POST",

            body: {
              productId: productId,
              rating: rating,
              comment: comment
            }
          }
        );


        toast(
          "Review berhasil dikirim."
        );

        modal.remove();


      } catch (error) {

        console.error(
          "Review error:",
          error
        );

        toast(
          error.message ||
          "Gagal mengirim review.",
          "bad"
        );


        submitButton.disabled = false;

        submitButton.innerHTML = `
          ${icon("send",15)}
          Kirim Review
        `;

        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }

      }

    }
  );

}

function initHeroSlider(){
  const slider = document.querySelector("[data-hero-slider]");
  if(!slider) return;

  const track = slider.querySelector("[data-slider-track]");
  const slides = [...slider.querySelectorAll(".hero-slide")];
  const dots = [...slider.querySelectorAll(".hero-dot")];
  const prev = slider.querySelector("[data-slider-prev]");
  const next = slider.querySelector("[data-slider-next]");

  if(!track || slides.length < 2) return;

  let current = 0;
  let timer = null;
  let startX = 0;
  let endX = 0;
  let isPointerDown = false;

  const setSlide = (index, restart = true) => {
    current = (index + slides.length) % slides.length;

    track.style.transform = `translate3d(-${current * 100}%, 0, 0)`;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === current);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
    });

    if(restart) restart();
  };

  const nextSlide = () => setSlide(current + 1);
  const prevSlide = () => setSlide(current - 1);

  const start = () => {
    clearInterval(timer);

    timer = setInterval(() => {
      nextSlide();
    }, 6000);
  };

  const stop = () => {
    clearInterval(timer);
  };

  const restart = () => {
    stop();
    start();
  };

  next?.addEventListener("click", () => {
    nextSlide();
  });

  prev?.addEventListener("click", () => {
    prevSlide();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.slide || 0);
      setSlide(index);
    });
  });

  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", start);

  slider.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
  }, { passive:true });

  slider.addEventListener("touchmove", (event) => {
    endX = event.touches[0].clientX;
  }, { passive:true });

  slider.addEventListener("touchend", () => {
    const distance = endX - startX;

    if(Math.abs(distance) > 50){
      if(distance < 0){
        nextSlide();
      }else{
        prevSlide();
      }
    }

    startX = 0;
    endX = 0;
  });

  slider.addEventListener("pointerdown", (event) => {
    isPointerDown = true;
    startX = event.clientX;
  });

  slider.addEventListener("pointermove", (event) => {
    if(!isPointerDown) return;
    endX = event.clientX;
  });

  slider.addEventListener("pointerup", () => {
    if(!isPointerDown) return;

    const distance = endX - startX;

    if(Math.abs(distance) > 70){
      if(distance < 0){
        nextSlide();
      }else{
        prevSlide();
      }
    }

    isPointerDown = false;
    startX = 0;
    endX = 0;
  });

  slider.addEventListener("pointercancel", () => {
    isPointerDown = false;
    startX = 0;
    endX = 0;
  });

  setSlide(0, false);
  start();
}
/* =========================================================
   GENERAL BINDING
========================================================= */


  function bind() {

  /* =========================================================
     ADMIN HERO
     ========================================================= */

  const heroForm = $("#heroForm");
  const heroFile = $("#heroFile");
  const heroFilePreview = $("#heroFilePreview");
  const saveHero = $("#saveHero");

  heroFile?.addEventListener(
    "change",
    () => {

      const file = heroFile.files?.[0];

      if (!file) {
        if (heroFilePreview) {
          heroFilePreview.innerHTML = "";
        }
        return;
      }

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowed.includes(file.type)) {

        heroFile.value = "";

        toast(
          "Format gambar harus JPG, PNG, atau WEBP."
        );

        return;
      }

      if (file.size > 4 * 1024 * 1024) {

        heroFile.value = "";

        toast(
          "Ukuran gambar maksimal 4 MB."
        );

        return;
      }

      const url = URL.createObjectURL(file);

      if (heroFilePreview) {
        heroFilePreview.innerHTML = `
          <div
            style="
              border:1px solid var(--line);
              border-radius:16px;
              overflow:hidden;
            "
          >
            <img
              src="${url}"
              alt="Preview Hero"
              style="
                width:100%;
                max-height:240px;
                object-fit:cover;
                display:block;
              "
            >
          </div>
        `;
      }
    }
  );


  heroForm?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const file =
        heroFile?.files?.[0];

      if (!file) {

        toast(
          "Pilih foto Hero terlebih dahulu."
        );

        return;
      }

      if (!S.session?.access_token) {

        toast(
          "Session admin tidak ditemukan. Login kembali."
        );

        return;
      }

      try {

        if (saveHero) {
          saveHero.disabled = true;
          saveHero.textContent = "Mengupload...";
        }

        const formData = new FormData();

        formData.append(
          "hero",
          file
        );

        const response =
          await fetch(
            "/api/admin/appearance/hero",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${S.session.access_token}`
              },

              body: formData
            }
          );

        let result = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (
          !response.ok ||
          !result?.ok
        ) {

          throw new Error(
            result?.message ||
            `Upload gagal (${response.status})`
          );
        }

        S.cfg =
          await fetch(
            "/api/config"
          ).then(
            response =>
              response.json()
          );

        toast(
          "Foto Hero berhasil diperbarui."
        );

        await render();

      } catch (error) {

        console.error(
          "HERO UPLOAD ERROR:",
          error
        );

        toast(
          error.message ||
          "Gagal mengupload Hero."
        );

        if (saveHero) {

          saveHero.disabled = false;

          saveHero.innerHTML = `
            ${icon("upload",16)}
            Upload & Aktifkan
          `;

          refreshIcons();
        }
      }
    }
  );


  $("#removeHero")?.addEventListener(
    "click",
    async () => {

      if (
        !confirm(
          "Hapus gambar Hero dari halaman utama?"
        )
      ) {
        return;
      }

      try {

        await api(
          "/api/admin/appearance/hero",
          {
            method: "DELETE"
          }
        );

        S.cfg =
          await fetch(
            "/api/config"
          ).then(
            response =>
              response.json()
          );

        toast(
          "Foto Hero berhasil dihapus."
        );

        await render();

      } catch (error) {

        toast(
          error.message ||
          "Gagal menghapus Hero."
        );
      }
    }
  );


  /* =========================================================
     GLOBAL SEARCH
     ========================================================= */

  const searchForm =
    $("#globalSearch");

  if (searchForm) {

    searchForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const formData =
          new FormData(searchForm);

        const query =
          formData.get("q") || "";

        go(
          `/shop?q=${encodeURIComponent(query)}`
        );
      }
    );

  }


  /* =========================================================
     AUTH
     ========================================================= */

  $("#openAuth")?.addEventListener(
    "click",
    authModal
  );

  $("#openAuth2")?.addEventListener(
    "click",
    authModal
  );


  /* =========================================================
     WISHLIST
     ========================================================= */

  $$("[data-wish]").forEach(
  button => {

    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (!S.user) {
          authModal();
          return;
        }

        const productId =
          String(
            button.dataset.wish || ""
          ).trim();

        if (!productId) {
          toast("Produk tidak ditemukan.");
          return;
        }

        try {

          button.disabled = true;

          const result =
            await api(
              "/api/wishlist",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                // JANGAN JSON.stringify di sini
                body: {
                  productId
                }
              }
            );

          if (!result?.ok) {
            throw new Error(
              result?.message ||
              "Gagal memperbarui wishlist."
            );
          }

          await data();

          toast(
            result.wishlisted
              ? "Ditambahkan ke wishlist."
              : "Dihapus dari wishlist."
          );

          await render();

        } catch (error) {

          console.error(
            "WISHLIST ERROR:",
            error
          );

          toast(
            error.message ||
            "Wishlist gagal diperbarui."
          );

          button.disabled = false;
        }

      }
    );

  }
);

/* =========================================================
   BUY NOW
========================================================= */

$$("[data-buy]").forEach(
  button => {

    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (!S.user) {
          authModal();
          return;
        }

        const productId =
          String(
            button.dataset.buy || ""
          ).trim();

        if (!productId) {
          toast(
            "Produk tidak ditemukan.",
            "bad"
          );
          return;
        }

        try {

          button.disabled = true;

          S.directCheckout = {
            productId,
            qty: 1
          };

          go("/checkout");

        } catch (error) {

          console.error(
            "BUY NOW ERROR:",
            error
          );

          toast(
            error.message ||
            "Gagal membuka checkout.",
            "bad"
          );

          button.disabled = false;

        }

      }
    );

  }
);

/* =========================================================
   ADD TO CART
========================================================= */

$$("[data-add]").forEach(
  button => {

    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (!S.user) {
          authModal();
          return;
        }

        const productId =
          String(
            button.dataset.add || ""
          ).trim();

        if (!productId) {

          toast(
            "Produk tidak ditemukan.",
            "bad"
          );

          return;
        }

        try {

          button.disabled = true;

          const originalHTML =
            button.innerHTML;

          button.innerHTML = `
            ${icon("loader-circle", 15)}
            Menambahkan...
          `;

          refreshIcons();

          const result =
            await api(
              "/api/cart",
              {
                method: "POST",

                body: {
                  productId,
                  qty: 1
                }
              }
            );

          if (!result?.ok) {

            throw new Error(
              result?.message ||
              "Gagal menambahkan ke keranjang."
            );

          }

          await data();

          toast(
            "Produk berhasil ditambahkan ke keranjang.",
            "good"
          );

          /*
           * Tidak wajib render ulang seluruh halaman.
           * Tapi kita refresh supaya badge/cart state ikut update.
           */
          await render();

        } catch (error) {

          console.error(
            "ADD CART ERROR:",
            error
          );

          toast(
            error.message ||
            "Gagal menambahkan ke keranjang.",
            "bad"
          );

          button.disabled = false;

        }

      }
    );

  }
);

  /* =========================================================
     REMOVE CART ITEM
     ========================================================= */

  $$("[data-rm]").forEach(
    button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          remove(
            button.dataset.rm
          );

        }
      );

    }
  );

  /* =========================================================
   CART QUANTITY
========================================================= */

$$("[data-cart-minus]").forEach(
  button => {

    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const id =
          String(
            button.dataset.cartMinus || ""
          ).trim();

        const item =
          S.cart.find(
            cartItem =>
              String(cartItem.id) === id
          );

        if (!item) {
          toast(
            "Item keranjang tidak ditemukan.",
            "bad"
          );
          return;
        }

        const currentQty =
          Number(item.qty || 1);

        if (currentQty <= 1) {

          toast(
            "Jumlah minimal adalah 1.",
            "bad"
          );

          return;
        }

        button.disabled = true;

        try {

          await qty(
            id,
            currentQty - 1
          );

        } finally {

          button.disabled = false;

        }

      }
    );

  }
);


$$("[data-cart-plus]").forEach(
  button => {

    button.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const id =
          String(
            button.dataset.cartPlus || ""
          ).trim();

        const item =
          S.cart.find(
            cartItem =>
              String(cartItem.id) === id
          );

        if (!item) {
          toast(
            "Item keranjang tidak ditemukan.",
            "bad"
          );
          return;
        }

        const currentQty =
          Number(item.qty || 1);

        const stock =
          Number(
            item.products?.stock ?? 999999
          );

        if (
          Number.isFinite(stock) &&
          stock > 0 &&
          currentQty >= stock
        ) {

          toast(
            `Maksimal ${stock} item untuk produk ini.`,
            "bad"
          );

          return;
        }

        button.disabled = true;

        try {

          await qty(
            id,
            currentQty + 1
          );

        } finally {

          button.disabled = false;

        }

      }
    );

  }
);

  /* =========================================================
     PRODUCT CARD NAVIGATION
     ========================================================= */

  $$("[data-product]").forEach(
    productCard => {

      productCard.addEventListener(
        "click",
        event => {

          if (
            event.target.closest("button") ||
            event.target.closest("a") ||
            event.target.closest("input")
          ) {
            return;
          }

          go(
            `/product/${productCard.dataset.product}`
          );
        }
      );

    }
  );


  /* =========================================================
     SHOP SEARCH / FILTER
     ========================================================= */

  $("#goSearch")?.addEventListener(
    "click",
    () => {

      const q =
        $("#sq")?.value || "";

      const category =
        $("#sc")?.value || "";

      const sort =
        $("#ss")?.value || "featured";

      go(
        `/shop?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}`
      );

    }
  );


/* =========================================================
   PROFILE SAVE
========================================================= */

const profileForm =
  $("#profileForm");

if (profileForm && !profileForm.dataset.bound) {

  profileForm.dataset.bound = "1";

  profileForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const button =
        $("#profileSave");

      try {

        if (button) {

          button.disabled = true;

          button.innerHTML = `
            ${icon(
              "loader-circle",
              15
            )}
            Menyimpan...
          `;

          refreshIcons();

        }


        const payload =
          Object.fromEntries(
            new FormData(
              profileForm
            ).entries()
          );


        const result =
          await api(
            "/api/profile",
            {
              method: "PUT",
              body: payload
            }
          );


        if (
          !result ||
          result.ok === false
        ) {

          throw new Error(
            result?.message ||
            "Profil gagal diperbarui."
          );

        }


        /*
          Refresh user/session data.
        */

        await data();


        toast(
          result.message ||
          "Profil berhasil diperbarui.",
          "good"
        );


        /*
          Render ulang agar nama/avatar
          dan data terbaru langsung terlihat.
        */

        await render();


      } catch (error) {

        console.error(
          "PROFILE SAVE ERROR:",
          error
        );

        toast(
          error.message ||
          "Gagal menyimpan profil.",
          "bad"
        );

      } finally {

        /*
          Setelah render ulang button bisa
          sudah dibuat ulang, jadi aman.
        */

        const currentButton =
          $("#profileSave");

        if (currentButton) {

          currentButton.disabled =
            false;

        }

      }

    }
  );

}


  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

  $("#read")?.addEventListener(
    "click",
    markAllNotifications
  );


  /* =========================================================
     CHECKOUT
     ========================================================= */

  $("#checkout")?.addEventListener(
    "submit",
    checkoutSubmit
  );


  /* =========================================================
     VOUCHER
     ========================================================= */

  $("#cv")?.addEventListener(
    "click",
    voucherCheck
  );


  /* =========================================================
     SHIPPING
     ========================================================= */

  $("#shipping")?.addEventListener(
    "change",
    updateCheckoutShipping
  );


  /* =========================================================
     REVIEW / RATING
     SENGAJA CUMA SATU HANDLER
     ========================================================= */

  $$("[data-review]").forEach(
    button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          reviewModal(
            button.dataset.order,
            button.dataset.product,
            button.dataset.name
          );

        }
      );

    }
  );

}

/* =========================================================
   CUSTOMER ACTIONS
========================================================= */

async function add(id) {

  if (!S.user) {
    authModal();
    return;
  }

  try {

    await api("/api/cart", {
      method: "POST",
      body: {
        productId: id,
        qty: 1
      }
    });

    toast(
      "Produk ditambahkan ke keranjang.",
      "good"
    );

    await data();
    await render();

  } catch (error) {

    toast(
      error.message,
      "bad"
    );

  }
}

async function wishToggle(id) {

   if (!S.user) {
    authModal();
    return;
  }

  try {
    const r = await api('/api/wishlist', {
      method: 'POST',
      body: {
        productId: id
      }
    });

    toast(
      r.added
        ? 'Ditambahkan ke wishlist'
        : 'Dihapus dari wishlist'
    );

    await data();
    await render();
  } catch (e) {
    console.error('Wishlist error:', e);
    toast(e.message || 'Gagal mengubah wishlist', 'bad');
  }
}


async function qty(id, value) {
  try {

    await api(
      `/api/cart/${id}`,
      {
        method: "PUT",
        body: {
          qty: value
        }
      }
    );

    await data();
    await render();

  } catch (error) {

    toast(
      error.message,
      "bad"
    );

  }
}

async function remove(id) {

  try {

    await api(
      `/api/cart/${id}`,
      {
        method: "DELETE"
      }
    );

    toast(
      "Produk dihapus dari keranjang.",
      "good"
    );

    await data();
    await render();

  } catch (error) {

    toast(
      error.message,
      "bad"
    );

  }
}

async function saveProfile(event) {

  event.preventDefault();

  try {

    const result =
      await api(
        "/api/profile",
        {
          method: "PUT",
          body: Object.fromEntries(
            new FormData(
              event.currentTarget
            ).entries()
          )
        }
      );

    S.user = result.user;

    toast(
      "Profil berhasil diperbarui.",
      "good"
    );

    await render();

  } catch (error) {

    toast(
      error.message,
      "bad"
    );

  }
}

async function logout() {

  try {

    if (S.channel && S.sb) {

      try {
        await S.sb.removeChannel(
          S.channel
        );
      } catch (error) {
        console.warn(
          "Gagal membersihkan channel:",
          error
        );
      }

      S.channel = null;
    }

    if (window.veloraChatPoll) {

      clearInterval(
        window.veloraChatPoll
      );

      window.veloraChatPoll = null;
    }

    if (S.sb) {

      const {
        error
      } = await S.sb.auth.signOut();

      if (error) {
        throw error;
      }

    }

    S.session = null;
    S.user = null;
    S.admin = false;

    /* Persiapan role baru */
    S.role = "customer";
    S.isOwner = false;
    S.isDeveloper = false;
    S.isStaff = false;

    S.directCheckout = null;

    go("/");

    toast(
      "Sampai jumpa!",
      "good"
    );

  } catch (error) {

    console.error(
      "LOGOUT ERROR:",
      error
    );

    toast(
      error?.message ||
      "Gagal keluar dari akun.",
      "bad"
    );

  }
}
window.logout = logout;

async function markAllNotifications() {

  try {

    await api(
      "/api/notifications/read",
      {
        method: "POST",
        body: {}
      }
    );

    await data();
    await render();

  } catch (error) {

    toast(
      error.message,
      "bad"
    );

  }
}

/* =========================================================
   AUTH MODAL
========================================================= */

function authModal() {
  const oldModal = $("#authModal");

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement("div");

  modal.className = "modal";
  modal.id = "authModal";

  modal.innerHTML = `
    <div class="auth-shell">

      <div class="auth-glow auth-glow-a"></div>
      <div class="auth-glow auth-glow-b"></div>

      <div class="auth-card">

        <div class="auth-topbar">
          <div class="auth-brand-mark">
            <span class="auth-brand-dot"></span>
            <span>VELORA</span>
          </div>

          <button
            class="auth-close"
            id="ax"
            type="button"
            aria-label="Tutup"
          >
            ${icon("x", 18)}
          </button>
        </div>

        <div class="auth-intro">
          <span class="auth-eyebrow">
            VELORA ACCOUNT
          </span>

          <h3 id="authTitle">
            Selamat datang kembali.
          </h3>

          <p id="authSubtitle">
            Masuk untuk melanjutkan perjalananmu di VELORA.
          </p>
        </div>

        <form id="auth" class="auth-form">

          <div class="auth-field">
            <label for="authEmail">
              Email
            </label>

            <div class="auth-input-wrap">
              <span class="auth-input-icon">
                ${icon("mail", 17)}
              </span>

              <input
                id="authEmail"
                class="input auth-input"
                name="email"
                type="email"
                placeholder="nama@email.com"
                autocomplete="email"
                required
              >
            </div>
          </div>

          <div class="auth-field">

            <div class="auth-label-row">
              <label for="authPassword">
                Password
              </label>
            </div>

            <div class="auth-input-wrap">
              <span class="auth-input-icon">
                ${icon("lock-keyhole", 17)}
              </span>

              <input
                id="authPassword"
                class="input auth-input auth-password-input"
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                minlength="6"
                autocomplete="current-password"
                required
              >

              <button
                type="button"
                class="auth-password-toggle"
                id="authPasswordToggle"
                aria-label="Tampilkan password"
              >
                ${icon("eye", 17)}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="auth-forgot"
            id="forgotPassword"
          >
            Lupa password?
          </button>

          <div
            class="auth-field auth-name-field"
            id="nameF"
          >
            <label for="authName">
              Nama
            </label>

            <div class="auth-input-wrap">
              <span class="auth-input-icon">
                ${icon("user-round", 17)}
              </span>

              <input
                id="authName"
                class="input auth-input"
                name="name"
                type="text"
                placeholder="Nama lengkap"
                autocomplete="name"
              >
            </div>
          </div>

          <button
            class="auth-submit"
            id="authSubmit"
            type="submit"
          >
            Masuk
          </button>

        </form>

        <div class="auth-divider">
          <span>atau lanjut dengan</span>
        </div>

        <button
          class="auth-google"
          id="google"
          type="button"
        >
          <span class="auth-google-logo" aria-hidden="true">

            <svg
              viewBox="0 0 24 24"
              width="19"
              height="19"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.27c0-.78-.07-1.53-.2-2.25H12v4.26h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.4Z"
              />

              <path
                fill="#34A853"
                d="M12 21.74c2.64 0 4.86-.87 6.48-2.37l-3.14-2.45c-.87.58-1.98.93-3.34.93-2.56 0-4.73-1.73-5.51-4.05H3.25v2.53A9.74 9.74 0 0 0 12 21.74Z"
              />

              <path
                fill="#FBBC05"
                d="M6.49 13.8A5.87 5.87 0 0 1 6.18 12c0-.62.11-1.22.31-1.8V7.67H3.25A9.74 9.74 0 0 0 2.22 12c0 1.57.38 3.05 1.03 4.33l3.24-2.53Z"
              />

              <path
                fill="#EA4335"
                d="M12 6.15c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.86 3.18 14.64 2.26 12 2.26a9.79 9.79 0 0 0-8.75 5.41l3.24 2.53C7.27 7.88 9.44 6.15 12 6.15Z"
              />
            </svg>

          </span>

          <span id="googleText">
            Lanjut dengan Google
          </span>
        </button>

        <button
          class="auth-switch"
          id="toggle"
          type="button"
        >
          Buat akun baru
        </button>

        <div class="auth-secure">
          <span class="auth-secure-icon">
            ${icon("shield-check", 14)}
          </span>

          <span>
            Akun kamu diamankan oleh Supabase Auth.
          </span>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  refreshIcons();

  modal.dataset.mode = "login";

  const card =
    modal.querySelector(".auth-card");

  const close = () => {
    modal.remove();
  };

  const closeButton =
    modal.querySelector("#ax");

  const form =
    modal.querySelector("#auth");

  const toggle =
    modal.querySelector("#toggle");

  const nameField =
    modal.querySelector("#nameF");

  const submit =
    modal.querySelector("#authSubmit");

  const title =
    modal.querySelector("#authTitle");

  const subtitle =
    modal.querySelector("#authSubtitle");

  const password =
    modal.querySelector("#authPassword");

  const passwordToggle =
    modal.querySelector("#authPasswordToggle");

  const googleButton =
    modal.querySelector("#google");

  const googleText =
    modal.querySelector("#googleText");

  const forgotButton =
    modal.querySelector("#forgotPassword");

  /* -----------------------------------------
     CLOSE BUTTON
     ----------------------------------------- */

  closeButton?.addEventListener(
    "click",
    close
  );

  /* -----------------------------------------
     CLICK OUTSIDE
     ----------------------------------------- */

  modal.addEventListener(
    "click",
    event => {

      if (event.target === modal) {
        close();
      }

    }
  );

  /* -----------------------------------------
     ESC KEY
     ----------------------------------------- */

  const escapeHandler =
    event => {

      if (event.key === "Escape") {
        close();

        document.removeEventListener(
          "keydown",
          escapeHandler
        );
      }

    };

  document.addEventListener(
    "keydown",
    escapeHandler
  );

  /* -----------------------------------------
     PASSWORD VISIBILITY
     ----------------------------------------- */

  passwordToggle?.addEventListener(
    "click",
    () => {

      const showing =
        password.type === "text";

      password.type =
        showing
          ? "password"
          : "text";

      passwordToggle.innerHTML =
        showing
          ? icon("eye", 17)
          : icon("eye-off", 17);

      passwordToggle.setAttribute(
        "aria-label",
        showing
          ? "Tampilkan password"
          : "Sembunyikan password"
      );

      refreshIcons();
    }
  );

  /* -----------------------------------------
     LOGIN / REGISTER SWITCH
     ----------------------------------------- */

  toggle?.addEventListener(
    "click",
    () => {

      const signup =
        modal.dataset.mode !== "signup";

      modal.dataset.mode =
        signup
          ? "signup"
          : "login";

      nameField.classList.toggle(
        "is-visible",
        signup
      );

      const nameInput =
        nameField.querySelector(
          'input[name="name"]'
        );

      if (nameInput) {
        nameInput.required =
          signup;
      }

      forgotButton.classList.toggle(
        "is-hidden",
        signup
      );

      submit.textContent =
        signup
          ? "Buat akun"
          : "Masuk";

      toggle.textContent =
        signup
          ? "Sudah punya akun"
          : "Buat akun baru";

      title.textContent =
        signup
          ? "Mulai bersama VELORA."
          : "Selamat datang kembali.";

      subtitle.textContent =
        signup
          ? "Buat akun dan temukan pengalaman VELORA."
          : "Masuk untuk melanjutkan perjalananmu di VELORA.";

      googleText.textContent =
        signup
          ? "Daftar dengan Google"
          : "Lanjut dengan Google";

      googleButton.classList.toggle(
        "is-signup",
        signup
      );
    }
  );

  /* -----------------------------------------
     FORGOT PASSWORD
     ----------------------------------------- */

  forgotButton?.addEventListener(
    "click",
    () => {

      const emailInput =
        modal.querySelector(
          'input[name="email"]'
        );

      const email =
        String(
          emailInput?.value || ""
        ).trim();

      close();

      forgotPasswordModal(email);
    }
  );

  /* -----------------------------------------
     EMAIL LOGIN / REGISTER
     ----------------------------------------- */

  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (!S.sb) {
        toast(
          "Supabase belum siap.",
          "bad"
        );

        return;
      }

      const formData =
        Object.fromEntries(
          new FormData(form).entries()
        );

      const mode =
        modal.dataset.mode || "login";

      const email =
        String(
          formData.email || ""
        ).trim();

      const passwordValue =
        String(
          formData.password || ""
        );

      const name =
        String(
          formData.name || ""
        ).trim();

      if (!email) {
        toast(
          "Email wajib diisi.",
          "bad"
        );

        return;
      }

      if (passwordValue.length < 6) {
        toast(
          "Password minimal 6 karakter.",
          "bad"
        );

        return;
      }

      if (
        mode === "signup" &&
        !name
      ) {
        toast(
          "Nama wajib diisi.",
          "bad"
        );

        return;
      }

      try {

        submit.disabled = true;
        googleButton.disabled = true;
        forgotButton.disabled = true;
        toggle.disabled = true;

        submit.innerHTML = `
          <span class="auth-spinner"></span>
          ${
            mode === "signup"
              ? "Membuat akun..."
              : "Memproses..."
          }
        `;

        let result;

        if (mode === "signup") {

          result =
            await S.sb.auth.signUp({
              email,
              password: passwordValue,

              options: {
                data: {
                  name:
                    name ||
                    email.split("@")[0]
                }
              }
            });

        } else {

          result =
            await S.sb.auth.signInWithPassword({
              email,
              password: passwordValue
            });

        }

        if (result?.error) {
          throw result.error;
        }

        /* -------------------------------------
           SIGNUP WITHOUT SESSION
           ------------------------------------- */

        if (
          mode === "signup" &&
          !result?.data?.session
        ) {

          toast(
            "Akun berhasil dibuat. Cek email untuk konfirmasi.",
            "good"
          );

          close();

          return;
        }

        /* -------------------------------------
           SUCCESS
           ------------------------------------- */

        close();

        S.session =
          result?.data?.session ||
          S.session;

        await me();
        await data();
        await render();

        toast(
          "Selamat datang di VELORA!",
          "good"
        );

      } catch (error) {

        console.error(
          "AUTH ERROR:",
          error
        );

        submit.disabled = false;
        googleButton.disabled = false;
        forgotButton.disabled = false;
        toggle.disabled = false;

        submit.textContent =
          mode === "signup"
            ? "Buat akun"
            : "Masuk";

        toast(
          error?.message ||
          "Autentikasi gagal.",
          "bad"
        );
      }
    }
  );

  /* -----------------------------------------
     GOOGLE LOGIN
     ----------------------------------------- */

  googleButton?.addEventListener(
    "click",
    async () => {

      if (!S.sb) {
        toast(
          "Supabase belum siap.",
          "bad"
        );

        return;
      }

      try {

        googleButton.disabled = true;
        submit.disabled = true;
        toggle.disabled = true;
        forgotButton.disabled = true;

        googleText.textContent =
          "Menghubungkan ke Google...";

        const result =
          await S.sb.auth.signInWithOAuth({
            provider: "google",

            options: {
              redirectTo:
                window.location.origin
            }
          });

        if (result?.error) {
          throw result.error;
        }

      } catch (error) {

        console.error(
          "GOOGLE LOGIN ERROR:",
          error
        );

        googleButton.disabled = false;
        submit.disabled = false;
        toggle.disabled = false;
        forgotButton.disabled = false;

        googleText.textContent =
          modal.dataset.mode === "signup"
            ? "Daftar dengan Google"
            : "Lanjut dengan Google";

        toast(
          error?.message ||
          "Login dengan Google gagal.",
          "bad"
        );
      }
    }
  );

  /* -----------------------------------------
     ANIMATION + AUTO FOCUS
     ----------------------------------------- */

  requestAnimationFrame(() => {

    modal.classList.add(
      "is-ready"
    );

    const firstInput =
      modal.querySelector(
        'input[name="email"]'
      );

    firstInput?.focus();
  });
}

function forgotPasswordModal(prefill = "") {

  const oldModal =
    $("#forgotPasswordModal");

  if (oldModal) {
    oldModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.className = "modal";
  modal.id = "forgotPasswordModal";

  modal.innerHTML = `
    <div class="auth-shell">

      <div class="auth-glow auth-glow-a"></div>
      <div class="auth-glow auth-glow-b"></div>

      <div class="auth-card">

        <div class="auth-topbar">

          <div class="auth-brand-mark">
            <span class="auth-brand-dot"></span>
            <span>VELORA</span>
          </div>

          <button
            class="auth-close"
            id="forgotClose"
            type="button"
            aria-label="Tutup"
          >
            ${icon("x", 18)}
          </button>

        </div>

        <div class="auth-intro">

          <span class="auth-eyebrow">
            ACCOUNT RECOVERY
          </span>

          <h3>
            Lupa password?
          </h3>

          <p>
            Masukkan email akunmu. Kami akan
            mengirimkan link untuk membuat password baru.
          </p>

        </div>

        <form
          id="forgotPasswordForm"
          class="auth-form"
        >

          <div class="auth-field">

            <label for="forgotEmail">
              Email
            </label>

            <div class="auth-input-wrap">

              <span class="auth-input-icon">
                ${icon("mail", 17)}
              </span>

              <input
                id="forgotEmail"
                class="input auth-input"
                name="email"
                type="email"
                value="${esc(prefill)}"
                placeholder="nama@email.com"
                autocomplete="email"
                required
              >

            </div>

          </div>

          <button
            class="auth-submit"
            type="submit"
            id="forgotSubmit"
          >
            Kirim link reset
          </button>

        </form>

        <button
          class="auth-switch"
          id="backToLogin"
          type="button"
        >
          Kembali ke Masuk
        </button>

        <div class="auth-secure">

          <span class="auth-secure-icon">
            ${icon("shield-check", 14)}
          </span>

          <span>
            Link reset hanya dapat digunakan melalui email akunmu.
          </span>

        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  refreshIcons();

  const close = () => {
    modal.remove();
  };

  const closeButton =
    modal.querySelector("#forgotClose");

  const backToLogin =
    modal.querySelector("#backToLogin");

  const form =
    modal.querySelector("#forgotPasswordForm");

  const submitButton =
    modal.querySelector("#forgotSubmit");

  closeButton?.addEventListener(
    "click",
    close
  );

  modal.addEventListener(
    "click",
    event => {

      if (event.target === modal) {
        close();
      }

    }
  );

  const escapeHandler =
    event => {

      if (event.key === "Escape") {

        close();

        document.removeEventListener(
          "keydown",
          escapeHandler
        );
      }

    };

  document.addEventListener(
    "keydown",
    escapeHandler
  );

  backToLogin?.addEventListener(
    "click",
    () => {

      close();

      authModal();
    }
  );

  form?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (!S.sb) {
        toast(
          "Supabase belum siap.",
          "bad"
        );

        return;
      }

      const formData =
        Object.fromEntries(
          new FormData(form).entries()
        );

      const email =
        String(
          formData.email || ""
        ).trim();

      if (!email) {
        toast(
          "Masukkan email terlebih dahulu.",
          "bad"
        );

        return;
      }

      try {

        submitButton.disabled = true;

        submitButton.innerHTML = `
          <span class="auth-spinner"></span>
          Mengirim...
        `;

        const {
          error
        } =
          await S.sb.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                `${window.location.origin}/?recovery=1`
            }
          );

        if (error) {
          throw error;
        }

        /*
         * Jangan membocorkan apakah email
         * benar-benar terdaftar.
         */

        toast(
          "Link reset sudah dikirim. Cek email kamu.",
          "good"
        );

        close();

      } catch (error) {

        console.error(
          "FORGOT PASSWORD ERROR:",
          error
        );

        submitButton.disabled = false;

        submitButton.textContent =
          "Kirim link reset";

        toast(
          error?.message ||
          "Gagal mengirim link reset.",
          "bad"
        );
      }
    }
  );

  requestAnimationFrame(() => {

    modal.classList.add(
      "is-ready"
    );

    modal.querySelector(
      "#forgotEmail"
    )?.focus();

  });
}


function resetPasswordModal() {
  const oldModal = $("#resetPasswordModal");

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement("div");

  modal.className = "modal";
  modal.id = "resetPasswordModal";

  modal.innerHTML = `
    <div class="auth-shell">

      <div class="auth-glow auth-glow-a"></div>
      <div class="auth-glow auth-glow-b"></div>

      <div class="auth-card">

        <div class="auth-topbar">

          <div class="auth-brand-mark">
            <span class="auth-brand-dot"></span>
            <span>VELORA</span>
          </div>

        </div>

        <div class="auth-intro">

          <span class="auth-eyebrow">
            PASSWORD RESET
          </span>

          <h3>
            Buat password baru.
          </h3>

          <p>
            Masukkan password baru untuk mengamankan
            kembali akun VELORA kamu.
          </p>

        </div>

        <form
          id="resetPasswordForm"
          class="auth-form"
        >

          <div class="auth-field">

            <label for="newPassword">
              Password baru
            </label>

            <div class="auth-input-wrap">

              <span class="auth-input-icon">
                ${icon("lock-keyhole", 17)}
              </span>

              <input
                id="newPassword"
                class="input auth-input"
                name="password"
                type="password"
                minlength="6"
                autocomplete="new-password"
                placeholder="Minimal 6 karakter"
                required
              >

              <button
                type="button"
                class="auth-password-toggle"
                id="newPasswordToggle"
                aria-label="Tampilkan password"
              >
                ${icon("eye", 17)}
              </button>

            </div>

          </div>

          <div class="auth-field">

            <label for="confirmPassword">
              Konfirmasi password
            </label>

            <div class="auth-input-wrap">

              <span class="auth-input-icon">
                ${icon("shield-check", 17)}
              </span>

              <input
                id="confirmPassword"
                class="input auth-input"
                name="confirmPassword"
                type="password"
                minlength="6"
                autocomplete="new-password"
                placeholder="Ulangi password baru"
                required
              >

              <button
                type="button"
                class="auth-password-toggle"
                id="confirmPasswordToggle"
                aria-label="Tampilkan password"
              >
                ${icon("eye", 17)}
              </button>

            </div>

          </div>

          <button
            class="auth-submit"
            id="resetPasswordSubmit"
            type="submit"
          >
            Simpan password baru
          </button>

        </form>

        <div class="auth-secure">

          <span class="auth-secure-icon">
            ${icon("shield-check", 14)}
          </span>

          <span>
            Password diperbarui dengan aman melalui Supabase Auth.
          </span>

        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  refreshIcons();

  const form =
    modal.querySelector("#resetPasswordForm");

  const submitButton =
    modal.querySelector("#resetPasswordSubmit");

  const newPassword =
    modal.querySelector("#newPassword");

  const confirmPassword =
    modal.querySelector("#confirmPassword");

  const newPasswordToggle =
    modal.querySelector("#newPasswordToggle");

  const confirmPasswordToggle =
    modal.querySelector("#confirmPasswordToggle");

  const close = () => {
    modal.remove();
  };

  function bindPasswordToggle(input, button) {
    button?.addEventListener(
      "click",
      () => {
        const showing =
          input.type === "text";

        input.type =
          showing
            ? "password"
            : "text";

        button.innerHTML =
          showing
            ? icon("eye", 17)
            : icon("eye-off", 17);

        button.setAttribute(
          "aria-label",
          showing
            ? "Tampilkan password"
            : "Sembunyikan password"
        );

        refreshIcons();
      }
    );
  }

  bindPasswordToggle(
    newPassword,
    newPasswordToggle
  );

  bindPasswordToggle(
    confirmPassword,
    confirmPasswordToggle
  );

  const escapeHandler =
    event => {
      if (event.key === "Escape") {
        close();

        document.removeEventListener(
          "keydown",
          escapeHandler
        );
      }
    };

  document.addEventListener(
    "keydown",
    escapeHandler
  );

  modal.addEventListener(
    "click",
    event => {
      if (event.target === modal) {
        close();
      }
    }
  );

  form?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (!S.sb) {
        toast(
          "Supabase belum siap.",
          "bad"
        );
        return;
      }

      const values =
        Object.fromEntries(
          new FormData(form).entries()
        );

      const password =
        String(values.password || "");

      const confirmPasswordValue =
        String(values.confirmPassword || "");

      if (password.length < 6) {
        toast(
          "Password minimal 6 karakter.",
          "bad"
        );
        return;
      }

      if (password !== confirmPasswordValue) {
        toast(
          "Konfirmasi password tidak cocok.",
          "bad"
        );
        return;
      }

      try {
        submitButton.disabled = true;

        submitButton.innerHTML = `
          <span class="auth-spinner"></span>
          Menyimpan...
        `;

        const {
          data: sessionData,
          error: sessionError
        } = await S.sb.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!sessionData?.session) {
          throw new Error(
            "Sesi reset password sudah tidak valid. Minta link reset baru."
          );
        }

        const { error } =
          await S.sb.auth.updateUser({
            password
          });

        if (error) {
          throw error;
        }

        toast(
          "Password berhasil diubah.",
          "good"
        );

        close();

        await S.sb.auth.signOut();

        S.session = null;
        S.user = null;
        S.admin = false;

        if ("role" in S) {
          S.role = null;
        }

        if ("directCheckout" in S) {
          S.directCheckout = null;
        }

        go("/");

        setTimeout(() => {
          authModal();
        }, 350);

      } catch (error) {
        console.error(
          "RESET PASSWORD ERROR:",
          error
        );

        submitButton.disabled = false;

        submitButton.textContent =
          "Simpan password baru";

        toast(
          error?.message ||
          "Gagal mengubah password.",
          "bad"
        );
      }
    }
  );

  requestAnimationFrame(() => {
    modal.classList.add("is-ready");
    newPassword?.focus();
  });
}

function initPasswordRecovery() {

  if (!S.sb) {
    return;
  }

  if (S.__passwordRecoveryBound) {
    return;
  }

  S.__passwordRecoveryBound = true;

  /*
   * Supabase mengirim PASSWORD_RECOVERY
   * ketika user datang melalui reset-password link.
   */

  S.sb.auth.onAuthStateChange(
    (event, session) => {

      if (
        event === "PASSWORD_RECOVERY"
      ) {

        S.session =
          session ||
          S.session;

        setTimeout(() => {

          const existing =
            $("#resetPasswordModal");

          if (!existing) {
            resetPasswordModal();
          }

        }, 80);
      }

    }
  );

  /*
   * Fallback untuk URL:
   * ?recovery=1
   */

  const params =
    new URLSearchParams(
      window.location.search
    );

  const isRecovery =
    params.get("recovery") === "1";

  if (!isRecovery) {
    return;
  }

  /*
   * Bersihkan query parameter
   * tanpa reload halaman.
   */

  try {

    const cleanUrl =
      window.location.origin +
      window.location.pathname +
      window.location.hash;

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );

  } catch (error) {

    console.warn(
      "RECOVERY URL CLEANUP:",
      error
    );
  }

  /*
   * Cek session recovery sebagai
   * fallback tambahan.
   */

  S.sb.auth
    .getSession()
    .then(({ data, error }) => {

      if (error) {
        console.error(
          "RECOVERY SESSION ERROR:",
          error
        );

        return;
      }

      if (!data?.session) {
        return;
      }

      S.session =
        data.session;

      setTimeout(() => {

        const existing =
          $("#resetPasswordModal");

        if (!existing) {
          resetPasswordModal();
        }

      }, 150);

    })
    .catch(error => {

      console.error(
        "RECOVERY SESSION ERROR:",
        error
      );

    });
}
/* =========================================================
   VOUCHER
========================================================= */

async function voucherCheck() {

  try {

    const subtotal =
      Number(
        $("#checkout")?.dataset?.subtotal || 0
      );

    const code =
      String(
        $("#vc")?.value || ""
      ).trim();

    if (!code) {
      $("#vi").textContent =
        "Masukkan kode voucher terlebih dahulu.";

      updateCheckoutTotal(0);
      return;
    }

    const result =
      await api(
        "/api/voucher/check",
        {
          method: "POST",

          body: {
            code,
            subtotal
          }
        }
      );

    const discount =
      Number(
        result.discount || 0
      );

    $("#vi").textContent =
      `Diskon ${money(discount)} berhasil diterapkan.`;

    $("#vi").classList.add(
      "success"
    );

    updateCheckoutTotal(
      discount
    );

  } catch (error) {

    $("#vi").textContent =
      error.message ||
      "Voucher tidak dapat digunakan.";

    $("#vi").classList.remove(
      "success"
    );

    updateCheckoutTotal(0);

  }
}


function updateCheckoutShipping() {

  const discount =
    Number(
      $("#vi")?.dataset?.discount || 0
    );

  updateCheckoutTotal(
    discount
  );
}


function updateCheckoutTotal(
  discount = 0
) {

  const subtotal =
    Number(
      $("#checkout")?.dataset?.subtotal || 0
    );

  const shipping =
    $("#shipping")?.value === "express"
      ? 25000
      : 12000;

  const discountValue =
    Math.max(
      0,
      Number(discount || 0)
    );

  const total =
    Math.max(
      0,
      subtotal +
      shipping -
      discountValue
    );

  if ($("#disc")) {
    $("#disc").textContent =
      money(discountValue);
  }

  if ($("#ship")) {
    $("#ship").textContent =
      money(shipping);
  }

  if ($("#total")) {
    $("#total").textContent =
      money(total);
  }

  if ($("#vi")) {
    $("#vi").dataset.discount =
      String(discountValue);
  }
}
async function ensureMidtransSnap() {

  if (window.snap?.pay) {
    return true;
  }

  const src =
    String(
      S.cfg?.midtransSnapJs ||
      ""
    ).trim();

  const clientKey =
    String(
      S.cfg?.midtransClientKey ||
      ""
    ).trim();

  if (!src || !clientKey) {
    throw new Error(
      "Midtrans belum dikonfigurasi di server."
    );
  }

  await new Promise((resolve, reject) => {

    const existing =
      document.querySelector(
        'script[data-velora-midtrans="1"]'
      );

    if (existing) {

      if (window.snap?.pay) {
        resolve();
        return;
      }

      existing.addEventListener(
        "load",
        resolve,
        { once: true }
      );

      existing.addEventListener(
        "error",
        () =>
          reject(
            new Error(
              "Gagal memuat Midtrans Snap."
            )
          ),
        { once: true }
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src = src;
    script.dataset.veloraMidtrans = "1";
    script.async = true;

    script.onload = () => resolve();

    script.onerror = () =>
      reject(
        new Error(
          "Gagal memuat Midtrans Snap."
        )
      );

    document.head.appendChild(script);

  });

  if (!window.snap?.pay) {
    throw new Error(
      "Midtrans Snap belum siap."
    );
  }

  return true;
}


async function openMidtransPayment(
  orderId,
  orderCode
) {

  await ensureMidtransSnap();

  const result =
    await api(
      "/api/payment/create",
      {
        method: "POST",
        body: {
          orderId
        }
      }
    );

  if (!result?.token) {
    throw new Error(
      "Snap Token tidak diterima dari server."
    );
  }

  window.snap.pay(
    result.token,
    {
      onSuccess: async () => {

        toast(
          `Pembayaran ${orderCode} berhasil dikirim ke Midtrans.`,
          "good"
        );

        await data();

        go("/orders");

      },

      onPending: async () => {

        toast(
          `Pembayaran ${orderCode} masih menunggu.`,
          "good"
        );

        await data();

        go("/orders");

      },

      onError: async () => {

        toast(
          `Pembayaran ${orderCode} gagal.`,
          "bad"
        );

        await data();

        go("/orders");

      },

      onClose: async () => {

        toast(
          "Pembayaran ditutup. Pesanan tetap tersimpan sebagai pending.",
          "good"
        );

        await data();

        go("/orders");

      }
    }
  );
}


async function checkoutSubmit(event) {

  event.preventDefault();

  const form =
    event.currentTarget;

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  try {

    if (submitButton) {
      submitButton.disabled = true;
    }

    const payload =
      Object.fromEntries(
        new FormData(form).entries()
      );

    if (S.directCheckout?.productId) {

      payload.directProductId =
        S.directCheckout.productId;

      payload.directQty =
        S.directCheckout.qty || 1;

    }

    const result =
      await api(
        "/api/checkout",
        {
          method: "POST",
          body: payload
        }
      );

    const paymentMethod =
      String(
        payload.paymentMethod ||
        "cod"
      ).trim();

    S.directCheckout =
      null;

    /*
     * Midtrans:
     * order dibuat terlebih dahulu oleh backend,
     * kemudian backend membuat Snap Token.
     *
     * Status paid/failed/expired TIDAK ditentukan
     * oleh callback browser. Status final berasal
     * dari notification Midtrans ke server.
     */
    if (paymentMethod === "midtrans") {

      await openMidtransPayment(
        result.orderId,
        result.orderCode
      );

      return;
    }

    toast(
      `Pesanan ${result.orderCode} berhasil dibuat.`,
      "good"
    );

    await data();

    go("/orders");

  } catch (error) {

    console.error(
      "CHECKOUT ERROR:",
      error
    );

    toast(
      error.message ||
      "Checkout gagal.",
      "bad"
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
    }

  }
}

/* =========================================================
   ADMIN LAYOUT
========================================================= */

async function adminRender(section) {

 const items = [
  [
    "dashboard",
    "layout-dashboard",
    "Dashboard"
  ],
  [
    "products",
    "package",
    "Produk"
  ],
  [
    "orders",
    "shopping-bag",
    "Pesanan"
  ],
  [
    "customers",
    "users",
    "Pelanggan"
  ],
  [
    "vouchers",
    "ticket-percent",
    "Voucher"
  ],
  [
    "reviews",
    "star",
    "Review"
  ],
  [
    "chat",
    "message-circle",
    "Chat"
  ],
  [
    "analytics",
    "chart-no-axes-combined",
    "Analytics"
  ],
  [
    "appearance",
    "palette",
    "Tampilan"
  ],
  [
    "settings",
    "settings",
    "Pengaturan"
  ]
];

  let content = "";

  if (section === "dashboard") {
    content = await adminDash();
  }

  if (section === "products") {
    content = await adminProducts();
  }

  if (section === "orders") {
    content = await adminOrders();
  }

  if (section === "customers") {
    content = await adminCustomers();
  }

  if (section === "vouchers") {
    content = await adminVouchers();
  }

  if (section === "reviews") {
    content = await adminReviews();
  }

  if (section === "chat") {
    content = await adminChat();
  }

  if (section === "analytics") {
  content = await adminAnalytics();
}

if (section === "appearance") {
  content = await adminAppearance();
}

if (section === "settings") {
  content = await adminSettings();
}

  const title =
    items.find(
      item => item[0] === section
    )?.[2] ||
    "Admin";

  $("#app").innerHTML = `
    <div class="admin">

      <aside
        class="side"
        id="side"
      >

        <a
          class="brand"
          href="#/"
        >

          <span class="logo">
            ${icon("cookie", 19)}
          </span>

          <span>

            <b style="color:#fff">
              VELORA
            </b>

            <small>
              ADMIN
            </small>

          </span>

        </a>

        <div
          style="
            padding:13px 9px;
            background:#fff1;
            border-radius:14px;
            margin-top:12px
          "
        >

          <b>
            ${esc(S.user.name)}
          </b>

          <div
            style="
              font-size:11px;
              color:#a99faf
            "
          >
            ${esc(S.user.role)}
          </div>

        </div>

        <nav>

          ${items
            .map(
              item => `
                <a
                  class="
                    ${item[0] === section ? "active" : ""}
                  "
                  href="#/admin/${item[0]}"
                >
                  ${icon(item[1], 17)}
                  ${item[2]}
                </a>
              `
            )
            .join("")}

        </nav>

        <div
          style="
            margin-top:auto
          "
        >

          <a href="#/">
            ${icon("arrow-left", 17)}
            Toko
          </a>

          <a
            href="#"
            id="alogout"
          >
            ${icon("log-out", 17)}
            Keluar
          </a>

        </div>

      </aside>

      <section class="main">

        <header class="admin-top">

          <div>

            <span class="eyebrow">
              WORKSPACE
            </span>

            <h1>
              ${esc(title)}
            </h1>

          </div>

          <button
            class="icon-btn mobile"
            id="menu"
            type="button"
          >
            ${icon("menu")}
          </button>

        </header>

        <div class="admin-content">

          ${content}

        </div>

      </section>

    </div>
  `;

  refreshIcons();

  $("#alogout")?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      logout();
    }
  );

  $("#menu")?.addEventListener(
    "click",
    () =>
      $("#side")
        ?.classList.toggle("open")
  );

  adminBind(section);
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

const kp = (
  label,
  value,
  iconName
) => `
  <div class="kpi">

    <div class="top">
      ${esc(label)}
      ${icon(iconName, 17)}
    </div>

    <strong>
      ${esc(value)}
    </strong>

    <small>
      Terhubung
    </small>

  </div>
`;

async function adminDash() {

  const result =
    await api(
      "/api/admin/dashboard"
    );

  const labels = [];
  const values = [];
  const orderValues = [];

  for (let i = 14; i >= 0; i--) {

    const date =
      new Date(
        Date.now() -
        i * 86400000
      )
        .toISOString()
        .slice(0, 10);

    const rows =
      (result.daily || [])
        .filter(
          row =>
            row.created_at.slice(0, 10) ===
            date
        );

    labels.push(
      date.slice(5)
    );

    values.push(
      rows.reduce(
        (sum, row) =>
          sum +
          Number(row.total || 0),
        0
      )
    );

    orderValues.push(
      rows.length
    );
  }

  return `
    <div class="kpis">

      ${kp(
        "Revenue",
        money(result.stats.revenue),
        "trending-up"
      )}

      ${kp(
        "Pesanan",
        result.stats.orders,
        "shopping-bag"
      )}

      ${kp(
        "Customers",
        result.stats.customers,
        "users"
      )}

      ${kp(
        "Produk",
        result.stats.products,
        "package"
      )}

    </div>

    <div
      class="kpis"
      style="margin-top:14px"
    >

      ${kp(
        "Pending",
        result.stats.pending,
        "clock"
      )}

      ${kp(
        "Low Stock",
        result.stats.lowStock,
        "triangle-alert"
      )}

      ${kp(
        "Realtime",
        "ON",
        "radio"
      )}

      ${kp(
        "Runtime",
        "Node",
        "server"
      )}

    </div>

    <div class="charts">

      <div class="chart">

        <div
          style="
            display:flex;
            justify-content:space-between;
            margin-bottom:10px
          "
        >

          <div>

            <span class="eyebrow">
              REVENUE
            </span>

            <h3>
              Revenue 15 Hari
            </h3>

          </div>

        </div>

        <canvas id="c1"></canvas>

      </div>

      <div class="chart">

        <div
          style="
            margin-bottom:10px
          "
        >

          <span class="eyebrow">
            ORDERS
          </span>

          <h3>
            Volume Pesanan
          </h3>

        </div>

        <canvas id="c2"></canvas>

      </div>

    </div>

    <div class="admin-grid">

      <div class="panel">

        <h3>
          Pesanan terbaru
        </h3>

        <div class="table-wrap">

          <table class="table">

            <tr>
              <th>Kode</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
            </tr>

            ${(result.recentOrders || [])
              .map(
                order => `
                  <tr>

                    <td>
                      ${esc(order.order_code)}
                    </td>

                    <td>
                      ${esc(
                        order.profiles?.name ||
                        ""
                      )}
                    </td>

                    <td>
                      ${money(order.total)}
                    </td>

                    <td>
                      <span class="badge">
                        ${esc(order.status)}
                      </span>
                    </td>

                  </tr>
                `
              )
              .join("")}

          </table>

        </div>

      </div>

      <div class="panel">

        <h3>
          Quick actions
        </h3>

        <div
          style="
            display:grid;
            gap:9px;
            margin-top:12px
          "
        >

          <a
            class="btn soft"
            href="#/admin/products"
          >
            ${icon("plus", 16)}
            Tambah produk
          </a>

          <a
            class="btn soft"
            href="#/admin/vouchers"
          >
            ${icon("ticket-percent", 16)}
            Buat voucher
          </a>

          <a
            class="btn soft"
            href="/api/admin/report.csv"
          >
            ${icon("download", 16)}
            Download CSV
          </a>

        </div>

      </div>

    </div>

    <script
      id="chartData"
      type="application/json"
    >${JSON.stringify({
      labels,
      values,
      orderValues
    })}</script>
  `;
}

/* =========================================================
   ADMIN PRODUCTS
========================================================= */

async function adminProducts() {

  const result =
    await api(
      "/api/admin/products"
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          CATALOG
        </span>

        <h1>
          Produk
        </h1>

      </div>

      <button
        class="btn primary"
        id="newProduct"
        type="button"
      >
        ${icon("plus", 16)}
        Tambah produk
      </button>

    </div>

    <div class="panel table-wrap">

      <table class="table">

        <tr>

          <th>Produk</th>
          <th>Kategori</th>
          <th>Harga</th>
          <th>Stok</th>
          <th>Status</th>
          <th>Aksi</th>

        </tr>

        ${
          result.products?.length
            ? result.products
                .map(
                  product => `
                    <tr>

                      <td>
                        <b>
                          ${esc(product.name)}
                        </b>
                      </td>

                      <td>
                        ${esc(
                          product.categories?.name ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${money(product.price)}
                      </td>

                      <td>
                        ${product.stock}
                      </td>

                      <td>

                        <span
                          class="
                            badge
                            ${
                              product.active
                                ? "good"
                                : "bad"
                            }
                          "
                        >
                          ${
                            product.active
                              ? "Aktif"
                              : "Nonaktif"
                          }
                        </span>

                      </td>

                      <td>

                        <button
                          type="button"
                          class="icon-btn"
                          data-pe="${encodeURIComponent(
                            JSON.stringify(product)
                          )}"
                          title="Edit"
                        >
                          ${icon("pencil", 15)}
                        </button>

                        <button
                          type="button"
                          class="icon-btn"
                          data-pd="${product.id}"
                          title="Hapus"
                        >
                          ${icon("trash-2", 15)}
                        </button>

                      </td>

                    </tr>
                  `
                )
                .join("")
            : `
              <tr>
                <td colspan="6">
                  Belum ada produk.
                </td>
              </tr>
            `
        }

      </table>

    </div>
  `;
}

/* =========================================================
   ADMIN ORDERS
========================================================= */

async function adminOrders() {

  const result =
    await api(
      "/api/admin/orders"
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          FULFILLMENT
        </span>

        <h1>
          Pesanan
        </h1>

      </div>

    </div>

    <div class="panel table-wrap">

      <table class="table">

        <tr>

          <th>Kode</th>
          <th>Customer</th>
          <th>Total</th>
          <th>Payment</th>
          <th>Status</th>

        </tr>

        ${result.orders
          .map(
            order => `
              <tr>

                <td>
                  ${esc(order.order_code)}
                </td>

                <td>
                  ${esc(
                    order.profiles?.name ||
                    ""
                  )}
                </td>

                <td>
                  ${money(order.total)}
                </td>

                <td>
                  ${esc(
                    order.payment_method
                  )}
                </td>

                <td>

                  <select
                    class="select"
                    style="width:160px"
                    data-os="${order.id}"
                  >

                    ${[
                      "pending",
                      "paid",
                      "processing",
                      "shipped",
                      "completed",
                      "cancelled"
                    ]
                      .map(
                        status => `
                          <option
                            ${
                              order.status ===
                              status
                                ? "selected"
                                : ""
                            }
                          >
                            ${status}
                          </option>
                        `
                      )
                      .join("")}

                  </select>

                </td>

              </tr>
            `
          )
          .join("")}

      </table>

    </div>
  `;
}

/* =========================================================
   ADMIN CUSTOMERS
========================================================= */

async function adminCustomers() {

  const result =
    await api(
      "/api/admin/customers"
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          CRM
        </span>

        <h1>
          Pelanggan
        </h1>

      </div>

    </div>

    <div class="panel table-wrap">

      <table class="table">

        <tr>

          <th>Nama</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Bergabung</th>

        </tr>

        ${result.customers
          .map(
            customer => `
              <tr>

                <td>
                  ${esc(customer.name)}
                </td>

                <td>
                  ${esc(customer.email)}
                </td>

                <td>
                  ${esc(
                    customer.phone ||
                    "-"
                  )}
                </td>

                <td>
                  ${new Date(
                    customer.created_at
                  ).toLocaleDateString(
                    "id-ID"
                  )}
                </td>

              </tr>
            `
          )
          .join("")}

      </table>

    </div>
  `;
}

/* =========================================================
   ADMIN VOUCHERS
========================================================= */

async function adminVouchers() {

  const result =
    await api(
      "/api/admin/vouchers"
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          PROMOTION
        </span>

        <h1>
          Voucher
        </h1>

      </div>

      <button
        class="btn primary"
        id="newVoucher"
        type="button"
      >
        ${icon("plus", 16)}
        Buat voucher
      </button>

    </div>

    <div class="panel table-wrap">

      <table class="table">

        <tr>

          <th>Kode</th>
          <th>Tipe</th>
          <th>Nilai</th>
          <th>Min</th>
          <th>Quota</th>
          <th></th>

        </tr>

        ${result.vouchers
          .map(
            voucher => `
              <tr>

                <td>
                  ${esc(voucher.code)}
                </td>

                <td>
                  ${esc(voucher.type)}
                </td>

                <td>
                  ${
                    voucher.type === "percent"
                      ? `${voucher.value}%`
                      : money(voucher.value)
                  }
                </td>

                <td>
                  ${money(voucher.min_order)}
                </td>

                <td>
                  ${
                    voucher.quota ||
                    "∞"
                  }
                </td>

                <td>

                  <button
                    class="icon-btn"
                    type="button"
                    data-vd="${voucher.id}"
                  >
                    ${icon("trash-2", 15)}
                  </button>

                </td>

              </tr>
            `
          )
          .join("")}

      </table>

    </div>
  `;
}

/* =========================================================
   ADMIN REVIEWS
========================================================= */

async function adminReviews() {

  const result =
    await api(
      "/api/admin/reviews"
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          MODERATION
        </span>

        <h1>
          Review
        </h1>

      </div>

    </div>

    <div class="panel table-wrap">

      <table class="table">

        <tr>

          <th>Produk</th>
          <th>Customer</th>
          <th>Rating</th>
          <th>Komentar</th>
          <th>Status</th>

        </tr>

        ${result.reviews
          .map(
            review => `
              <tr>

                <td>
                  ${esc(
                    review.products?.name ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    review.profiles?.name ||
                    ""
                  )}
                </td>

                <td class="stars">
                  ${"★".repeat(
                    Number(
                      review.rating || 0
                    )
                  )}
                </td>

                <td>
                  ${esc(
                    review.comment || ""
                  )}
                </td>

                <td>

                  <select
                    class="select"
                    data-rs="${review.id}"
                  >

                    <option
                      ${
                        review.status ===
                        "pending"
                          ? "selected"
                          : ""
                      }
                    >
                      pending
                    </option>

                    <option
                      ${
                        review.status ===
                        "approved"
                          ? "selected"
                          : ""
                      }
                    >
                      approved
                    </option>

                    <option
                      ${
                        review.status ===
                        "rejected"
                          ? "selected"
                          : ""
                      }
                    >
                      rejected
                    </option>

                  </select>

                </td>

              </tr>
            `
          )
          .join("")}

      </table>

    </div>
  `;
}

/* =========================================================
   ADMIN CHAT
========================================================= */

async function adminChat() {

  const result =
    await api("/api/chat");

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          COMMUNITY
        </span>

        <h1>
          Chat Monitor
        </h1>

      </div>

      <span class="badge good">
        Realtime
      </span>

    </div>

    <div class="panel">

      <div
        class="messages"
        style="height:560px"
      >

        ${(result.messages || [])
          .map(
            message => `
              <div class="msg">

                <b>
                  ${esc(
                    message.profiles?.name ||
                    ""
                  )}
                </b>

                <div>
                  ${esc(
                    message.message
                  )}
                </div>

                <small>
                  ${new Date(
                    message.created_at
                  ).toLocaleString(
                    "id-ID"
                  )}
                </small>

              </div>
            `
          )
          .join("")}

      </div>

    </div>
  `;
}

/* =========================================================
   ADMIN ANALYTICS
========================================================= */

async function adminAnalytics() {

  const result =
    await api(
      "/api/admin/dashboard"
    );

  return `
    <div class="chart"
      style="height:520px"
    >

      <div style="margin-bottom:10px">

        <span class="eyebrow">
          BUSINESS INTELLIGENCE
        </span>

        <h3>
          Revenue Analytics
        </h3>

      </div>

      <canvas id="analytics"></canvas>

    </div>

    <script
      id="analyticsData"
      type="application/json"
    >${JSON.stringify(
      result.daily || []
    )}</script>
  `;
}

/* =========================================================
   ADMIN SETTINGS
========================================================= */
async function adminAppearance() {

  const result =
    await api("/api/admin/appearance");

  const heroImage =
    result.heroImage || "";

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          VISUAL EXPERIENCE
        </span>

        <h1>
          Tampilan
        </h1>

        <p class="muted">
          Kelola gambar Hero khusus halaman utama VELORA.
        </p>

      </div>

    </div>


    <div class="appearance-grid">

      <!-- PREVIEW -->

      <div class="panel">

        <span class="eyebrow">
          HOMEPAGE HERO
        </span>

        <h3>
          Preview Hero
        </h3>

        <p class="muted">
          Gambar ini khusus untuk halaman awal
          dan tidak berhubungan dengan gambar produk.
        </p>

        <div
          class="hero-admin-preview"
          id="heroPreview"
        >

          ${
            heroImage
              ? `
                <img
                  src="${esc(heroImage)}"
                  alt="Hero VELORA Cookies"
                >
              `
              : `
                <div class="hero-preview-empty">

                  ${icon("image", 38)}

                  <span>
                    Belum ada gambar Hero
                  </span>

                </div>
              `
          }

        </div>

      </div>


      <!-- CONTROL -->

      <div class="panel">

        <form
          id="heroForm"
        >

          <div class="field">

            <label>
              Foto Hero
            </label>

            <input
              class="input"
              type="file"
              id="heroFile"
              name="hero"
              accept="image/jpeg,image/png,image/webp"
            >

            <small class="muted">
              JPG, PNG atau WEBP · maksimal 4 MB
            </small>

          </div>


          <div
            id="heroFilePreview"
            style="margin-top:14px"
          ></div>


          <div
            style="
              display:flex;
              flex-wrap:wrap;
              gap:9px;
              margin-top:18px;
            "
          >

            <button
              class="btn primary"
              type="submit"
              id="saveHero"
            >
              ${icon("upload",16)}
              Upload & Aktifkan
            </button>

            ${
              heroImage
                ? `
                  <button
                    class="btn soft"
                    type="button"
                    id="removeHero"
                  >
                    ${icon("trash-2",16)}
                    Hapus Hero
                  </button>
                `
                : ""
            }

          </div>

        </form>


        <div
          style="
            margin-top:22px;
            padding-top:18px;
            border-top:1px solid var(--line);
          "
        >

          <span class="eyebrow">
            INFORMATION
          </span>

          <p
            class="muted"
            style="
              line-height:1.7;
              margin-top:7px;
            "
          >
            Foto Hero disimpan secara terpisah
            dari katalog produk.
          </p>

        </div>

      </div>

    </div>
  `;
}

async function adminSettings() {

  const result =
    await api(
      "/api/admin/settings"
    );

  const settings =
    Object.fromEntries(
      (result.settings || [])
        .map(
          item => [
            item.name,
            item.value
          ]
        )
    );

  return `
    <div class="page-title">

      <div>

        <span class="eyebrow">
          STORE
        </span>

        <h1>
          Pengaturan
        </h1>

      </div>

    </div>

    <form
      class="panel form-grid"
      id="settings"
    >

      <div class="field">

        <label>
          Store
        </label>

        <input
          class="input"
          name="store_name"
          value="${esc(
            settings.store_name ||
            S.cfg.storeName ||
            "VELORA Cookies"
          )}"
        >

      </div>

      <div class="field">

        <label>
          Email
        </label>

        <input
          class="input"
          name="store_email"
          value="${esc(
            settings.store_email ||
            S.cfg.storeEmail ||
            ""
          )}"
        >

      </div>

      <div class="field">

        <label>
          WhatsApp
        </label>

        <input
          class="input"
          name="store_phone"
          value="${esc(
            settings.store_phone ||
            S.cfg.storePhone ||
            ""
          )}"
        >

      </div>

      <div class="field full">

        <button
          class="btn primary"
          type="submit"
        >
          Simpan
        </button>

      </div>

    </form>
  `;
}

/* =========================================================
   ADMIN BIND
========================================================= */

function adminBind(section) {

  $("#newProduct")
    ?.addEventListener(
      "click",
      () => productModal()
    );

  $$("[data-pe]").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          try {

            const product =
              JSON.parse(
                decodeURIComponent(
                  button.dataset.pe
                )
              );

            productModal(product);

          } catch (error) {

            console.error(
              "EDIT PRODUCT PARSE ERROR:",
              error
            );

            toast(
              "Data produk tidak valid.",
              "bad"
            );

          }

        }
      );

    }
  );

  $$("[data-pd]").forEach(
    button => {

      button.addEventListener(
        "click",
        async () => {

          const confirmed =
            confirm(
              "Hapus produk ini?"
            );

          if (!confirmed) return;

          try {

            await api(
              `/api/admin/products/${button.dataset.pd}`,
              {
                method: "DELETE"
              }
            );

            toast(
              "Produk berhasil dihapus.",
              "good"
            );

            await render();

          } catch (error) {

            toast(
              error.message,
              "bad"
            );

          }

        }
      );

    }
  );

  $$("[data-os]").forEach(
    select => {

      select.addEventListener(
        "change",
        async () => {

          try {

            await api(
              `/api/admin/orders/${select.dataset.os}`,
              {
                method: "PUT",
                body: {
                  status: select.value
                }
              }
            );

            toast(
              "Status pesanan diperbarui.",
              "good"
            );

          } catch (error) {

            toast(
              error.message,
              "bad"
            );

          }

        }
      );

    }
  );

  $("#newVoucher")
    ?.addEventListener(
      "click",
      voucherModal
    );

  $$("[data-vd]").forEach(
    button => {

      button.addEventListener(
        "click",
        async () => {

          if (
            !confirm(
              "Hapus voucher ini?"
            )
          ) {
            return;
          }

          try {

            await api(
              `/api/admin/vouchers/${button.dataset.vd}`,
              {
                method: "DELETE"
              }
            );

            toast(
              "Voucher dihapus.",
              "good"
            );

            await render();

          } catch (error) {

            toast(
              error.message,
              "bad"
            );

          }

        }
      );

    }
  );

  $$("[data-rs]").forEach(
    select => {

      select.addEventListener(
        "change",
        async () => {

          try {

            await api(
              `/api/admin/reviews/${select.dataset.rs}`,
              {
                method: "PUT",
                body: {
                  status: select.value
                }
              }
            );

            toast(
              "Status review diperbarui.",
              "good"
            );

          } catch (error) {

            toast(
              error.message,
              "bad"
            );

          }

        }
      );

    }
  );

  $("#settings")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        try {

          await api(
            "/api/admin/settings",
            {
              method: "PUT",
              body: Object.fromEntries(
                new FormData(
                  event.currentTarget
                ).entries()
              )
            }
          );

          toast(
            "Pengaturan disimpan.",
            "good"
          );

        } catch (error) {

          toast(
            error.message,
            "bad"
          );

        }

      }
    );

  if (section === "dashboard") {

    const element =
      $("#chartData");

    if (element && window.Chart) {

      const data =
        JSON.parse(
          element.textContent
        );

      new Chart(
        $("#c1"),
        {
          type: "line",

          data: {
            labels: data.labels,

            datasets: [
              {
                label: "Revenue",
                data: data.values,
                tension: 0.4,
                fill: true
              }
            ]
          },

          options: {
            responsive: true,

            plugins: {
              legend: {
                display: false
              }
            },

            animation: {
              duration: 1300
            }
          }
        }
      );

      new Chart(
        $("#c2"),
        {
          type: "bar",

          data: {
            labels: data.labels,

            datasets: [
              {
                label: "Orders",
                data: data.orderValues,
                borderRadius: 8
              }
            ]
          },

          options: {
            responsive: true,

            plugins: {
              legend: {
                display: false
              }
            },

            animation: {
              duration: 1100
            }
          }
        }
      );
    }
  }

  if (section === "analytics") {

    const element =
      $("#analyticsData");

    if (element && window.Chart) {

      const raw =
        JSON.parse(
          element.textContent
        );

      const grouped = {};

      raw.forEach(
        item => {

          const date =
            item.created_at
              .slice(0, 10);

          grouped[date] =
            (grouped[date] || 0) +
            Number(item.total || 0);

        }
      );

      new Chart(
        $("#analytics"),
        {
          type: "line",

          data: {
            labels:
              Object.keys(grouped),

            datasets: [
              {
                label: "Revenue",
                data:
                  Object.values(
                    grouped
                  ),
                tension: 0.4,
                fill: true
              }
            ]
          },

          options: {
            responsive: true,

            maintainAspectRatio:
              false,

            animation: {
              duration: 1500
            }
          }
        }
      );
    }
  }
}

/* =========================================================
   PRODUCT MODAL
========================================================= */

function productModal(product = null) {

  const modal =
    document.createElement("div");

  modal.className = "modal";
  modal.id = "productModal";

  const categoryOptions = [
    `<option value="">Tanpa kategori</option>`,
    ...S.cats.map(
      category => `
        <option
          value="${category.id}"
          ${
            String(
              product?.category_id || ""
            ) === String(category.id)
              ? "selected"
              : ""
          }
        >
          ${esc(category.name)}
        </option>
      `
    )
  ].join("");

  modal.innerHTML = `
    <div class="modal-card">

      <div class="modal-head">

        <div>

          <span class="eyebrow">
            CATALOG
          </span>

          <h3>
            ${product ? "Edit" : "Tambah"}
            produk
          </h3>

        </div>

        <button
          class="icon-btn"
          id="mx"
          type="button"
        >
          ${icon("x")}
        </button>

      </div>

      <form
        id="pf"
        novalidate
      >

        <div class="form-grid">

          <div class="field">

            <label>
              Nama Produk
            </label>

            <input
              class="input"
              id="productName"
              name="name"
              value="${esc(
                product?.name || ""
              )}"
              required
            >

          </div>

          <div class="field">

            <label>
              Slug
            </label>

            <input
              class="input"
              id="productSlug"
              name="slug"
              value="${esc(
                product?.slug || ""
              )}"
              required
            >

          </div>

          <div class="field">

            <label>
              Harga
            </label>

            <input
              class="input"
              type="number"
              name="price"
              value="${
                product?.price ??
                ""
              }"
              min="0"
              required
            >

          </div>

          <div class="field">

            <label>
              Stok
            </label>

            <input
              class="input"
              type="number"
              name="stock"
              value="${
                product?.stock ??
                ""
              }"
              min="0"
              required
            >

          </div>

          <div class="field">

            <label>
              Satuan
            </label>

            <select
              class="select"
              name="unit"
            >

              <option
                value="box"
                ${
                  !product ||
                  product.unit === "box"
                    ? "selected"
                    : ""
                }
              >
                box
              </option>

              <option
                value="pcs"
                ${
                  product?.unit === "pcs"
                    ? "selected"
                    : ""
                }
              >
                pcs
              </option>

              <option
                value="jar"
                ${
                  product?.unit === "jar"
                    ? "selected"
                    : ""
                }
              >
                jar
              </option>

            </select>

          </div>

          <div class="field">

            <label>
              Kategori
            </label>

            <select
              class="select"
              name="category_id"
            >
              ${categoryOptions}
            </select>

          </div>

          <div class="field">

            <label>
              Foto Produk
            </label>

            <input
              class="input"
              type="file"
              name="image"
              accept="
                .jpg,
                .jpeg,
                .png,
                .webp,
                image/jpeg,
                image/png,
                image/webp
              "
            >

          </div>

          <div class="field full">

            <label>
              Deskripsi
            </label>

            <textarea
              class="textarea"
              rows="5"
              name="description"
            >${esc(
              product?.description || ""
            )}</textarea>

          </div>

          <div class="field full">

            <label>

              <input
                type="checkbox"
                name="active"
                ${
                  product?.active !== false
                    ? "checked"
                    : ""
                }
              >

              Aktif

            </label>

            <label
              style="margin-left:14px"
            >

              <input
                type="checkbox"
                name="featured"
                ${
                  product?.featured
                    ? "checked"
                    : ""
                }
              >

              Featured

            </label>

          </div>

          <div class="field full">

            <div
              id="productError"
              style="
                display:none;
                padding:12px 14px;
                border-radius:12px;
                background:#fff0f0;
                border:1px solid #fecaca;
                color:#b91c1c;
                margin-bottom:10px;
                font-size:13px;
              "
            ></div>

            <button
              class="btn primary"
              id="saveProduct"
              type="submit"
              style="width:100%"
            >
              ${
                product
                  ? "Simpan Perubahan"
                  : "Simpan Produk"
              }
            </button>

          </div>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  refreshIcons();

  const form = $("#pf");
  const nameInput =
    $("#productName");
  const slugInput =
    $("#productSlug");
  const errorBox =
    $("#productError");
  const saveButton =
    $("#saveProduct");

  $("#mx").addEventListener(
    "click",
    () => {
      modal.remove();
    }
  );

  nameInput.addEventListener(
    "input",
    () => {

      if (!product) {
        slugInput.value =
          slugify(
            nameInput.value
          );
      }

    }
  );

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      errorBox.style.display =
        "none";

      errorBox.textContent =
        "";

      const name =
        nameInput.value.trim();

      const slug =
        slugInput.value.trim() ||
        slugify(name);

      const price =
        Number(form.price.value);

      const stock =
        Number(form.stock.value);

      if (!name) {
        showProductError(
          "Nama produk wajib diisi."
        );
        nameInput.focus();
        return;
      }

      if (!slug) {
        showProductError(
          "Slug produk wajib diisi."
        );
        slugInput.focus();
        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        showProductError(
          "Harga produk tidak valid."
        );
        form.price.focus();
        return;
      }

      if (
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        showProductError(
          "Stok produk tidak valid."
        );
        form.stock.focus();
        return;
      }

      if (!S.session?.access_token) {
        showProductError(
          "Session admin tidak ditemukan. Login kembali."
        );
        return;
      }

      const formData =
        new FormData(form);

      formData.set(
        "name",
        name
      );

      formData.set(
        "slug",
        slug
      );

      formData.set(
        "price",
        String(price)
      );

      formData.set(
        "stock",
        String(stock)
      );

      formData.set(
        "active",
        form.active.checked
          ? "true"
          : "false"
      );

      formData.set(
        "featured",
        form.featured.checked
          ? "true"
          : "false"
      );

      if (!formData.get("category_id")) {
        formData.delete(
          "category_id"
        );
      }

      const endpoint =
        product
          ? `/api/admin/products/${product.id}`
          : "/api/admin/products";

      const method =
        product
          ? "PUT"
          : "POST";

      try {

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Menyimpan...";

        const response =
          await fetch(
            endpoint,
            {
              method,
              headers: {
                Authorization:
                  `Bearer ${S.session.access_token}`
              },
              body: formData
            }
          );

        let result = null;

        try {
          result =
            await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {

          throw new Error(
            result?.message ||
            `Server menolak permintaan (${response.status})`
          );

        }

        if (!result?.ok) {

          throw new Error(
            result?.message ||
            "Produk gagal disimpan."
          );

        }

        toast(
          product
            ? "Produk berhasil diperbarui."
            : "Produk berhasil ditambahkan.",
          "good"
        );

        modal.remove();

        await render();

      } catch (error) {

        console.error(
          "PRODUCT SAVE ERROR:",
          error
        );

        showProductError(
          error.message ||
          "Gagal menyimpan produk."
        );

        saveButton.disabled =
          false;

        saveButton.textContent =
          product
            ? "Simpan Perubahan"
            : "Simpan Produk";

      }
    }
  );

  function showProductError(
    message
  ) {

    errorBox.textContent =
      message;

    errorBox.style.display =
      "block";

  }
}

/* =========================================================
   VOUCHER MODAL
========================================================= */

function voucherModal() {

  const modal =
    document.createElement("div");

  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-card">

      <div class="modal-head">

        <h3>
          Buat voucher
        </h3>

        <button
          class="icon-btn"
          id="vx"
          type="button"
        >
          ${icon("x")}
        </button>

      </div>

      <form
        id="vf"
        class="form-grid"
      >

        <div class="field">

          <label>
            Kode
          </label>

          <input
            class="input"
            name="code"
            required
          >

        </div>

        <div class="field">

          <label>
            Tipe
          </label>

          <select
            class="select"
            name="type"
          >

            <option value="percent">
              percent
            </option>

            <option value="fixed">
              fixed
            </option>

          </select>

        </div>

        <div class="field">

          <label>
            Nilai
          </label>

          <input
            class="input"
            type="number"
            name="value"
            required
          >

        </div>

        <div class="field">

          <label>
            Minimum Order
          </label>

          <input
            class="input"
            type="number"
            name="min_order"
            value="0"
          >

        </div>

        <div class="field">

          <label>
            Maximum Discount
          </label>

          <input
            class="input"
            type="number"
            name="max_discount"
            value="0"
          >

        </div>

        <div class="field">

          <label>
            Quota
          </label>

          <input
            class="input"
            type="number"
            name="quota"
            value="0"
          >

        </div>

        <div class="field full">

          <button
            class="btn primary"
            type="submit"
            style="width:100%"
          >
            Buat voucher
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  refreshIcons();

  $("#vx").addEventListener(
    "click",
    () => modal.remove()
  );

  $("#vf").addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      try {

        await api(
          "/api/admin/vouchers",
          {
            method: "POST",
            body: Object.fromEntries(
              new FormData(
                event.currentTarget
              ).entries()
            )
          }
        );

        toast(
          "Voucher berhasil dibuat.",
          "good"
        );

        modal.remove();

        await render();

      } catch (error) {

        toast(
          error.message,
          "bad"
        );

      }

    }
  );
}

/* =========================================================
   GLOBAL EVENTS
========================================================= */

window.addEventListener(
  "hashchange",
  async () => {
    await render();
  }
);

window.addEventListener(
  "DOMContentLoaded",
  () => {
    boot();
  }
);