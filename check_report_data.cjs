
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReport() {
    const reportId = '2e686fd4-65d7-4bf2-a10d-ed32298331a4';
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

    if (error) {
        console.error('Error fetching report:', error);
        return;
    }

    console.log('--- Report Data ---');
    console.log('ID:', data.id);
    console.log('Learned Content:', data.learned_content);
    console.log('Category Analysis:', JSON.stringify(data.summary_stats.category_analysis, null, 2));
}

checkReport();
