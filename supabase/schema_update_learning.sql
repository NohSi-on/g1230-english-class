-- 1. Fix book_category Enum
ALTER TYPE book_category ADD VALUE IF NOT EXISTS 'Level test';

-- 2. Create Vocabulary Sets Table
CREATE TABLE IF NOT EXISTS vocab_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Vocabulary Words Table
CREATE TABLE IF NOT EXISTS vocab_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES vocab_sets(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Reading Passages Table
CREATE TABLE IF NOT EXISTS reading_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    translation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE vocab_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (Allow verified users full access for now)
CREATE POLICY "Enable all access for authenticated users" ON vocab_sets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON vocab_words FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON reading_passages FOR ALL USING (auth.role() = 'authenticated');

-- 7. Grant access to anon (if needed for public views, but keeping it secure for now)
GRANT ALL ON vocab_sets TO service_role;
GRANT ALL ON vocab_words TO service_role;
GRANT ALL ON reading_passages TO service_role;
