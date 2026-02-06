-- ⚠️ WARNING: THIS WILL PERMANENTLY DELETE ALL USER DATA ⚠️
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/onyirgrejsentmefyfkv/sql)

-- 1. Clear all data tables in order of dependency
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE assessments CASCADE;
TRUNCATE TABLE questions CASCADE;
TRUNCATE TABLE class_students CASCADE;
TRUNCATE TABLE class_books CASCADE;
TRUNCATE TABLE classes CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE books CASCADE;

-- 2. Optional: Verify everything is empty
SELECT 'reports', count(*) FROM reports
UNION ALL
SELECT 'assessments', count(*) FROM assessments
UNION ALL
SELECT 'questions', count(*) FROM questions
UNION ALL
SELECT 'students', count(*) FROM students
UNION ALL
SELECT 'books', count(*) FROM books;
