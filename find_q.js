
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findQuestion() {
    const qid = '8bf0f1ae-1cb0-4c9c-a912-d53067b99910';
    const { data, error } = await supabase.from('questions').select('*, books(title)').eq('id', qid);
    console.log(JSON.stringify(data, null, 2));
}

findQuestion();
