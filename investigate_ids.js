
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function investigate() {
    const reportId = '911858bf-8c4e-44e3-a987-338d34037fbf';
    console.log(`Investigating Report: ${reportId}`);

    // 1. Get Report
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();
    if (!report) return console.log("Report not found");

    // 2. Get Student's Assessments in that range
    const { data: assessments } = await supabase
        .from('assessments')
        .select('*, book:books(title)')
        .eq('student_id', report.student_id)
        .gte('created_at', report.period_start)
        .lte('created_at', report.period_end + 'T23:59:59');

    console.log(`Found ${assessments.length} assessments.`);

    // 3. For each assessment, check if the answers link to existing questions
    const validation = [];
    for (const a of assessments) {
        const answerKeys = Object.keys(a.details?.answers || {});
        const sampleKey = answerKeys[0];
        if (!sampleKey) continue;

        const [pageId, itemId] = sampleKey.split('_');
        const { data: qPage } = await supabase.from('questions').select('id, page_number').eq('id', pageId).single();

        validation.push({
            assessment_id: a.id,
            book_id: a.book_id,
            book_title: a.book?.title,
            sample_key: sampleKey,
            page_id_exists: !!qPage,
            page_number: qPage?.page_number
        });
    }

    fs.writeFileSync('investigation_results.json', JSON.stringify({ report, validation }, null, 2));
    console.log("Results saved to investigation_results.json");
}

investigate();
