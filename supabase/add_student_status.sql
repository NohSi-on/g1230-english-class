-- Add status column to students table
-- Values: 'ACTIVE' (재원), 'WITHDRAWN' (휴원)
alter table students 
add column if not exists status text default 'ACTIVE';
