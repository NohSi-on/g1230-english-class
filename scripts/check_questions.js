import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Handling ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Manual env parser
const envConfig = {};
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            envConfig[key.trim()] = values.join('=').trim();
        }
    });
}

const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuestions() {
    console.log('Checking "questions" table...');

    // 1. Get Total Count
    const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error getting count:', countError);
        return;
    }

    console.log(`Total rows in "questions" table: ${count}`);

    // 2. Get Sample Data (latest 5)
    if (count && count > 0) {
        const { data, error } = await supabase
            .from('questions')
            .select('id, book_id, page_number, content, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        console.log('\n--- Latest 5 Entries ---');
        data.forEach((row, idx) => {
            const itemCount = row.content?.items?.length || 0;
            console.log(`[${idx + 1}] ID: ${row.id}, Page: ${row.page_number}, Questions: ${itemCount}, Date: ${row.created_at}`);
        });
    } else {
        console.log('No questions found in the table.');
    }
}

checkQuestions();
