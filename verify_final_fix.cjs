
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onyirgrejsentmefyfkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NwWt92v0mP0JayiLIL3_OQ_zcG9wYCJ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyAll() {
    console.log('--- Phase 1: Verify Grading Snapshots ---');
    const { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', '2c3f635a-7407-4f40-a049-026b339c0063') // Our debug target
        .single();

    if (assessment) {
        const answers = assessment.details?.answers || {};
        const sampleKey = Object.keys(answers)[0];
        const sampleEntry = answers[sampleKey];

        console.log('Sample Key:', sampleKey);
        console.log('Sample Entry Structure:', typeof sampleEntry === 'object' ? 'OBJECT (Snapshot)' : 'STRING (Legacy)');

        if (typeof sampleEntry === 'object') {
            console.log('Snapshot Content:', JSON.stringify(sampleEntry, null, 2));
        }

        console.log('Assessment Score:', assessment.score);
    }

    console.log('\n--- Phase 2: Verify Report Analysis Resilience ---');
    // We can't run the ReportGenerator React component here, but we can verify the logic 
    // in code by looking at the ReportGeneratorPage.tsx changes.
    // The key is if snapshotMatch > 0 during the next analysis.

    console.log('\n--- Verification complete. Please run manual check in Browser. ---');
}

verifyAll();
