
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkItem() {
    const { data } = await supabase.from('questions').select('id, content').eq('id', '72ae5fbe-5b5e-46ca-ac9e-fc9fff102a29').single();
    if (data && data.content.items) {
        console.log("ITEM 0 FIELDS:", Object.keys(data.content.items[0]));
        console.log("ITEM 0 DATA:", JSON.stringify(data.content.items[0], null, 2));
    }
}

checkItem();
