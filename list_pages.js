
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listPages() {
    const bookId = 'd910ab0c-cffa-4e91-bf9f-0c1c1065b61c';
    const { data } = await supabase.from('questions').select('page_number').eq('book_id', bookId);
    console.log(data.map(p => p.page_number).sort((a, b) => a - b));
}

listPages();
