-- Add target_grade column to books table
-- This is required for the new 'Target Grade' feature in Edit Mode

alter table books 
add column if not exists target_grade text;

-- Notify that schema cache reload might be needed (handled by Supabase usually)
comment on column books.target_grade is 'Target grade level (e.g. 중2, 고1) for difficulty context';
