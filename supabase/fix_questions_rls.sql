
-- Fix RLS Policies for Questions table
-- Cause of duplication: DELETE/UPDATE might be failing silently due to RLS, while INSERT succeeds.

-- 1. Drop existing policies to be clean
drop policy if exists "Allow public read questions" on questions;
drop policy if exists "Allow public insert questions" on questions;
drop policy if exists "Allow public update questions" on questions;
drop policy if exists "Allow public delete questions" on questions;

-- 2. Create comprehensive policies
create policy "Allow public read questions" on questions for select using (true);
create policy "Allow public insert questions" on questions for insert with check (true);
create policy "Allow public update questions" on questions for update using (true);
create policy "Allow public delete questions" on questions for delete using (true);

-- 3. Ensure RLS is enabled
alter table questions enable row level security;

-- 4. Reload schema cache just in case
NOTIFY pgrst, 'reload schema';
