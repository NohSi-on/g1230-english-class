-- 1. Upgrade allowed_users table
alter table allowed_users 
add column if not exists role text default 'teacher'; -- 'admin', 'teacher'

alter table allowed_users 
add column if not exists name text;

-- Set specific user as admin (replace with actual logic if needed)
update allowed_users 
set role = 'admin', name = '관리자'
where email = 'osang1230@gmail.com';

-- 2. Create Classes table
create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  teacher_id uuid not null, -- references auth.users(id) technically, but we might just store the UUID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Class Students Link
create table if not exists class_students (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, student_id)
);

-- 4. Create Class Books Link
create table if not exists class_books (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, book_id)
);
