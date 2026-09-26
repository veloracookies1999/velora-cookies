create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum('customer','owner','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum('pending','paid','processing','shipped','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.voucher_type as enum('percent','fixed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.review_status as enum('pending','approved','rejected'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,name text not null default 'Customer',email text unique,phone text default '',address text default '',avatar_url text default '',role public.app_role not null default 'customer',active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.categories(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique,created_at timestamptz not null default now());
create table if not exists public.products(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,description text default '',price numeric(12,2) not null default 0,stock int not null default 0 check(stock>=0),unit text not null default 'box',category_id uuid references public.categories(id) on delete set null,image text default '',active boolean not null default true,featured boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.product_images(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id) on delete cascade,image_url text not null,sort_order int default 0,created_at timestamptz not null default now());
create table if not exists public.wishlists(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,product_id uuid not null references public.products(id) on delete cascade,created_at timestamptz not null default now(),unique(user_id,product_id));
create table if not exists public.cart_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,product_id uuid not null references public.products(id) on delete cascade,qty int not null default 1 check(qty>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,product_id));
create table if not exists public.vouchers(id uuid primary key default gen_random_uuid(),code text not null unique,type public.voucher_type not null,value numeric(12,2) not null default 0,min_order numeric(12,2) default 0,max_discount numeric(12,2) default 0,quota int default 0,used_count int default 0,active boolean default true,start_at timestamptz,end_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.orders(id uuid primary key default gen_random_uuid(),order_code text not null unique,user_id uuid not null references public.profiles(id) on delete restrict,recipient text not null,phone text not null,address text not null,note text default '',payment_method text not null,shipping_method text not null,subtotal numeric(12,2) not null,shipping_fee numeric(12,2) not null,discount numeric(12,2) not null default 0,total numeric(12,2) not null,voucher_id uuid references public.vouchers(id) on delete set null,status public.order_status not null default 'pending',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,product_id uuid references public.products(id) on delete set null,product_name text not null,price numeric(12,2) not null,qty int not null,line_total numeric(12,2) not null);
create table if not exists public.voucher_usages(id uuid primary key default gen_random_uuid(),voucher_id uuid not null references public.vouchers(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,order_id uuid references public.orders(id) on delete set null,created_at timestamptz not null default now(),unique(voucher_id,user_id,order_id));
create table if not exists public.reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,product_id uuid not null references public.products(id) on delete cascade,order_id uuid not null references public.orders(id) on delete cascade,rating int not null check(rating between 1 and 5),comment text default '',status public.review_status not null default 'pending',created_at timestamptz not null default now(),unique(user_id,product_id,order_id));
create table if not exists public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,message text not null,type text default 'system',is_read boolean default false,created_at timestamptz not null default now());
create table if not exists public.chat_messages(id bigint generated by default as identity primary key,user_id uuid not null references public.profiles(id) on delete cascade,room text default 'global',message text not null check(char_length(message) between 1 and 500),created_at timestamptz not null default now());
create table if not exists public.settings(name text primary key,value text not null default '');
create table if not exists public.activity_logs(id bigint generated by default as identity primary key,actor_id uuid references public.profiles(id) on delete set null,action text not null,entity text,entity_id text,metadata jsonb default '{}'::jsonb,created_at timestamptz not null default now());

create index if not exists ix_products_category on public.products(category_id);
create index if not exists ix_orders_user on public.orders(user_id);
create index if not exists ix_notifications_user on public.notifications(user_id,created_at);
create index if not exists ix_chat_room on public.chat_messages(room,created_at);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,name,email,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(coalesce(new.email,'customer'),'@',1)),new.email,coalesce(new.raw_user_meta_data->>'avatar_url','')) on conflict(id) do update set email=excluded.email; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff(uid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=uid and role in('admin','owner') and active=true); $$;

create or replace function public.place_order(p_user_id uuid,p_order_code text,p_recipient text,p_phone text,p_address text,p_note text,p_payment_method text,p_shipping_method text,p_subtotal numeric,p_shipping_fee numeric,p_discount numeric,p_total numeric,p_voucher_id uuid,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; item jsonb; pr public.products%rowtype; q int;
begin
 insert into public.orders(order_code,user_id,recipient,phone,address,note,payment_method,shipping_method,subtotal,shipping_fee,discount,total,voucher_id) values(p_order_code,p_user_id,p_recipient,p_phone,p_address,p_note,p_payment_method,p_shipping_method,p_subtotal,p_shipping_fee,p_discount,p_total,p_voucher_id) returning id into oid;
 for item in select * from jsonb_array_elements(p_items) loop
  q:=greatest(1,(item->>'qty')::int);select * into pr from public.products where id=(item->>'product_id')::uuid for update;
  if not found or not pr.active then raise exception 'Produk tidak tersedia.'; end if;
  if pr.stock<q then raise exception 'Stok produk % tidak cukup.',pr.name; end if;
  insert into public.order_items(order_id,product_id,product_name,price,qty,line_total) values(oid,pr.id,pr.name,pr.price,q,pr.price*q);
  update public.products set stock=stock-q,updated_at=now() where id=pr.id;
 end loop;
 delete from public.cart_items where user_id=p_user_id;
 if p_voucher_id is not null then insert into public.voucher_usages(voucher_id,user_id,order_id) values(p_voucher_id,p_user_id,oid) on conflict do nothing; update public.vouchers set used_count=used_count+1 where id=p_voucher_id; end if;
 insert into public.notifications(user_id,title,message,type) values(p_user_id,'Pesanan berhasil dibuat',format('Pesanan %s menunggu diproses.',p_order_code),'order');
 return oid;
end; $$;

insert into public.categories(name,slug) values('Classic','classic'),('Chocolate','chocolate'),('Premium','premium'),('Gift Box','gift-box') on conflict(slug) do nothing;
insert into public.products(name,slug,description,price,stock,unit,category_id,active,featured)
select x.name,x.slug,x.description,x.price,x.stock,'box',c.id,true,x.featured from (values
('Classic Chocolate Chip','classic-chocolate-chip','Chewy cookie dengan dark chocolate chips dan vanilla.',18000,40,'classic',true),
('Red Velvet Cream','red-velvet-cream','Red velvet cookie dengan white chocolate dan cream.',22000,30,'premium',true),
('Double Dark Cocoa','double-dark-cocoa','Cocoa cookie intens dengan dark chocolate chunks.',20000,35,'chocolate',true),
('Pistachio Velvet','pistachio-velvet','Pistachio premium dan white chocolate.',25000,20,'premium',true),
('Sea Salt Caramel','sea-salt-caramel','Caramel lembut dengan sea salt.',21000,28,'chocolate',false),
('Biscoff Crunch','biscoff-crunch','Cookie crunchy-chewy dengan crumb speculoos.',23000,25,'chocolate',false)
) as x(name,slug,description,price,stock,cat_slug,featured) join public.categories c on c.slug=x.cat_slug on conflict(slug) do nothing;
insert into public.vouchers(code,type,value,min_order,max_discount,quota) values('WELCOME10','percent',10,50000,30000,0),('VELORA20','fixed',20000,120000,0,100),('SWEET15','percent',15,150000,40000,50) on conflict(code) do nothing;
insert into public.settings(name,value) values('store_name','VELORA Cookies'),('store_email','veloracookies1999@gmail.com'),('store_phone','+62 858-6430-6671') on conflict(name) do nothing;
insert into storage.buckets(id,name,public) values('products','products',true) on conflict(id) do nothing;
