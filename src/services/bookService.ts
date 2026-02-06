import { supabase } from '../lib/supabase';
import type { Book, BookCategory } from '../types';

export const getBooks = async () => {
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Book[];
};

export const createBook = async (book: {
    title: string;
    category: BookCategory;
    target_grade?: string;
    cover_url?: string;
    pdf_url?: string;
    pdf_page_offset?: number;
    page_mapping?: Record<number, number>;
}) => {
    const { data, error } = await supabase
        .from('books')
        .insert(book)
        .select()
        .single();

    if (error) throw error;
    return data as Book;
};

export const uploadFile = async (bucket: 'textbooks' | 'covers', file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
};

export const deleteBook = async (book: Book) => {
    // 1. Delete from DB
    const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);

    if (error) throw error;

    // 2. Delete files from Storage (Only if they are Supabase Storage URLs)
    if (book.pdf_url && book.pdf_url.includes('supabase.co')) {
        const pdfName = book.pdf_url.split('/').pop();
        if (pdfName) await supabase.storage.from('textbooks').remove([pdfName]);
    }

    if (book.cover_url && book.cover_url.includes('supabase.co')) {
        const coverName = book.cover_url.split('/').pop();
        if (coverName) await supabase.storage.from('covers').remove([coverName]);
    }
};

export const updateBook = async (id: string, updates: Partial<Book>) => {
    const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Book;
};
