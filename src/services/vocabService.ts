import { supabase } from '../lib/supabase';
import type { VocabSet, VocabWord } from '../types';

export const getVocabSets = async (bookId: string): Promise<VocabSet[]> => {
    const { data, error } = await supabase
        .from('vocab_sets')
        .select(`
            *,
            vocab_words (count)
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((set: any) => ({
        ...set,
        word_count: set.vocab_words[0]?.count || 0
    }));
};

export const getVocabWords = async (setId: string): Promise<VocabWord[]> => {
    const { data, error } = await supabase
        .from('vocab_words')
        .select('*')
        .eq('set_id', setId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

export const createVocabSet = async (bookId: string, title: string, words: Partial<VocabWord>[]): Promise<string> => {
    // 1. Create the set
    const { data: setData, error: setError } = await supabase
        .from('vocab_sets')
        .insert([{ book_id: bookId, title }])
        .select()
        .single();

    if (setError) throw setError;

    // 2. Insert words
    const wordsToInsert = words.map(w => ({
        set_id: setData.id,
        word: w.word,
        meaning: w.meaning,
        example_sentence: w.example_sentence || ''
    }));

    const { error: wordsError } = await supabase
        .from('vocab_words')
        .insert(wordsToInsert);

    if (wordsError) throw wordsError;

    return setData.id;
};
