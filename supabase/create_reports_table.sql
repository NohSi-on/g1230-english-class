-- Create Enum for Badge Levels
create type report_badge_level as enum ('JEUS', 'TOP', 'ARDOR');

-- Create Reports Table
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  
  -- Badge Level (calculated or manual)
  badge_level report_badge_level default 'ARDOR',
  
  -- JSON Snapshots for immutable report data
  summary_stats jsonb not null default '{}'::jsonb, 
  -- e.g. { "total_questions": 150, "accuracy": 85, "study_days": 12, "prev_accuracy": 80 }
  
  strength_analysis jsonb not null default '{}'::jsonb,
  -- e.g. { "best_skill": "Vocabulary", "score": 95, "comment": "..." }
  
  weakness_analysis jsonb not null default '{}'::jsonb,
  -- e.g. { "worst_concepts": [{"concept": "To-Infinitive", "error_rate": 78}], "prescription": "..." }
  
  radar_chart_data jsonb not null default '{}'::jsonb,
  -- e.g. { "grammar": 80, "reading": 90, "vocab": 70, ... }
  
  teacher_comment text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add Profile Image URL to Students table
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'students' and column_name = 'profile_img_url') then
        alter table students add column profile_img_url text;
    end if;
end $$;

-- RLS Policies for Reports
alter table reports enable row level security;

-- Public read access for shared reports (using UUID)
create policy "Allow public read reports" on reports for select using (true);

-- Allow teachers/admins to insert/update
create policy "Allow public insert reports" on reports for insert with check (true);
create policy "Allow public update reports" on reports for update using (true);
