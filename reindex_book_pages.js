
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onyirgrejsentmefyfkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NwWt92v0mP0JayiLIL3_OQ_zcG9wYCJ'; // Replace with a service key if RLS blocks or use a token
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Reindexes all question pages for a book by adding an offset.
 * Example: if PDF page 5 should be Book page 1, offset is -4.
 */
async function reindexBookPages(bookId, offset) {
    console.log(`Reindexing Book ID: ${bookId} with offset: ${offset}`);

    // 1. Fetch all questions for the book
    const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('id, page_number, content')
        .eq('book_id', bookId);

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    console.log(`Found ${questions.length} question rows.`);

    // 2. Update each row
    for (const q of questions) {
        const newPageNum = q.page_number + offset;

        // Update both the column and internal content if it exists
        const updatedContent = { ...q.content };
        if (updatedContent.items) {
            updatedContent.items = updatedContent.items.map(item => ({
                ...item,
                page: (item.page || q.page_number) + offset
            }));
        }

        const { error: updateError } = await supabase
            .from('questions')
            .update({
                page_number: newPageNum,
                content: updatedContent
            })
            .eq('id', q.id);

        if (updateError) {
            console.error(`Error updating Q ID ${q.id}:`, updateError.message);
        } else {
            console.log(`Updated Q ID ${q.id}: ${q.page_number} -> ${newPageNum}`);
        }
    }

    console.log('Reindexing complete.');
}

// Usage: node reindex_book_pages.js <BOOK_ID> <OFFSET>
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node reindex_book_pages.js <BOOK_ID> <OFFSET>');
    console.log('Example: node reindex_book_pages.js some-uuid -4');
} else {
    reindexBookPages(args[0], parseInt(args[1]));
}
