
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRows() {
    const tables = ['students', 'reports', 'assessments', 'questions', 'books', 'classes', 'class_students'];
    console.log("📊 Current Database Status:");

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`  ❌ Error checking ${table}:`, error.message);
        } else {
            console.log(`  - ${table}: ${count} rows`);
        }
    }
}

checkRows();
