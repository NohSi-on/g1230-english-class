-- Add class_type and vocab_book_id columns to classes table
-- This allows distinguishing between MAIN (regular) and VOCAB (vocabulary) classes

-- Create enum type for class types
do $$ begin
    create type class_type_enum as enum ('MAIN', 'VOCAB');
exception
    when duplicate_object then null;
end $$;

-- Add the class_type column with default value
alter table classes 
add column if not exists class_type class_type_enum default 'MAIN';

-- Add the vocab_book_id column (nullable, only used for VOCAB type classes)
alter table classes 
add column if not exists vocab_book_id uuid references books(id) on delete set null;

-- Update existing classes to MAIN if not already set
update classes 
set class_type = 'MAIN' 
where class_type is null;

-- Make class_type not null after setting defaults
alter table classes 
alter column class_type set not null;

-- Create index for faster queries
create index if not exists idx_classes_class_type on classes(class_type);
create index if not exists idx_classes_vocab_book_id on classes(vocab_book_id) where vocab_book_id is not null;
