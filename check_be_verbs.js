
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBeVerbs() {
    const bookId = 'd910ab0c-cffa-4e91-bf9f-0c1c1065b61c';
    const { data } = await supabase.from('questions').select('page_number, content').eq('book_id', bookId).in('page_number', [18, 19, 20, 21]);

    if (data) {
        data.forEach(p => {
            console.log(`Page ${p.page_number} Concepts:`, p.content?.items?.map(i => i.concept));
        });
    }
}

checkBeVerbs();
