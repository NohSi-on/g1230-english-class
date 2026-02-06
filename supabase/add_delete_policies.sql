-- Add DELETE policies for student management
-- Drop existing policies if they exist, then recreate

-- Students table
drop policy if exists "Allow public delete students" on students;
create policy "Allow public delete students" 
on students for delete using (true);

drop policy if exists "Allow public update students" on students;
create policy "Allow public update students" 
on students for update using (true);

-- Assessments table
drop policy if exists "Allow public delete assessments" on assessments;
create policy "Allow public delete assessments" 
on assessments for delete using (true);

-- Reports table
drop policy if exists "Allow public delete reports" on reports;
create policy "Allow public delete reports" 
on reports for delete using (true);

-- Class students table
drop policy if exists "Allow public delete class_students" on class_students;
create policy "Allow public delete class_students" 
on class_students for delete using (true);

-- Books table
drop policy if exists "Allow public update books" on books;
create policy "Allow public update books" 
on books for update using (true);

drop policy if exists "Allow public delete books" on books;
create policy "Allow public delete books" 
on books for delete using (true);

-- Questions table
drop policy if exists "Allow public update questions" on questions;
create policy "Allow public update questions" 
on questions for update using (true);

drop policy if exists "Allow public delete questions" on questions;
create policy "Allow public delete questions" 
on questions for delete using (true);
