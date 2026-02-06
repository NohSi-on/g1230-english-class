-- 1. Create the allowed_users table
create table if not exists allowed_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security
alter table allowed_users enable row level security;

-- 3. Create RLS Policies
-- Allow anyone to read the list (needed so the frontend can check if the current user is allowed)
create policy "Allow public read access" on allowed_users for select using (true);

-- 4. Insert your email (Whitelist)
insert into allowed_users (email) values ('osang1230@gmail.com')
on conflict (email) do nothing;
