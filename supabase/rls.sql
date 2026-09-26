alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.wishlists enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_usages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_messages enable row level security;
alter table public.settings enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_read on public.profiles; create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists profiles_update on public.profiles; create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() or public.is_staff(auth.uid())) with check(id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists product_public_read on public.products; create policy product_public_read on public.products for select to anon,authenticated using(active=true or public.is_staff(auth.uid()));
drop policy if exists category_public_read on public.categories; create policy category_public_read on public.categories for select to anon,authenticated using(true);
drop policy if exists product_images_read on public.product_images; create policy product_images_read on public.product_images for select to anon,authenticated using(true);
drop policy if exists wish_self on public.wishlists; create policy wish_self on public.wishlists for all to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid())) with check(user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists cart_self on public.cart_items; create policy cart_self on public.cart_items for all to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid())) with check(user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists order_self on public.orders; create policy order_self on public.orders for select to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists order_item_self on public.order_items; create policy order_item_self on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and(o.user_id=auth.uid() or public.is_staff(auth.uid()))));
drop policy if exists review_read on public.reviews; create policy review_read on public.reviews for select to anon,authenticated using(status='approved' or user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists review_insert on public.reviews; create policy review_insert on public.reviews for insert to authenticated with check(user_id=auth.uid());
drop policy if exists review_update on public.reviews; create policy review_update on public.reviews for update to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid())) with check(user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists notif_self on public.notifications; create policy notif_self on public.notifications for all to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid())) with check(user_id=auth.uid() or public.is_staff(auth.uid()));
drop policy if exists chat_read on public.chat_messages; create policy chat_read on public.chat_messages for select to authenticated using(true);
drop policy if exists chat_insert on public.chat_messages; create policy chat_insert on public.chat_messages for insert to authenticated with check(user_id=auth.uid());
drop policy if exists settings_read on public.settings; create policy settings_read on public.settings for select to anon,authenticated using(true);

-- Storage image access
insert into storage.buckets(id,name,public) values('products','products',true) on conflict(id) do nothing;
drop policy if exists products_object_read on storage.objects; create policy products_object_read on storage.objects for select to public using(bucket_id='products');
drop policy if exists products_object_insert on storage.objects; create policy products_object_insert on storage.objects for insert to authenticated with check(bucket_id='products');

-- Realtime publication. If a table is already present, the exception is ignored.
do $$ begin begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end; begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end; begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end; begin alter publication supabase_realtime add table public.products; exception when duplicate_object then null; end; end $$;
