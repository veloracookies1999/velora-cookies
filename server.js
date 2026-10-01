import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const app = express();

const PORT =
  process.env.PORT || 3000;

const URL =
  process.env.SUPABASE_URL || "";

const ANON =
  process.env.SUPABASE_PUBLISHABLE_KEY || "";

const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const sb =
  URL && SERVICE
    ? createClient(
        URL,
        SERVICE,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    : null;


/* =========================================================
   MIDTRANS
========================================================= */

const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || "";

const MIDTRANS_CLIENT_KEY =
  process.env.MIDTRANS_CLIENT_KEY || "";

const MIDTRANS_IS_PRODUCTION =
  String(process.env.MIDTRANS_IS_PRODUCTION || "false")
    .toLowerCase() === "true";

const MIDTRANS_SNAP_URL =
  MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const MIDTRANS_SNAP_JS =
  MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";


/* =========================================================
   UPLOAD
========================================================= */

const upload =
  multer({
    storage: multer.memoryStorage(),

    limits: {
      fileSize:
        4 * 1024 * 1024
    },

    fileFilter:
      (_req, file, cb) => {

        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

        cb(
          null,
          allowed.includes(
            file.mimetype
          )
        );

      }
  });


/* =========================================================
   EXPRESS
========================================================= */

app.use(
  cors({
    origin: true
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/* =========================================================
   HELPERS
========================================================= */

const need = () => {

  if (!sb) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

};


const num = (
  value,
  fallback = 0
) => {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;

};


/* =========================================================
   AUTH
========================================================= */

async function actor(
  req,
  res
) {

  need();

  const authorization =
    req.headers.authorization ||
    "";

  const token =
    authorization.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : "";

  if (!token) {

    res.status(401).json({
      ok: false,
      message:
        "Login diperlukan."
    });

    return null;
  }


  const {
    data,
    error
  } =
    await sb.auth.getUser(
      token
    );


  if (
    error ||
    !data?.user
  ) {

    res.status(401).json({
      ok: false,
      message:
        "Sesi tidak valid."
    });

    return null;
  }


  const {
    data: profile
  } =
    await sb
      .from("profiles")
      .select("*")
      .eq(
        "id",
        data.user.id
      )
      .maybeSingle();


  return {
    auth:
      data.user,

    profile:
      profile || null
  };

}


async function admin(
  req,
  res
) {

  const x =
    await actor(
      req,
      res
    );

  if (!x) {
    return null;
  }


  if (
    ![
      "admin",
      "owner"
    ].includes(
      x.profile?.role
    )
  ) {

    res.status(403).json({
      ok: false,
      message:
        "Akses admin diperlukan."
    });

    return null;
  }


  return x;

}


/* =========================================================
   CONFIG
========================================================= */

app.get(
  "/api/config",
  async (_req, res) => {

    try {

      let heroImage = "";

      if (sb) {

        const {
          data
        } =
          await sb
            .from("settings")
            .select("value")
            .eq(
              "name",
              "homepage_hero"
            )
            .maybeSingle();

        heroImage =
          data?.value || "";

      }


      res.json({

        ok: true,

        supabaseUrl:
          URL,

        supabasePublishableKey:
          ANON,

        storeName:
          process.env.STORE_NAME ||
          "VELORA Cookies",

        storeEmail:
          process.env.STORE_EMAIL ||
          "veloracookies1999@gmail.com",

        storePhone:
          process.env.STORE_PHONE ||
          "+62 858-6430-6671",

        midtransClientKey:
          MIDTRANS_CLIENT_KEY,

        midtransProduction:
          MIDTRANS_IS_PRODUCTION,

        midtransSnapJs:
          MIDTRANS_SNAP_JS,

        heroImage

      });

    } catch {

      res.json({

        ok: true,

        supabaseUrl:
          URL,

        supabasePublishableKey:
          ANON,

        storeName:
          process.env.STORE_NAME ||
          "VELORA Cookies",

        storeEmail:
          process.env.STORE_EMAIL ||
          "veloracookies1999@gmail.com",

        storePhone:
          process.env.STORE_PHONE ||
          "+62 858-6430-6671",

        midtransClientKey:
          MIDTRANS_CLIENT_KEY,

        midtransProduction:
          MIDTRANS_IS_PRODUCTION,

        midtransSnapJs:
          MIDTRANS_SNAP_JS,

        heroImage:
          ""

      });

    }

  }
);


/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  async (_req, res) => {

    try {

      need();

      const {
        data,
        error
      } =
        await sb
          .from("settings")
          .select("name")
          .limit(1);

      res.json({

        ok:
          !error,

        database:
          !error,

        error:
          error
            ? {
                message:
                  error.message,

                code:
                  error.code,

                details:
                  error.details,

                hint:
                  error.hint
              }
            : null,

        rows:
          data?.length ?? 0

      });

    } catch (error) {

      res.status(500).json({

        ok: false,

        database: false,

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/me",
  async (
    req,
    res
  ) => {

    try {

      const authorization =
        req.headers.authorization ||
        "";

      const token =
        authorization.startsWith(
          "Bearer "
        )
          ? authorization.slice(7)
          : "";

      if (!token || !sb) {

        return res.json({
          ok: true,
          user: null
        });

      }


      const {
        data,
        error
      } =
        await sb.auth.getUser(
          token
        );


      if (
        error ||
        !data?.user
      ) {

        return res.json({
          ok: true,
          user: null
        });

      }


      const {
        data: profile
      } =
        await sb
          .from("profiles")
          .select("*")
          .eq(
            "id",
            data.user.id
          )
          .maybeSingle();


      res.json({

        ok: true,

        user:
          profile,

        authUser:
          data.user

      });

    } catch {

      res.json({

        ok: true,

        user:
          null

      });

    }

  }
);


/* =========================================================
   PRODUCTS
========================================================= */

app.get(
  "/api/products",
  async (
    req,
    res
  ) => {

    try {

      need();

      let q =
        sb
          .from("products")
          .select(
            "*,categories(id,name,slug)"
          )
          .eq(
            "active",
            true
          );


      const text =
        String(
          req.query.q ||
          ""
        ).trim();


      if (text) {

        q =
          q.or(
            `name.ilike.%${text}%,description.ilike.%${text}%`
          );

      }


      if (
        req.query.category
      ) {

        q =
          q.eq(
            "category_id",
            req.query.category
          );

      }


      switch (
        req.query.sort
      ) {

        case "price_asc":

          q =
            q.order(
              "price"
            );

          break;


        case "price_desc":

          q =
            q.order(
              "price",
              {
                ascending:
                  false
              }
            );

          break;


        case "newest":

          q =
            q.order(
              "created_at",
              {
                ascending:
                  false
              }
            );

          break;


        default:

          q =
            q
              .order(
                "featured",
                {
                  ascending:
                    false
                }
              )
              .order(
                "created_at",
                {
                  ascending:
                    false
                }
              );

      }


      const {
        data,
        error
      } =
        await q;


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        products:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.get(
  "/api/categories",
  async (
    _req,
    res
  ) => {

    try {

      need();

      const {
        data,
        error
      } =
        await sb
          .from("categories")
          .select("*")
          .order(
            "name"
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        categories:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.get(
  "/api/products/:id",
  async (
    req,
    res
  ) => {

    try {

      need();

      const [
        productResult,
        reviewResult
      ] =
        await Promise.all([

          sb
            .from("products")
            .select(
              "*,categories(id,name,slug),product_images(*)"
            )
            .eq(
              "id",
              req.params.id
            )
            .single(),

          sb
            .from("reviews")
            .select(
              "id,rating,comment,created_at,profiles(name,avatar_url)"
            )
            .eq(
              "product_id",
              req.params.id
            )
            .eq(
              "status",
              "approved"
            )
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            )

        ]);


      if (
        productResult.error
      ) {

        throw productResult.error;

      }


      res.json({

        ok:
          true,

        product:
          productResult.data,

        reviews:
          reviewResult.data || []

      });

    } catch {

      res.status(404).json({

        ok:
          false,

        message:
          "Produk tidak ditemukan."

      });

    }

  }
);


/* =========================================================
   WISHLIST
========================================================= */

app.get(
  "/api/wishlist",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("wishlists")
          .select(
            "id,product_id,created_at,products(*)"
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        items:
          (data || [])
            .filter(
              item =>
                item.products
            )
            .map(
              item =>
                item.products
            )

      });

    } catch (error) {

      console.error(
        "GET /api/wishlist:",
        error
      );

      res.status(500).json({

        ok:
          false,

        message:
          error?.message ||
          "Wishlist gagal dimuat."

      });

    }

  }
);


app.post(
  "/api/wishlist",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const productId =
        String(
          req.body?.productId ||
          ""
        ).trim();


      if (!productId) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Product ID diperlukan."

        });

      }


      const {
        data: product,
        error:
          productError
      } =
        await sb
          .from("products")
          .select(
            "id,active"
          )
          .eq(
            "id",
            productId
          )
          .maybeSingle();


      if (productError) {
        throw productError;
      }


      if (!product) {

        return res.status(404).json({

          ok:
            false,

          message:
            "Produk tidak ditemukan."

        });

      }


      if (!product.active) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Produk sedang tidak tersedia."

        });

      }


      const {
        data: existing,
        error:
          existingError
      } =
        await sb
          .from("wishlists")
          .select(
            "id"
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .eq(
            "product_id",
            productId
          );


      if (existingError) {
        throw existingError;
      }


      if (
        existing &&
        existing.length
      ) {

        const {
          error:
            deleteError
        } =
          await sb
            .from("wishlists")
            .delete()
            .eq(
              "user_id",
              x.auth.id
            )
            .eq(
              "product_id",
              productId
            );


        if (deleteError) {
          throw deleteError;
        }


        return res.json({

          ok:
            true,

          wishlisted:
            false

        });

      }


      const {
        error:
          insertError
      } =
        await sb
          .from("wishlists")
          .insert({

            user_id:
              x.auth.id,

            product_id:
              productId

          });


      if (insertError) {
        throw insertError;
      }


      return res.json({

        ok:
          true,

        wishlisted:
          true

      });

    } catch (error) {

      console.error(
        "POST /api/wishlist:",
        error
      );

      return res.status(400).json({

        ok:
          false,

        message:
          error?.message ||
          "Wishlist gagal diproses."

      });

    }

  }
);


/* =========================================================
   CART
========================================================= */

app.get(
  "/api/cart",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("cart_items")
          .select(
            "id,product_id,qty,products(*)"
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .order(
            "created_at"
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        items:
          data || []

      });

    } catch (error) {

      console.error(
        "GET /api/cart:",
        error
      );

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/cart",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const productId =
        String(
          req.body?.productId ||
          ""
        ).trim();


      const qty =
        Math.max(
          1,
          num(
            req.body?.qty,
            1
          )
        );


      if (!productId) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Product ID diperlukan."

        });

      }


      const {
        data: product,
        error:
          productError
      } =
        await sb
          .from("products")
          .select(
            "id,stock,active"
          )
          .eq(
            "id",
            productId
          )
          .maybeSingle();


      if (productError) {
        throw productError;
      }


      if (!product) {

        return res.status(404).json({

          ok:
            false,

          message:
            "Produk tidak ditemukan."

        });

      }


      if (!product.active) {

        return res.status(404).json({

          ok:
            false,

          message:
            "Produk tidak tersedia."

        });

      }


      if (
        Number(product.stock) <=
        0
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Stok produk habis."

        });

      }


      const {
        data: hit,
        error:
          hitError
      } =
        await sb
          .from("cart_items")
          .select(
            "id,qty"
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .eq(
            "product_id",
            productId
          )
          .maybeSingle();


      if (hitError) {
        throw hitError;
      }


      const next =
        Math.min(
          Number(product.stock),
          (
            Number(hit?.qty) ||
            0
          ) +
          qty
        );


      const result =
        hit

          ? await sb
              .from("cart_items")
              .update({
                qty:
                  next
              })
              .eq(
                "id",
                hit.id
              )
              .eq(
                "user_id",
                x.auth.id
              )

          : await sb
              .from("cart_items")
              .insert({

                user_id:
                  x.auth.id,

                product_id:
                  productId,

                qty:
                  next

              });


      if (result.error) {
        throw result.error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      console.error(
        "POST /api/cart:",
        error
      );

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.put(
  "/api/cart/:id",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const qty =
        num(
          req.body?.qty,
          1
        );


      if (qty <= 0) {

        const {
          error
        } =
          await sb
            .from("cart_items")
            .delete()
            .eq(
              "id",
              req.params.id
            )
            .eq(
              "user_id",
              x.auth.id
            );


        if (error) {
          throw error;
        }

      } else {

        const {
          error
        } =
          await sb
            .from("cart_items")
            .update({
              qty
            })
            .eq(
              "id",
              req.params.id
            )
            .eq(
              "user_id",
              x.auth.id
            );


        if (error) {
          throw error;
        }

      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.delete(
  "/api/cart/:id",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        error
      } =
        await sb
          .from("cart_items")
          .delete()
          .eq(
            "id",
            req.params.id
          )
          .eq(
            "user_id",
            x.auth.id
          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   VOUCHER
========================================================= */

async function voucher(
  code,
  subtotal
) {

  if (!code) {

    return {
      discount: 0,
      v: null
    };

  }


  const {
    data: v,
    error
  } =
    await sb
      .from("vouchers")
      .select("*")
      .eq(
        "code",
        String(
          code
        ).toUpperCase()
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  if (!v) {

    throw new Error(
      "Voucher tidak ditemukan."
    );

  }


  const now =
    Date.now();


  if (
    v.start_at &&
    new Date(
      v.start_at
    ).getTime() >
      now
  ) {

    throw new Error(
      "Voucher belum berlaku."
    );

  }


  if (
    v.end_at &&
    new Date(
      v.end_at
    ).getTime() <
      now
  ) {

    throw new Error(
      "Voucher sudah kedaluwarsa."
    );

  }


  if (
    Number(subtotal) <
    Number(v.min_order)
  ) {

    throw new Error(
      `Minimal belanja ${v.min_order}.`
    );

  }


  if (
    v.quota > 0 &&
    v.used_count >= v.quota
  ) {

    throw new Error(
      "Kuota voucher habis."
    );

  }


  let discount =
    v.type === "percent"
      ? Number(subtotal) *
        Number(v.value) /
        100
      : Number(v.value);


  if (
    v.max_discount > 0
  ) {

    discount =
      Math.min(
        discount,
        Number(
          v.max_discount
        )
      );

  }


  return {

    discount:
      Math.min(
        discount,
        Number(subtotal)
      ),

    v

  };

}


app.post(
  "/api/voucher/check",
  async (
    req,
    res
  ) => {

    try {

      need();

      const result =
        await voucher(
          req.body?.code,
          num(
            req.body?.subtotal
          )
        );


      res.json({

        ok:
          true,

        discount:
          result.discount,

        voucher:
          result.v

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   MIDTRANS PAYMENT
========================================================= */

function midtransAuthHeader() {

  if (!MIDTRANS_SERVER_KEY) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum dikonfigurasi."
    );
  }

  return `Basic ${Buffer.from(
    `${MIDTRANS_SERVER_KEY}:`
  ).toString("base64")}`;

}


async function midtransCreateSnap(payload) {

  const response =
    await fetch(
      MIDTRANS_SNAP_URL,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            midtransAuthHeader()
        },

        body:
          JSON.stringify(payload)
      }
    );

  const raw =
    await response.text();

  let data = null;

  try {
    data =
      raw
        ? JSON.parse(raw)
        : null;
  } catch {
    data = null;
  }

  if (!response.ok) {

    const message =
      data?.error_messages?.join(", ") ||
      data?.status_message ||
      `Midtrans gagal membuat transaksi (${response.status}).`;

    throw new Error(message);
  }

  return data;

}


/*
 * Membuat Snap Token untuk order yang SUDAH dibuat.
 *
 * Frontend hanya mengirim orderId.
 * Harga/gross_amount selalu diambil dari database,
 * bukan dipercaya dari browser.
 */
app.post(
  "/api/payment/create",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }

      const orderId =
        String(
          req.body?.orderId ||
          ""
        ).trim();

      if (!orderId) {

        return res.status(400).json({
          ok: false,
          message:
            "ID pesanan diperlukan."
        });

      }

      const {
        data: order,
        error: orderError
      } =
        await sb
          .from("orders")
          .select(
            "id,order_code,user_id,total,status,payment_method,payment_status,payment_expired_at"
          )
          .eq(
            "id",
            orderId
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      if (!order) {

        return res.status(404).json({
          ok: false,
          message:
            "Pesanan tidak ditemukan."
        });

      }

      if (
        order.payment_method !==
        "midtrans"
      ) {

        return res.status(400).json({
          ok: false,
          message:
            "Pesanan ini tidak menggunakan Midtrans."
        });

      }

      if (
        order.payment_status ===
        "paid"
      ) {

        return res.status(400).json({
          ok: false,
          message:
            "Pesanan ini sudah dibayar."
        });

      }

      const grossAmount =
        Math.round(
          num(
            order.total,
            0
          )
        );

      if (
        grossAmount <= 0
      ) {

        return res.status(400).json({
          ok: false,
          message:
            "Total pembayaran tidak valid."
        });

      }

      const payload = {

        transaction_details: {
          order_id:
            String(
              order.order_code
            ),
          gross_amount:
            grossAmount
        },

        credit_card: {
          secure: true
        },

        customer_details: {
          first_name:
            String(
              x.profile?.name ||
              x.auth.user_metadata?.name ||
              "Customer"
            ).trim(),

          email:
            x.auth.email || ""
        },

        page_expiry: {
          duration: 24,
          unit: "hours"
        },

        custom_field1:
          String(order.id)

      };

      const snap =
        await midtransCreateSnap(
          payload
        );

      if (!snap?.token) {

        throw new Error(
          "Midtrans tidak mengembalikan Snap Token."
        );

      }

      const {
        error: updateError
      } =
        await sb
          .from("orders")
          .update({

            snap_token:
              snap.token,

            payment_expired_at:
              new Date(
                Date.now() +
                24 * 60 * 60 * 1000
              ).toISOString(),

            payment_status:
              "pending"

          })
          .eq(
            "id",
            order.id
          )
          .eq(
            "user_id",
            x.auth.id
          );

      if (updateError) {
        throw updateError;
      }

      res.json({

        ok: true,

        orderId:
          order.id,

        orderCode:
          order.order_code,

        token:
          snap.token,

        redirectUrl:
          snap.redirect_url ||
          null

      });

    } catch (error) {

      console.error(
        "MIDTRANS CREATE ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        message:
          error.message ||
          "Gagal membuat pembayaran Midtrans."

      });

    }

  }
);


/*
 * Midtrans HTTP Notification.
 *
 * Signature:
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 *
 * Status pembayaran ditentukan dari notification server,
 * bukan dari callback browser.
 */
app.post(
  "/api/payment/notification",
  async (
    req,
    res
  ) => {

    try {

      need();

      if (!MIDTRANS_SERVER_KEY) {

        return res.status(500).json({
          ok: false,
          message:
            "MIDTRANS_SERVER_KEY belum dikonfigurasi."
        });

      }

      const notification =
        req.body || {};

      const orderCode =
        String(
          notification.order_id ||
          ""
        ).trim();

      const statusCode =
        String(
          notification.status_code ||
          ""
        ).trim();

      const grossAmount =
        String(
          notification.gross_amount ||
          ""
        ).trim();

      const signature =
        String(
          notification.signature_key ||
          ""
        ).trim();

      if (
        !orderCode ||
        !statusCode ||
        !grossAmount ||
        !signature
      ) {

        return res.status(400).json({
          ok: false,
          message:
            "Notification Midtrans tidak lengkap."
        });

      }

      const crypto =
        await import(
          "node:crypto"
        );

      const expected =
        crypto
          .createHash("sha512")
          .update(
            orderCode +
            statusCode +
            grossAmount +
            MIDTRANS_SERVER_KEY
          )
          .digest("hex");

      const signatureBuffer =
        Buffer.from(
          signature,
          "utf8"
        );

      const expectedBuffer =
        Buffer.from(
          expected,
          "utf8"
        );

      if (
        signatureBuffer.length !==
          expectedBuffer.length ||
        !crypto.timingSafeEqual(
          signatureBuffer,
          expectedBuffer
        )
      ) {

        return res.status(401).json({
          ok: false,
          message:
            "Signature notification tidak valid."
        });

      }

      const {
        data: order,
        error: findError
      } =
        await sb
          .from("orders")
          .select(
            "id,total,payment_status"
          )
          .eq(
            "order_code",
            orderCode
          )
          .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (!order) {

        return res.status(404).json({
          ok: false,
          message:
            "Order tidak ditemukan."
        });

      }

      const transactionStatus =
        String(
          notification.transaction_status ||
          ""
        ).toLowerCase();

      const fraudStatus =
        String(
          notification.fraud_status ||
          ""
        ).toLowerCase();

      let paymentStatus =
        "pending";

      if (
        [
          "settlement",
          "capture"
        ].includes(
          transactionStatus
        ) &&
        (
          !fraudStatus ||
          fraudStatus === "accept"
        )
      ) {

        paymentStatus =
          "paid";

      } else if (
        [
          "deny",
          "cancel"
        ].includes(
          transactionStatus
        )
      ) {

        paymentStatus =
          "failed";

      } else if (
        [
          "expire"
        ].includes(
          transactionStatus
        )
      ) {

        paymentStatus =
          "expired";

      }

      const update = {

        payment_status:
          paymentStatus,

        transaction_id:
          String(
            notification.transaction_id ||
            ""
          ) || null,

        payment_raw:
          notification

      };

      if (
        paymentStatus ===
        "paid"
      ) {

        update.paid_at =
          new Date().toISOString();

      }

      const {
        error: updateError
      } =
        await sb
          .from("orders")
          .update(
            update
          )
          .eq(
            "id",
            order.id
          );

      if (updateError) {
        throw updateError;
      }

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "MIDTRANS NOTIFICATION ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        message:
          error.message ||
          "Gagal memproses notification Midtrans."

      });

    }

  }
);


/* =========================================================
   CHECKOUT
   Supports:
   - Checkout from Cart
   - Buy Now / Direct Checkout
========================================================= */

app.post(
  "/api/checkout",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      /*
       * =====================================================
       * DIRECT CHECKOUT
       *
       * frontend:
       *
       * directProductId
       * directQty
       *
       * Kalau tidak ada:
       * checkout biasa dari cart_items
       * =====================================================
       */

      const directProductId =
        String(
          req.body?.directProductId ||
          ""
        ).trim();


      const directQty =
        Math.max(
          1,
          num(
            req.body?.directQty,
            1
          )
        );


      let checkoutItems = [];


      /* =====================================================
         BUY NOW
      ===================================================== */

      if (
        directProductId
      ) {

        checkoutItems = [
          {

            product_id:
              directProductId,

            qty:
              directQty

          }
        ];

      }


      /* =====================================================
         CART CHECKOUT
      ===================================================== */

      else {

        const {
          data: cart,
          error:
            cartError
        } =
          await sb
            .from("cart_items")
            .select(
              "product_id,qty"
            )
            .eq(
              "user_id",
              x.auth.id
            );


        if (cartError) {
          throw cartError;
        }


        checkoutItems =
          cart || [];

      }


      /* =====================================================
         NO ITEMS
      ===================================================== */

      if (
        !checkoutItems.length
      ) {

        throw new Error(
          "Tidak ada produk untuk checkout."
        );

      }


      /* =====================================================
         PRODUCT IDS
      ===================================================== */

      const productIds =
        checkoutItems.map(
          item =>
            item.product_id
        );


      /* =====================================================
         LOAD PRODUCTS
      ===================================================== */

      const {
        data: products,
        error:
          productError
      } =
        await sb
          .from("products")
          .select(
            "id,name,price,stock,active"
          )
          .in(
            "id",
            productIds
          );


      if (productError) {
        throw productError;
      }


      let subtotal =
        0;

      const items =
        [];


      /* =====================================================
         VALIDATE PRODUCTS
      ===================================================== */

      for (
        const item of checkoutItems
      ) {

        const product =
          products.find(
            row =>
              String(row.id) ===
              String(item.product_id)
          );


        if (!product) {

          throw new Error(
            "Produk tidak ditemukan."
          );

        }


        if (!product.active) {

          throw new Error(
            `Produk ${product.name} sudah tidak tersedia.`
          );

        }


        const qty =
          Number(
            item.qty
          );


        if (
          !Number.isFinite(qty) ||
          qty <= 0
        ) {

          throw new Error(
            `Quantity ${product.name} tidak valid.`
          );

        }


        if (
          qty >
          Number(product.stock)
        ) {

          throw new Error(
            `Stok ${product.name} tidak cukup.`
          );

        }


        subtotal +=
          Number(product.price) *
          qty;


        items.push({

          product_id:
            product.id,

          qty:
            qty

        });

      }


      /* =====================================================
         SHIPPING
      ===================================================== */

      const shipping =
        req.body?.shipping ===
        "express"
          ? 25000
          : 12000;


      /* =====================================================
         VOUCHER
      ===================================================== */

      const voucherData =
        await voucher(
          req.body?.voucherCode,
          subtotal
        );


      const discount =
        Number(
          voucherData.discount ||
          0
        );


      /* =====================================================
         TOTAL
      ===================================================== */

      const total =
        Math.max(
          0,
          subtotal +
          shipping -
          discount
        );


      /* =====================================================
         ORDER CODE
      ===================================================== */

      const code =
        `VEL-${Date.now()
          .toString(36)
          .toUpperCase()}-${Math.random()
            .toString(36)
            .slice(2, 5)
            .toUpperCase()}`;


      /* =====================================================
         CREATE ORDER
      ===================================================== */

      const {
        data: orderId,
        error:
          orderError
      } =
        await sb.rpc(
          "place_order",
          {

            p_user_id:
              x.auth.id,

            p_order_code:
              code,

            p_recipient:
              String(
                req.body?.recipient ||
                x.profile?.name ||
                ""
              ).trim(),

            p_phone:
              String(
                req.body?.phone ||
                x.profile?.phone ||
                ""
              ).trim(),

            p_address:
              String(
                req.body?.address ||
                x.profile?.address ||
                ""
              ).trim(),

            p_note:
              String(
                req.body?.note ||
                ""
              ).trim(),

            p_payment_method:
              String(
                req.body?.paymentMethod ||
                "cod"
              ),

            p_shipping_method:
              String(
                req.body?.shipping ||
                "regular"
              ),

            p_subtotal:
              subtotal,

            p_shipping_fee:
              shipping,

            p_discount:
              discount,

            p_total:
              total,

            p_voucher_id:
              voucherData.v?.id ||
              null,

            p_items:
              items

          }
        );


      if (orderError) {
        throw orderError;
      }


      if (!orderId) {

        throw new Error(
          "Pesanan gagal dibuat. ID order tidak dikembalikan."
        );

      }


      /*
       * ===================================================
       * IMPORTANT:
       *
       * Kalau Buy Now:
       * jangan menghapus cart_items.
       *
       * Kalau checkout normal:
       * behavior pembersihan cart mengikuti
       * function SQL place_order yang sekarang.
       * ===================================================
       */


      res.json({

        ok:
          true,

        orderId:
          orderId,

        orderCode:
          code,

        subtotal:
          subtotal,

        shipping:
          shipping,

        discount:
          discount,

        total:
          total

      });

    } catch (error) {

      console.error(
        "POST /api/checkout:",
        error
      );


      res.status(400).json({

        ok:
          false,

        message:
          error?.message ||
          "Checkout gagal."

      });

    }

  }
);


