
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrateKeys() {
    console.log("🛠️ Migrating Assessment Keys to Unified itemId/question_number format...");

    const { data: assessments } = await supabase.from('assessments').select('*');
    if (!assessments) return;

    for (const a of assessments) {
        if (!a.details?.answers) continue;

        const oldAnswers = a.details.answers;
        const newAnswers = {};
        let changed = false;

        // Current keys might be UUID_1, but current itemId is q1
        // BUT wait, my fix makes ReportGenerator look for itemId || question_number.
        // If GradingPage saved UUID_1, it will match item.question_number = 1.

        // Actually, my fix in ReportGenerator is:
        // const uniqueKey = `${item.pageId}_${item.itemId}`; 
        // and item.itemId is assigned (itemId || question_number).

        // So if item has itemId="q1" and question_number="1", itemId becomes "q1".
        // GradingPage will save as "UUID_q1".
        // Existing data has "UUID_1".

        // Let's migrate "UUID_1" to "UUID_q1" if itemId exists.

        const { data: questions } = await supabase.from('questions').select('*').eq('book_id', a.book_id);
        if (!questions) continue;

        const itemMap = {}; // question_number -> itemId
        questions.forEach(q => {
            q.content?.items?.forEach(item => {
                if (item.itemId && item.question_number) {
                    itemMap[`${q.id}_${item.question_number}`] = `${q.id}_${item.itemId}`;
                }
            });
        });

        Object.entries(oldAnswers).forEach(([key, val]) => {
            if (itemMap[key]) {
                newAnswers[itemMap[key]] = val;
                changed = true;
            } else {
                newAnswers[key] = val;
            }
        });

        if (changed) {
            console.log(`- Updating Assessment ${a.id}...`);
            await supabase.from('assessments').update({ details: { answers: newAnswers } }).eq('id', a.id);
        }
    }

    console.log("✅ Migration complete.");
}

migrateKeys();
