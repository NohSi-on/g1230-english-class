
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onyirgrejsentmefyfkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NwWt92v0mP0JayiLIL3_OQ_zcG9wYCJ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMetadata() {
    console.log('--- Checking Column Type ---');
    // We can't easily query information_schema via standard Supabase client without RPC or special settings, 
    // but we can try to insert a test value or check if anyone has uploaded SQL files.
    // Actually, I can use a simple trick: select a row and check the type of the value.
    const { data: assessments } = await supabase.from('assessments').select('score').limit(1);
    if (assessments && assessments.length > 0) {
        console.log('Score value:', assessments[0].score);
        console.log('Score type primitive:', typeof assessments[0].score);
    }

    console.log('\n--- Checking RLS Policies (via migration files search) ---');
}

checkMetadata();
