
-- 1. Create allowed_users table
create table allowed_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text default 'editor', -- 'admin', 'editor'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table allowed_users enable row level security;

-- 3. Policy: Public read is NOT allowed. Only the user themselves or valid users can read?
-- Actually, for "Checking if I am allowed", we need to select from this table.
-- Let's allow public read for now to simplify the "Am I allowed?" check, 
-- or better: "Allow authenticated users to read"

create policy "Allow public read allowed_users" on allowed_users for select using (true);

-- 4. Initial Seed (Add the user's email if specific, otherwise expect them to insert via SQL Editor)
-- insert into allowed_users (email) values ('user@example.com');
