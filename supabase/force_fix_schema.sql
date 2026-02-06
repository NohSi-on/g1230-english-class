-- 1. Ensure column exists (Idempotent)
alter table books 
add column if not exists target_grade text;

-- 2. Force Supabase to reload the schema cache
-- This fixes the 'Could not find the target_grade column in the schema cache' error
NOTIFY pgrst, 'reload schema';
