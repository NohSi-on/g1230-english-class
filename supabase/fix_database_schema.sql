-- 1. FIX: Add 'status' column to students table if it doesn't exist
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'students' and column_name = 'status') then
        alter table students add column status text default 'ACTIVE';
    end if;
end $$;

-- 2. FIX: Upgrade allowed_users table (Roles)
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'allowed_users' and column_name = 'role') then
        alter table allowed_users add column role text default 'teacher';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'allowed_users' and column_name = 'name') then
        alter table allowed_users add column name text;
    end if;
end $$;

-- 3. FIX: Ensure Admin User Exists
update allowed_users 
set role = 'admin', name = '관리자'
where email = 'osang1230@gmail.com';

-- 4. FIX: Create tables if not exist
create table if not exists classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  teacher_id uuid not null, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists class_students (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, student_id)
);

create table if not exists class_books (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, book_id)
);

-- 5. CRITICAL FIX: Add Unique Constraint to assessments to allow Bulk Assignment
-- First, remove any potential duplicates to allow constraint creation
DELETE FROM assessments a USING (
      SELECT MIN(ctid) as ctid, student_id, book_id
      FROM assessments 
      GROUP BY student_id, book_id HAVING COUNT(*) > 1
      ) b
      WHERE a.student_id = b.student_id 
      AND a.book_id = b.book_id 
      AND a.ctid <> b.ctid;

-- Now add the constraint
alter table assessments 
drop constraint if exists assessments_student_id_book_id_key;

alter table assessments 
add constraint assessments_student_id_book_id_key unique (student_id, book_id);

-- 6. ENABLE RLS
alter table classes enable row level security;
alter table class_students enable row level security;
alter table class_books enable row level security;

-- Policies (DROP first to prevent "already exists" error)
drop policy if exists "Allow public access to classes" on classes;
create policy "Allow public access to classes" on classes for all using (true) with check (true);

drop policy if exists "Allow public access to class_students" on class_students;
create policy "Allow public access to class_students" on class_students for all using (true) with check (true);

drop policy if exists "Allow public access to class_books" on class_books;
create policy "Allow public access to class_books" on class_books for all using (true) with check (true);
