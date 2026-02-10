-- Create vocab_progress table for tracking student vocabulary learning
create table if not exists vocab_progress (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  vocab_set_id text not null, -- e.g., "day-01"
  mode text not null check (mode in ('MEMORIZE', 'RECALL', 'SPELL')),
  word_index integer not null,
  word text not null,
  is_correct boolean,
  attempts integer default 1,
  studied_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for fast queries
create index if not exists idx_vocab_progress_student on vocab_progress(student_id);
create index if not exists idx_vocab_progress_book on vocab_progress(book_id);
create index if not exists idx_vocab_progress_set on vocab_progress(vocab_set_id);
create index if not exists idx_vocab_progress_studied_at on vocab_progress(studied_at desc);

-- Enable RLS
alter table vocab_progress enable row level security;

-- Policy: Students can only see their own progress
create policy "Students can view own progress"
  on vocab_progress for select
  using (student_id = (current_setting('app.current_student_id', true))::uuid);

-- Policy: Students can insert their own progress
create policy "Students can insert own progress"
  on vocab_progress for insert
  with check (student_id = (current_setting('app.current_student_id', true))::uuid);

-- Policy: Teachers can view their students' progress (via classes)
create policy "Teachers can view assigned students progress"
  on vocab_progress for select
  using (
    exists (
      select 1 from class_students cs
      join classes c on c.id = cs.class_id
      where cs.student_id = vocab_progress.student_id
      and c.teacher_id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- Policy: Admins can view all progress
create policy "Admins can view all progress"
  on vocab_progress for select
  using (
    exists (
      select 1 from allowed_users
      where email = current_setting('app.current_user_email', true)
      and role = 'admin'
    )
  );

-- Allow public access for now (DEV ONLY - will be restricted by RLS in production)
create policy "Allow public insert vocab_progress" on vocab_progress for insert with check (true);
create policy "Allow public read vocab_progress" on vocab_progress for select using (true);
