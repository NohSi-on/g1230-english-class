---------------------------------------------------
-- 1. 카테고리 시스템 개편 (Dynamic Category)
---------------------------------------------------
-- (1) 카테고리 관리 테이블 생성
CREATE TABLE IF NOT EXISTS book_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    color TEXT
);

-- (2) 기본 카테고리 + 'Level test' 추가
INSERT INTO book_categories (name) VALUES 
('GRAMMAR'), ('READING'), ('WORD'), ('LISTENING'), ('Level test')
ON CONFLICT (name) DO NOTHING;

-- (3) [핵심] 교재 테이블의 카테고리 제한 풀기 (Enum -> Text 변경)
ALTER TABLE books ALTER COLUMN category DROP DEFAULT;
ALTER TABLE books ALTER COLUMN category TYPE TEXT; 

---------------------------------------------------
-- 2. 단어장 & 독해 기능 테이블 생성
---------------------------------------------------
-- 단어장 세트
CREATE TABLE IF NOT EXISTS vocab_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 단어 데이터
CREATE TABLE IF NOT EXISTS vocab_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES vocab_sets(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example_sentence TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 독해 지문
CREATE TABLE IF NOT EXISTS reading_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    translation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

---------------------------------------------------
-- 3. 권한 설정 (RLS) - 관리자(Admin)만 쓰기 가능
---------------------------------------------------
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;

-- (A) 읽기(SELECT): 로그인한 모든 사용자 허용
CREATE POLICY "Read access for all authenticated users" ON book_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Read access for all authenticated users" ON vocab_sets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Read access for all authenticated users" ON vocab_words FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Read access for all authenticated users" ON reading_passages FOR SELECT USING (auth.role() = 'authenticated');

-- (B) 쓰기(INSERT, UPDATE, DELETE): 'allowed_users' 테이블의 role이 'admin'인 사람만 허용
-- 주의: allowed_users 테이블에 role 컬럼이 있다고 가정합니다. (확인 필요)
-- 만약 role 컬럼이 없다면, 특정 이메일로 하드코딩하거나 role 컬럼을 추가해야 합니다.
-- 일단 안전하게 'authenticated'로 풀고 나중에 role 체크 로직을 강화하는 것이 좋을 수도 있습니다.
-- 하지만 요청하신 대로 '관리자만' 설정하려면 아래와 같이 합니다.
-- (여기서는 auth.jwt() -> email 을 확인하여 allowed_users의 role이 'admin'인지 체크하는 서브쿼리 사용)

CREATE POLICY "Admin write access" ON book_categories FOR ALL 
USING (
  exists (
    select 1 from allowed_users 
    where email = auth.jwt() ->> 'email' 
    and role = 'admin'
  )
);

CREATE POLICY "Admin write access" ON vocab_sets FOR ALL 
USING (
  exists (
    select 1 from allowed_users 
    where email = auth.jwt() ->> 'email' 
    and role = 'admin'
  )
);

CREATE POLICY "Admin write access" ON vocab_words FOR ALL 
USING (
  exists (
    select 1 from allowed_users 
    where email = auth.jwt() ->> 'email' 
    and role = 'admin'
  )
);

CREATE POLICY "Admin write access" ON reading_passages FOR ALL 
USING (
  exists (
    select 1 from allowed_users 
    where email = auth.jwt() ->> 'email' 
    and role = 'admin'
  )
);
