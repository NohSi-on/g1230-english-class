
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAggregation() {
    const reportId = '2e686fd4-65d7-4bf2-a10d-ed32298331a4';
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();

    if (!report) return;

    const studentId = report.student_id;
    const { period_start, period_end } = report;

    console.log(`Debug aggregation for Student: ${studentId}, Period: ${period_start} ~ ${period_end}`);

    // Fetch Assessments
    const { data: assessments } = await supabase
        .from('assessments')
        .select('*, book:books(id, title, category)')
        .eq('student_id', studentId)
        .or(`created_at.gte.${period_start},updated_at.gte.${period_start}`)
        .filter('created_at', 'lte', period_end + 'T23:59:59');

    console.log(`Found ${assessments?.length} assessments.`);

    const bookIds = Array.from(new Set(assessments.map(a => a.book_id)));
    const { data: questions } = await supabase
        .from('questions')
        .select('id, content, book_id')
        .in('book_id', bookIds);

    const allQuestionItems = [];
    questions.forEach(qPage => {
        if (qPage.content?.items) {
            qPage.content.items.forEach(item => {
                allQuestionItems.push({
                    ...item,
                    itemId: item.itemId || item.question_number,
                    pageId: qPage.id,
                    book_id: qPage.book_id,
                    page_topic: qPage.content.page_topic
                });
            });
        }
    });

    const topicsByCategory = {};

    assessments.forEach(a => {
        const answersMap = a.details?.answers || {};
        const bookItems = allQuestionItems.filter(i => i.book_id === a.book_id);
        const cat = a.book?.category?.toUpperCase() || 'OTHER';
        if (!topicsByCategory[cat]) topicsByCategory[cat] = new Set();

        // Add book title
        topicsByCategory[cat].add(a.book?.title);

        Object.entries(answersMap).forEach(([uniqueKey, entry]) => {
            const itemId = uniqueKey.includes('_') ? uniqueKey.split('_')[1] : uniqueKey;
            const item = bookItems.find(i => String(i.itemId) === itemId || String(i.question_number) === itemId);
            if (item && item.page_topic) {
                topicsByCategory[cat].add(item.page_topic);
            }
        });
    });

    console.log('--- Aggregated Topics ---');
    for (const [cat, topics] of Object.entries(topicsByCategory)) {
        console.log(`${cat}:`, Array.from(topics));
    }
}

debugAggregation();
