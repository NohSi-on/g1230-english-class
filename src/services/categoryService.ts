import { supabase } from '../lib/supabase';

export interface Category {
    id: string;
    name: string;
    created_at: string;
    color?: string;
}

export const getCategories = async () => {
    const { data, error } = await supabase
        .from('book_categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data as Category[];
};

export const addCategory = async (name: string) => {
    const { data, error } = await supabase
        .from('book_categories')
        .insert({ name })
        .select()
        .single();

    if (error) throw error;
    return data as Category;
};

export const deleteCategory = async (id: string) => {
    // 1. Check if category is in use
    const { data: category } = await supabase
        .from('book_categories')
        .select('name')
        .eq('id', id)
        .single();

    if (category) {
        const { count, error: countError } = await supabase
            .from('books')
            .select('*', { count: 'exact', head: true })
            .eq('category', category.name);

        if (countError) throw countError;
        if (count && count > 0) {
            throw new Error(`이 카테고리를 사용 중인 교재가 ${count}권 있습니다. 교재들의 카테고리를 먼저 변경하거나 삭제해 주세요.`);
        }
    }

    const { error } = await supabase
        .from('book_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