/* =========================================================
   ORDERS
========================================================= */

app.get(
  "/api/orders",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("orders")
          .select(
            "*,order_items(*)"
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        orders:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   DELETE CUSTOMER ORDER
========================================================= */

app.delete(
  "/api/orders/:id",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }

      const {
        data: order,
        error: orderError
      } =
        await sb
          .from("orders")
          .select(
            "id,status,order_code"
          )
          .eq(
            "id",
            req.params.id
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      if (!order) {
        return res.status(404).json({
          ok: false,
          message: "Pesanan tidak ditemukan."
        });
      }

      const { error: itemError } =
        await sb
          .from("order_items")
          .delete()
          .eq(
            "order_id",
            order.id
          );

      if (itemError) {
        throw itemError;
      }

      const { error: deleteError } =
        await sb
          .from("orders")
          .delete()
          .eq(
            "id",
            order.id
          )
          .eq(
            "user_id",
            x.auth.id
          );

      if (deleteError) {
        throw deleteError;
      }

      res.json({
        ok: true,
        message: "Pesanan berhasil dihapus."
      });

    } catch (error) {

      console.error(
        "DELETE /api/orders/:id:",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error?.message ||
          "Pesanan gagal dihapus."
      });

    }

  }
);


/* =========================================================
   REVIEW
========================================================= */

