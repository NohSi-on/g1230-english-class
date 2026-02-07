
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onyirgrejsentmefyfkv.supabase.co';
const supabaseKey = 'sb_publishable_NwWt92v0mP0JayiLIL3_OQ_zcG9wYCJ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking book_categories table ---');
    const { data: catData, error: catError } = await supabase
        .from('book_categories')
        .select('*')
        .limit(1);

    if (catError) {
        console.log('book_categories table error (likely doesn\'t exist):', catError.message);
    } else {
        console.log('book_categories table exists. Data:', catData);
    }

    console.log('\n--- Checking unique categories in books table ---');
    const { data: bookCats, error: bookError } = await supabase
        .from('books')
        .select('category');

    if (bookError) {
        console.error('books table error:', bookError.message);
    } else {
        const unique = [...new Set(bookCats.map(b => b.category))];
        console.log('Unique categories currently in books table:', unique);
    }
}

check();
