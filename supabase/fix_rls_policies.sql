-- Fix RLS Policies for Books table
-- The previous policies might have only allowed SELECT/INSERT, but not UPDATE/DELETE
-- This fixes the 'PGRST116: The result contains 0 rows' error during update

-- 1. Drop existing policies to be clean
drop policy if exists "Allow public read books" on books;
drop policy if exists "Allow public insert books" on books;
drop policy if exists "Allow public update books" on books;
drop policy if exists "Allow public delete books" on books;

-- 2. Create comprehensive policies
create policy "Allow public read books" on books for select using (true);
create policy "Allow public insert books" on books for insert with check (true);
create policy "Allow public update books" on books for update using (true);
create policy "Allow public delete books" on books for delete using (true);

-- 3. Ensure RLS is enabled
alter table books enable row level security;

-- 4. Reload schema cache just in case
NOTIFY pgrst, 'reload schema';