app.post(
  "/api/orders/:id/review",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data: order,
        error:
          orderError
      } =
        await sb
          .from("orders")
          .select(
            "id,status"
          )
          .eq(
            "id",
            req.params.id
          )
          .eq(
            "user_id",
            x.auth.id
          )
          .maybeSingle();


      if (orderError) {
        throw orderError;
      }


      if (
        !order ||
        order.status !==
          "completed"
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Review tersedia setelah order selesai."

        });

      }


      const productId =
        String(
          req.body?.productId ||
          ""
        ).trim();


      const {
        data: item,
        error:
          itemError
      } =
        await sb
          .from("order_items")
          .select(
            "product_id"
          )
          .eq(
            "order_id",
            order.id
          )
          .eq(
            "product_id",
            productId
          )
          .maybeSingle();


      if (itemError) {
        throw itemError;
      }


      if (!item) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Produk bukan bagian order ini."

        });

      }


      const result =
        await sb
          .from("reviews")
          .upsert(

            {

              user_id:
                x.auth.id,

              product_id:
                productId,

              order_id:
                order.id,

              rating:
                Math.max(
                  1,
                  Math.min(
                    5,
                    num(
                      req.body?.rating,
                      5
                    )
                  )
                ),

              comment:
                String(
                  req.body?.comment ||
                  ""
                ).slice(
                  0,
                  1000
                ),

              status:
                "pending"

            },

            {
              onConflict:
                "user_id,product_id,order_id"
            }

          );


      if (result.error) {
        throw result.error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get(
  "/api/notifications",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("notifications")
          .select("*")
          .eq(
            "user_id",
            x.auth.id
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          )
          .limit(50);


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        notifications:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/notifications/:id/read",
  async (
    req,
    res
  ) => {

    try {

      const x = await actor(req, res);

      if (!x) return;

      const { data, error } = await sb
        .from("notifications")
        .update({
          is_read: true
        })
        .eq("id", req.params.id)
        .eq("user_id", x.auth.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          ok: false,
          message: "Notifikasi tidak ditemukan."
        });
      }

      res.json({
        ok: true,
        message: "Notifikasi ditandai telah dibaca."
      });

    } catch (error) {

      res.status(400).json({
        ok: false,
        message: error?.message || "Gagal menandai notifikasi."
      });

    }

  }
);


