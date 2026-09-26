# VELORA Cookies — Node.js + Supabase + Vercel

Full-stack e-commerce rebuilt from zero for a modern purple + white experience.

## Stack
- Node.js 22+
- Express 5
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Vanilla HTML/CSS/JS
- Lucide SVG
- Chart.js
- Vercel

Vercel serves the static frontend and runs the Express API as a serverless function. Supabase provides persistent database, authentication, object storage, and realtime.

## Included features
Customer: landing page, product catalog, search, category filter, sorting, product detail, stock, cart, quantity update, wishlist, email/password auth, Google OAuth-ready UI, profile, address, checkout, voucher validation, shipping method, payment method demo flow, order history, order status, notifications, realtime notifications, global realtime chat, review submission after completed order, responsive UI, animated UI.

Admin/Owner: dashboard KPIs, animated revenue chart, order chart, analytics, product CRUD, product image upload to Storage, stock and active/featured flags, order status update, customer list, voucher CRUD, review moderation, chat monitor, store settings, CSV report.

## Supabase setup
Run in Supabase SQL Editor:
1. `supabase/schema.sql`
2. `supabase/rls.sql`

Register a user in the app, then promote the account:

```sql
update public.profiles set role='owner' where email='YOUR_EMAIL';
```

Enable Email provider in Authentication. For Google, enable the Google provider and configure the redirect URL using the deployed Vercel origin.

## Local setup

```bash
npm install
copy .env.example .env
npm start
```

Windows PowerShell equivalent for copying:

```powershell
Copy-Item .env.example .env
```

Then open `http://localhost:3000`.

`.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
APP_URL=http://localhost:3000
STORE_NAME=VELORA Cookies
STORE_EMAIL=veloracookies1999@gmail.com
STORE_PHONE=+62 858-6430-6671
```

**Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser or GitHub.**

## Vercel tutorial
1. Create a GitHub repository and push this folder.
2. In Vercel, create a new project from the GitHub repository.
3. Add these Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL`
   - `STORE_NAME`
   - `STORE_EMAIL`
   - `STORE_PHONE`
4. Deploy.
5. Open your Vercel URL.
6. In Supabase Auth settings, configure the deployed origin/redirect URL.
7. Register your owner account and promote it with the SQL above.
8. Test customer flows, then admin flows.

## Realtime
Global chat is a real Supabase Realtime subscription using Postgres Changes on `chat_messages`; notifications also subscribe through Realtime. `supabase/rls.sql` adds the tables to `supabase_realtime`.

## Product images
Admin upload accepts JPG, PNG, WEBP up to 4 MB. Images are stored in Supabase Storage bucket `products` and the public URL is stored on the product record.

## Payment note
Payment methods are demo/manual options. No real payment gateway is connected in this package.

## Important Vercel note
Do not write persistent files to the server filesystem. Product uploads go to Supabase Storage. Server-side state lives in Supabase/Postgres.
