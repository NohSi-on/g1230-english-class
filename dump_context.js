
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpData() {
    const reportId = 'cf9527a7-9f5e-4a33-9fcc-e80063ba3d92';
    console.log(`Dumping data for report: ${reportId}`);

    // 1. Get Report
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();

    // 2. Get Assessments in that range
    const { data: assessments } = await supabase
        .from('assessments')
        .select('*, book:books(title)')
        .eq('student_id', report.student_id)
        .gte('created_at', report.period_start)
        .lte('created_at', report.period_end + 'T23:59:59');

    // 3. Get Questions for those books
    const bookIds = Array.from(new Set(assessments.map(a => a.book_id)));
    const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .in('book_id', bookIds);

    const fullDump = {
        report,
        assessments,
        questions
    };

    fs.writeFileSync('debug_dump.json', JSON.stringify(fullDump, null, 2));
    console.log("Dump saved to debug_dump.json");
}

dumpData();