app.delete(
  "/api/notifications/:id",
  async (
    req,
    res
  ) => {

    try {

      const x = await actor(req, res);

      if (!x) return;

      const { data, error } = await sb
        .from("notifications")
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", x.auth.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          ok: false,
          message: "Notifikasi tidak ditemukan."
        });
      }

      res.json({
        ok: true,
        message: "Notifikasi berhasil dihapus."
      });

    } catch (error) {

      res.status(400).json({
        ok: false,
        message: error?.message || "Gagal menghapus notifikasi."
      });

    }

  }
);


app.post(
  "/api/notifications/read",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        error
      } =
        await sb
          .from("notifications")
          .update({
            is_read:
              true
          })
          .eq(
            "user_id",
            x.auth.id
          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   CHAT
========================================================= */

app.get(
  "/api/chat",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("chat_messages")
          .select(
            "id,user_id,message,created_at,profiles(name,role)"
          )
          .eq(
            "room",
            "global"
          )
          .order(
            "created_at",
            {
              ascending:
                true
            }
          )
          .limit(100);


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        messages:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/chat",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const message =
        String(
          req.body?.message ||
          ""
        )
          .trim()
          .slice(
            0,
            500
          );


      if (!message) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Pesan kosong."

        });

      }


      const {
        error
      } =
        await sb
          .from("chat_messages")
          .insert({

            user_id:
              x.auth.id,

            room:
              "global",

            message

          });


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   PROFILE
========================================================= */

