
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onyirgrejsentmefyfkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NwWt92v0mP0JayiLIL3_OQ_zcG9wYCJ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyQueries(studentId, start, end) {
    const { data: assessments } = await supabase
        .from('assessments')
        .select('*, book:books(title)')
        .eq('student_id', studentId)
        .gte('created_at', start)
        .lte('created_at', end + 'T23:59:59');

    console.log('--- Assessment Data (first row) ---');
    if (assessments && assessments.length > 0) {
        console.log('Keys:', Object.keys(assessments[0]));
        console.log('book_id value:', assessments[0].book_id);
        console.log('book Property:', assessments[0].book);
    } else {
        console.log('No assessments found.');
    }

    const bookIds = Array.from(new Set(assessments.map(a => a.book_id)));
    const { data: questions } = await supabase
        .from('questions')
        .select('id, content, book_id')
        .in('book_id', bookIds);

    console.log('\n--- Question Data (first row) ---');
    if (questions && questions.length > 0) {
        console.log('Keys:', Object.keys(questions[0]));
        console.log('book_id value:', questions[0].book_id);
    } else {
        console.log('No questions found.');
    }

    // Check if book_id in assessment matches book_id in questions
    if (assessments.length > 0 && questions.length > 0) {
        console.log(`\nMatch Test: ${assessments[0].book_id === questions[0].book_id}`);
    }
}

const studentId = 'c7f9077c-3d71-430c-883c-d8d1a8c38587';
const start = '2026-02-04';
const end = '2026-02-04';
verifyQueries(studentId, start, end);
