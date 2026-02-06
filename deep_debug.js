
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugData() {
    const reportId = 'c7434e13-fd15-4d56-b70c-9e03a3fb2602';

    // 1. Get Report info
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();
    if (!report) { console.log("Report not found"); return; }
    console.log("--- Report Data ---");
    console.log(JSON.stringify(report, null, 2));

    // 2. Get Assessments for this student
    const { data: assessments } = await supabase.from('assessments')
        .select('*')
        .eq('student_id', report.student_id);
    console.log("\n--- Assessments ---");
    console.log(JSON.stringify(assessments, null, 2));

    // 3. Get Questions for this book
    const bookId = assessments[0]?.book_id;
    if (bookId) {
        const { data: questions } = await supabase.from('questions')
            .select('id, content')
            .eq('book_id', bookId);
        console.log("\n--- Questions ---");
        console.log(JSON.stringify(questions, null, 2));
    }
}

debugData();
