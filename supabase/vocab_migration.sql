-- Add class_type column with constraint
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS class_type TEXT DEFAULT 'MAIN' 
CHECK (class_type IN ('MAIN', 'VOCAB'));

-- Add vocab_book_id column linked to books
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS vocab_book_id UUID REFERENCES books(id) ON DELETE SET NULL;

-- Ensure all existing classes are marked as MAIN
UPDATE classes SET class_type = 'MAIN' WHERE class_type IS NULL;
