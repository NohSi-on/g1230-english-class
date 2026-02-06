-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Enum for Book Categories
create type book_category as enum ('GRAMMAR', 'READING', 'WORD', 'LISTENING');

-- 2. Books Table (교재)
create table books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category book_category not null default 'READING',
  target_grade text, -- e.g. "중2", "고1" (Difficulty Context)
  cover_url text, -- WebP thumbnail URL
  pdf_url text,   -- Original PDF URL
  is_published boolean default false,
  pdf_page_offset integer default 0,
  page_mapping jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Questions Table (문제 데이터 - OCR/Editor data)
create table questions (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books(id) on delete cascade not null,
  page_number integer not null,
  -- JSON Structure for 'content':
  -- {
  --   "items": [
  --     {
  --       "id": 1,
  --       "type": "SUBJECT_VERB",  <-- (System Type)
  --       "concept": "동명사의 용법", <-- [NEW] Granular Concept/Topic
  --       "question": "She ___ to school.",
  --       "answer": "goes",
  --       "options": ["go", "goes"],
  --       "explanation": "..."
  --     }
  --   ]
  -- }
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Students Table (학생 관리)
create table students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  grade text, -- e.g. "중1", "초6"
  parent_phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Assessments Table (성적/오답 기록)
create table assessments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  score integer default 0,
  details jsonb, -- { "wrong_answers": [1, 5, 12], "analysis_by_type": { "GRAMMAR": -10, ... } }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) - Optional for now, but good practice
alter table books enable row level security;
alter table questions enable row level security;
alter table students enable row level security;
alter table assessments enable row level security;

-- Create policies (Allow public read for now to simplify dev, secure later)
create policy "Allow public read books" on books for select using (true);
create policy "Allow public read questions" on questions for select using (true);
create policy "Allow public read students" on students for select using (true);
create policy "Allow public read assessments" on assessments for select using (true);

-- Allow insert/update for everyone (DEV ONLY - REMOVE IN PRODUCTION)
create policy "Allow public insert books" on books for insert with check (true);
create policy "Allow public insert questions" on questions for insert with check (true);
create policy "Allow public insert students" on students for insert with check (true);
create policy "Allow public insert assessments" on assessments for insert with check (true);
create policy "Allow public update assessments" on assessments for update using (true);
