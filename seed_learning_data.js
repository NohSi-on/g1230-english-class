import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Prefer Service Role for seeding

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log('🌱 단어장/독해 샘플 데이터 생성을 시작합니다...');

    // 1. Create Sample Book
    const bookTitle = '단어샘플교재';
    const bookCategory = 'WORD'; // Using the newly added 'WORD' category

    // Check if book exists
    const { data: existingBooks } = await supabase
        .from('books')
        .select('id')
        .eq('title', bookTitle)
        .eq('category', bookCategory);

    let bookId;

    if (existingBooks && existingBooks.length > 0) {
        console.log(`📘 '${bookTitle}' 교재가 이미 존재합니다. ID: ${existingBooks[0].id}`);
        bookId = existingBooks[0].id;
    } else {
        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert({
                title: bookTitle,
                category: bookCategory,
                target_grade: '중1',
                is_published: true
            })
            .select()
            .single();

        if (bookError) {
            console.error('❌ 교재 생성 실패:', bookError);
            return;
        }
        console.log(`✅ '${bookTitle}' 교재 생성 완료! ID: ${newBook.id}`);
        bookId = newBook.id;
    }

    // 2. Add Vocabulary Sets (Day 01, Day 02)
    const vocabSets = [
        { title: 'Day 01 - 기본 영단어' },
        { title: 'Day 02 - 필수 숙어' }
    ];

    for (const set of vocabSets) {
        // Check existence
        const { data: existingSets } = await supabase
            .from('vocab_sets')
            .select('id')
            .eq('book_id', bookId)
            .eq('title', set.title);

        let setId;
        if (existingSets && existingSets.length > 0) {
            setId = existingSets[0].id;
            console.log(`  - '${set.title}' 세트가 이미 존재합니다.`);
        } else {
            const { data: newSet, error: setError } = await supabase
                .from('vocab_sets')
                .insert({
                    book_id: bookId,
                    title: set.title
                })
                .select()
                .single();

            if (setError) {
                console.error(`  ❌ 세트 생성 실패 (${set.title}):`, setError);
                continue;
            }
            setId = newSet.id;
            console.log(`  ✅ '${set.title}' 세트 생성 완료!`);

            // Add Words to this set
            const words = set.title.includes('Day 01') ? [
                { word: 'apple', meaning: '사과', example: 'I ate an apple.' },
                { word: 'banana', meaning: '바나나', example: 'Minions love bananas.' },
                { word: 'computer', meaning: '컴퓨터', example: 'I use a computer to code.' },
                { word: 'student', meaning: '학생', example: 'He is a smart student.' },
                { word: 'teacher', meaning: '선생님', example: 'My teacher is kind.' }
            ] : [
                { word: 'look after', meaning: '~를 돌보다', example: 'She looks after her brother.' },
                { word: 'give up', meaning: '포기하다', example: 'Never give up!' },
                { word: 'take off', meaning: '이륙하다, 벗다', example: 'The plane took off.' }
            ];

            const { error: wordError } = await supabase
                .from('vocab_words')
                .insert(words.map(w => ({
                    set_id: setId,
                    word: w.word,
                    meaning: w.meaning,
                    example_sentence: w.example
                })));

            if (wordError) console.error('  ❌ 단어 추가 실패:', wordError);
            else console.log(`    ✨ 단어 ${words.length}개 추가 완료`);
        }
    }

    // 3. Add Reading Passage
    const passageTitle = 'Helen Keller';

    const { data: existingPassages } = await supabase
        .from('reading_passages')
        .select('id')
        .eq('book_id', bookId)
        .eq('title', passageTitle);

    if (existingPassages && existingPassages.length > 0) {
        console.log(`📄 '${passageTitle}' 독해 지문이 이미 존재합니다.`);
    } else {
        const { error: passageError } = await supabase
            .from('reading_passages')
            .insert({
                book_id: bookId,
                title: passageTitle,
                content: `Helen Keller was born in 1880. When she was very young, she became very sick. After her sickness, she could not see or hear. Her life was very dark and lonely. But then, a teacher came to help her. Her name was Anne Sullivan. Anne taught Helen how to communicate with others.`,
                translation: `헬렌 켈러는 1880년에 태어났다. 그녀가 매우 어렸을 때, 그녀는 매우 아팠다. 병을 앓고 난 후, 그녀는 보거나 들을 수 없게 되었다. 그녀의 삶은 매우 어둡고 외로웠다. 그러나 그때, 한 선생님이 그녀를 도우러 왔다. 그녀의 이름은 앤 설리번이었다. 앤은 헬렌에게 다른 사람들과 소통하는 법을 가르쳐주었다.`
            });

        if (passageError) console.error('❌ 독해 지문 생성 실패:', passageError);
        else console.log(`✅ '${passageTitle}' 독해 지문 생성 완료!`);
    }

    console.log('🎉 모든 샘플 데이터 생성이 완료되었습니다!');
}

seedData();
