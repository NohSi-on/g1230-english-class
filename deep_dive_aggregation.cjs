
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepDive() {
    const studentId = 'a64bfaa0-acd5-48c0-b342-bfdefffd777e';
    const period_start = '2026-02-04';
    const period_end = '2026-02-07';

    // 1. Check Assessments
    const { data: assessments } = await supabase
        .from('assessments')
        .select('*, book:books(*)')
        .eq('student_id', studentId)
        .or(`created_at.gte.${period_start},updated_at.gte.${period_start}`)
        .filter('created_at', 'lte', period_end + 'T23:59:59');

    console.log('--- Assessments Found ---');
    assessments.forEach(a => {
        const pages = Object.keys(a.details?.answers || {}).length;
        console.log(`Book: ${a.book.title}, Pages/Answers: ${pages}`);

        // Sample some keys from answers
        const keys = Object.keys(a.details?.answers || {}).slice(0, 10);
        console.log('Sample Keys:', keys);
    });

    const bookIds = assessments.map(a => a.book_id);

    // 2. Check Questions for those books
    const { data: questions } = await supabase
        .from('questions')
        .select('id, page_number, content, book_id')
        .in('book_id', bookIds);

    console.log('\n--- Questions Check ---');
    const topicsByBook = {};
    questions.forEach(q => {
        if (!topicsByBook[q.book_id]) topicsByBook[q.book_id] = new Set();
        if (q.content.page_topic) {
            topicsByBook[q.book_id].add(`${q.page_number}p: ${q.content.page_topic}`);
        }
    });

    for (const [bid, topics] of Object.entries(topicsByBook)) {
        const book = assessments.find(a => a.book_id === bid)?.book;
        console.log(`Book: ${book.title}`);
        console.log('Topics by Page:', Array.from(topics).sort());
    }
}

deepDive();
