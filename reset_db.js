
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function resetDatabase() {
    console.log("⚠️ Starting Full Database Reset (Extended) ⚠️");

    const tables = [
        'reports',
        'assessments',
        'questions',
        'books',
        'class_students',
        'classes',
        'students'
    ];

    for (const table of tables) {
        console.log(`- Clearing '${table}'...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.error(`  ❌ Error clearing ${table}:`, error.message);
        }
    }

    console.log("✅ Extended Reset Complete. Supabase is now empty of user data.");
}

resetDatabase();
