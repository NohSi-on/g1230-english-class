
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log("--- Inspecting Assessments ---");
    // Fetch the most recent assessment
    const { data: assessments, error: aError } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (aError) {
        console.error("Error fetching assessment:", aError);
        return;
    }

    if (!assessments || assessments.length === 0) {
        console.log("No assessments found.");
    } else {
        const a = assessments[0];
        console.log("Assessment ID:", a.id);
        console.log("Book ID:", a.book_id);
        console.log("Details:", JSON.stringify(a.details, null, 2));

        console.log("\n--- Inspecting Questions for this Book ---");
        // Fetch questions for this book
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('id, content, book_id')
            .eq('book_id', a.book_id);

        if (qError) {
            console.error("Error fetching questions:", qError);
        } else {
            if (questions && questions.length > 0) {
                questions.forEach((q, idx) => {
                    console.log(`\n[Question Page ${idx + 1}] ID: ${q.id}`);
                    console.log("Content:", JSON.stringify(q.content, null, 2));
                });
            } else {
                console.log("No questions found for this book.");
            }
        }
    }
}

inspectData();