app.put(
  "/api/profile",
  async (
    req,
    res
  ) => {

    try {

      const x =
        await actor(
          req,
          res
        );

      if (!x) {
        return;
      }


      const profile = {

        name:
          String(
            req.body?.name ||
            ""
          ).slice(
            0,
            120
          ),

        phone:
          String(
            req.body?.phone ||
            ""
          ).slice(
            0,
            30
          ),

        address:
          String(
            req.body?.address ||
            ""
          ).slice(
            0,
            1000
          )

      };


      const {
        data,
        error
      } =
        await sb
          .from("profiles")
          .update(
            profile
          )
          .eq(
            "id",
            x.auth.id
          )
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        user:
          data

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get(
  "/api/admin/dashboard",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const [
        ordersResult,
        productsResult,
        customersResult,
        recentOrdersResult,
        dailyResult
      ] =
        await Promise.all([

          sb
            .from("orders")
            .select(
              "total,status"
            ),

          sb
            .from("products")
            .select(
              "id,stock,active"
            ),

          sb
            .from("profiles")
            .select(
              "id"
            )
            .eq(
              "role",
              "customer"
            ),

          sb
            .from("orders")
            .select(
              "id,order_code,total,status,created_at,profiles(name)"
            )
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            )
            .limit(8),

          sb
            .from("orders")
            .select(
              "created_at,total,status"
            )
            .gte(
              "created_at",
              new Date(
                Date.now() -
                29 *
                86400000
              ).toISOString()
            )
            .neq(
              "status",
              "cancelled"
            )

        ]);


      if (
        ordersResult.error
      ) {

        throw ordersResult.error;

      }


      const orders =
        ordersResult.data ||
        [];


      const revenue =
        orders
          .filter(
            row =>
              row.status !==
              "cancelled"
          )
          .reduce(
            (
              sum,
              row
            ) =>
              sum +
              Number(
                row.total
              ),
            0
          );


      res.json({

        ok:
          true,

        stats: {

          revenue,

          orders:
            orders.length,

          customers:
            customersResult.data
              ?.length ||
            0,

          products:
            productsResult.data
              ?.length ||
            0,

          pending:
            orders.filter(
              row =>
                [
                  "pending",
                  "paid",
                  "processing"
                ].includes(
                  row.status
                )
            ).length,

          lowStock:
            (
              productsResult.data ||
              []
            )
              .filter(
                row =>
                  row.active &&
                  row.stock <= 5
              ).length

        },

        recentOrders:
          recentOrdersResult.data ||
          [],

        daily:
          dailyResult.data ||
          []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN PRODUCTS
========================================================= */

app.get(
  "/api/admin/products",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("products")
          .select(
            "*,categories(name)"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        products:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/admin/products",
  upload.single("image"),
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      let image =
        String(
          req.body?.image ||
          ""
        );


      if (req.file) {

        const ext =
          req.file.mimetype
            .split(
              "/"
            )[1]
            .replace(
              "jpeg",
              "jpg"
            );


        const filePath =
          `products/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;


        const uploaded =
          await sb
            .storage
            .from(
              "products"
            )
            .upload(
              filePath,
              req.file.buffer,
              {

                contentType:
                  req.file.mimetype,

                upsert:
                  false

              }
            );


        if (
          uploaded.error
        ) {

          throw uploaded.error;

        }


        image =
          `${URL}/storage/v1/object/public/products/${filePath}`;

      }


      const payload = {

        name:
          String(
            req.body?.name ||
            ""
          ),

        slug:
          String(
            req.body?.slug ||
            ""
          ),

        description:
          String(
            req.body?.description ||
            ""
          ),

        price:
          num(
            req.body?.price
          ),

        stock:
          num(
            req.body?.stock
          ),

        unit:
          String(
            req.body?.unit ||
            "box"
          ),

        category_id:
          req.body?.category_id ||
          null,

        image,

        active:
          req.body?.active !==
          "false",

        featured:
          req.body?.featured ===
          "true"

      };


      const {
        data,
        error
      } =
        await sb
          .from("products")
          .insert(
            payload
          )
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        product:
          data

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.put(
  "/api/admin/products/:id",
  upload.single("image"),
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      let image =
        String(
          req.body?.image ||
          ""
        );


      if (req.file) {

        const ext =
          req.file.mimetype
            .split(
              "/"
            )[1]
            .replace(
              "jpeg",
              "jpg"
            );


        const filePath =
          `products/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;


        const uploaded =
          await sb
            .storage
            .from(
              "products"
            )
            .upload(
              filePath,
              req.file.buffer,
              {

                contentType:
                  req.file.mimetype,

                upsert:
                  false

              }
            );


        if (
          uploaded.error
        ) {

          throw uploaded.error;

        }


        image =
          `${URL}/storage/v1/object/public/products/${filePath}`;

      }


      const payload = {

        name:
          String(
            req.body?.name ||
            ""
          ),

        slug:
          String(
            req.body?.slug ||
            ""
          ),

        description:
          String(
            req.body?.description ||
            ""
          ),

        price:
          num(
            req.body?.price
          ),

        stock:
          num(
            req.body?.stock
          ),

        unit:
          String(
            req.body?.unit ||
            "box"
          ),

        category_id:
          req.body?.category_id ||
          null,

        image,

        active:
          req.body?.active !==
          "false",

        featured:
          req.body?.featured ===
          "true"

      };


      const {
        data,
        error
      } =
        await sb
          .from("products")
          .update(
            payload
          )
          .eq(
            "id",
            req.params.id
          )
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        product:
          data

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.delete(
  "/api/admin/products/:id",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        error
      } =
        await sb
          .from("products")
          .delete()
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN ORDERS
========================================================= */

app.get(
  "/api/admin/orders",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("orders")
          .select(
            "*,profiles(name,email,phone),order_items(*)"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        orders:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.delete(
  "/api/admin/orders/:id",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }

    try {

      const {
        data: order,
        error: orderError
      } =
        await sb
          .from("orders")
          .select(
            "id,order_code,status"
          )
          .eq(
            "id",
            req.params.id
          )
          .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      if (!order) {
        return res.status(404).json({
          ok: false,
          message: "Pesanan tidak ditemukan."
        });
      }

      const { error: itemError } =
        await sb
          .from("order_items")
          .delete()
          .eq(
            "order_id",
            order.id
          );

      if (itemError) {
        throw itemError;
      }

      const { error: deleteError } =
        await sb
          .from("orders")
          .delete()
          .eq(
            "id",
            order.id
          );

      if (deleteError) {
        throw deleteError;
      }

      res.json({
        ok: true,
        message:
          `Pesanan ${order.order_code} berhasil dihapus.`
      });

    } catch (error) {

      console.error(
        "DELETE /api/admin/orders/:id:",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error?.message ||
          "Pesanan gagal dihapus."
      });

    }

  }
);


app.put(
  "/api/admin/orders/:id",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const status =
        String(
          req.body?.status ||
          ""
        );


      const allowedStatuses = [

        "pending",

        "paid",

        "processing",

        "shipped",

        "completed",

        "cancelled"

      ];


      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Status tidak valid."

        });

      }


      const {
        data: order,
        error
      } =
        await sb
          .from("orders")
          .update({
            status
          })
          .eq(
            "id",
            req.params.id
          )
          .select(
            "id,user_id,order_code"
          )
          .single();


      if (error) {
        throw error;
      }


      await sb
        .from("notifications")
        .insert({

          user_id:
            order.user_id,

          title:
            `Status ${order.order_code} berubah`,

          message:
            `Pesanan kamu sekarang ${status}.`,

          type:
            "order"

        });


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN CUSTOMERS
========================================================= */

app.get(
  "/api/admin/customers",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("profiles")
          .select("*")
          .eq(
            "role",
            "customer"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        customers:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN VOUCHERS
========================================================= */

app.get(
  "/api/admin/vouchers",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("vouchers")
          .select("*")
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        vouchers:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/admin/vouchers",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const payload = {

        code:
          String(
            req.body?.code ||
            ""
          ).toUpperCase(),

        type:
          req.body?.type ===
          "fixed"
            ? "fixed"
            : "percent",

        value:
          num(
            req.body?.value
          ),

        min_order:
          num(
            req.body?.min_order
          ),

        max_discount:
          num(
            req.body?.max_discount
          ),

        quota:
          num(
            req.body?.quota
          ),

        end_at:
          req.body?.end_at ||
          null,

        active:
          true

      };


      const {
        data,
        error
      } =
        await sb
          .from("vouchers")
          .insert(
            payload
          )
          .select()
          .single();


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        voucher:
          data

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.delete(
  "/api/admin/vouchers/:id",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        error
      } =
        await sb
          .from("vouchers")
          .delete()
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN REVIEWS
========================================================= */

app.get(
  "/api/admin/reviews",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("reviews")
          .select(
            "*,profiles(name,email),products(name)"
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        reviews:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.put(
  "/api/admin/reviews/:id",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const status =
        [
          "pending",
          "approved",
          "rejected"
        ].includes(
          req.body?.status
        )
          ? req.body.status
          : "pending";


      const {
        error
      } =
        await sb
          .from("reviews")
          .update({
            status
          })
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN APPEARANCE / HERO
========================================================= */

app.get(
  "/api/admin/appearance",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("settings")
          .select("*")
          .eq(
            "name",
            "homepage_hero"
          )
          .maybeSingle();


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        heroImage:
          data?.value ||
          ""

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.post(
  "/api/admin/appearance/hero",
  upload.single("hero"),
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      if (!req.file) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Pilih foto Hero terlebih dahulu."

        });

      }


      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];


      if (
        !allowed.includes(
          req.file.mimetype
        )
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "Format harus JPG, PNG, atau WEBP."

        });

      }


      const ext =
        req.file.mimetype ===
        "image/jpeg"

          ? "jpg"

          : req.file.mimetype ===
            "image/png"

              ? "png"

              : "webp";


      const filePath =
        `hero/homepage-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;


      const bucket =
        "site-assets";


      const uploaded =
        await sb
          .storage
          .from(
            bucket
          )
          .upload(
            filePath,
            req.file.buffer,
            {

              contentType:
                req.file.mimetype,

              upsert:
                false

            }
          );


      if (
        uploaded.error
      ) {

        throw uploaded.error;

      }


      const imageUrl =
        `${URL}/storage/v1/object/public/${bucket}/${filePath}`;


      const {
        error:
          saveError
      } =
        await sb
          .from("settings")
          .upsert(

            {

              name:
                "homepage_hero",

              value:
                imageUrl

            },

            {

              onConflict:
                "name"

            }

          );


      if (saveError) {
        throw saveError;
      }


      res.json({

        ok:
          true,

        heroImage:
          imageUrl

      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.delete(
  "/api/admin/appearance/hero",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        error
      } =
        await sb
          .from("settings")
          .upsert(

            {

              name:
                "homepage_hero",

              value:
                ""

            },

            {

              onConflict:
                "name"

            }

          );


      if (error) {
        throw error;
      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN SETTINGS
========================================================= */

app.get(
  "/api/admin/settings",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("settings")
          .select("*")
          .order(
            "name"
          );


      if (error) {
        throw error;
      }


      res.json({

        ok:
          true,

        settings:
          data || []

      });

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


app.put(
  "/api/admin/settings",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      for (
        const [
          name,
          value
        ]
        of Object.entries(
          req.body || {}
        )
      ) {

        const {
          error
        } =
          await sb
            .from("settings")
            .upsert(

              {

                name,

                value:
                  String(
                    value
                  )

              },

              {

                onConflict:
                  "name"

              }

            );


        if (error) {
          throw error;
        }

      }


      res.json({
        ok:
          true
      });

    } catch (error) {

      res.status(400).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   ADMIN REPORT
========================================================= */

app.get(
  "/api/admin/report.csv",
  async (
    req,
    res
  ) => {

    const x =
      await admin(
        req,
        res
      );

    if (!x) {
      return;
    }


    try {

      const {
        data,
        error
      } =
        await sb
          .from("orders")
          .select(
            "order_code,created_at,status,total,payment_method,shipping_method,profiles(name,email)"
          );


      if (error) {
        throw error;
      }


      const rows = [

        [
          "order_code",
          "created_at",
          "status",
          "total",
          "payment_method",
          "shipping_method",
          "customer",
          "email"
        ],

        ...(data || [])
          .map(
            order => [

              order.order_code,

              order.created_at,

              order.status,

              order.total,

              order.payment_method,

              order.shipping_method,

              order.profiles?.name ||
                "",

              order.profiles?.email ||
                ""

            ]
          )

      ];


      const csv =
        rows
          .map(
            row =>
              row
                .map(
                  value =>
                    `"${String(
                      value ??
                      ""
                    ).replaceAll(
                      '"',
                      '""'
                    )}"`
                )
                .join(",")
          )
          .join("\n");


      res.setHeader(
        "Content-Type",
        "text/csv"
      );


      res.setHeader(
        "Content-Disposition",
        "attachment; filename=velora-orders.csv"
      );


      res.send(
        csv
      );

    } catch (error) {

      res.status(500).json({

        ok:
          false,

        message:
          error.message

      });

    }

  }
);


/* =========================================================
   API 404
========================================================= */

app.use(
  "/api",
  (_req, res) => {

    res.status(404).json({

      ok:
        false,

      message:
        "API endpoint tidak ditemukan."

    });

  }
);


/* =========================================================
   SPA FALLBACK
========================================================= */

app.use(
  (
    _req,
    res
  ) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/* =========================================================
   EXPORT / START
========================================================= */

export default app;


if (
  process.env.VERCEL !==
  "1"
) {

  app.listen(
    PORT,
    () => {

      console.log(
        `VELORA on http://localhost:${PORT}`
      );

    }
  );

}