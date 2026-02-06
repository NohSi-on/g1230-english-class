-- 1. Create Storage Buckets
insert into storage.buckets (id, name, public)
values 
  ('textbooks', 'textbooks', true),
  ('covers', 'covers', true);

-- 2. Security Policies (Allow Public Upload/Read for simplicty in MVP)
-- Textbooks Bucket
create policy "Public Access Textbooks"
on storage.objects for select
using ( bucket_id = 'textbooks' );

create policy "Public Insert Textbooks"
on storage.objects for insert
with check ( bucket_id = 'textbooks' );

create policy "Public Update Textbooks"
on storage.objects for update
with check ( bucket_id = 'textbooks' );

-- Covers Bucket
create policy "Public Access Covers"
on storage.objects for select
using ( bucket_id = 'covers' );

create policy "Public Insert Covers"
on storage.objects for insert
with check ( bucket_id = 'covers' );

create policy "Public Update Covers"
on storage.objects for update
with check ( bucket_id = 'covers' );
