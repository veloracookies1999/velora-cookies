# Supabase quick setup

1. Create a Supabase project.
2. SQL Editor → run `schema.sql`.
3. SQL Editor → run `rls.sql`.
4. Authentication → Providers → Email: enable.
5. Optional: Google provider → enable and configure its OAuth credentials.
6. Register your account in VELORA.
7. Promote owner:

```sql
update public.profiles set role='owner' where email='YOUR_EMAIL';
```

The database seed creates categories, six sample products, vouchers, settings, and the Storage bucket `products`.
