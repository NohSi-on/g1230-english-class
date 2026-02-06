
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function dumpFullData() {
    const studentId = 'c7f9077c-3d71-430c-883c-d8d1a8c38587';

    const { data: assessments } = await supabase.from('assessments').select('*').eq('student_id', studentId);
    if (!assessments || assessments.length === 0) { console.log("No assessments found"); return; }

    const bookId = assessments[0]?.book_id;
    const { data: questions } = await supabase.from('questions').select('*').eq('book_id', bookId);

    const result = {
        assessments,
        questions
    };

    fs.writeFileSync('full_data_dump.json', JSON.stringify(result, null, 2), 'utf8');
    console.log("Dump complete: full_data_dump.json (Correct ID)");
}

dumpFullData();
