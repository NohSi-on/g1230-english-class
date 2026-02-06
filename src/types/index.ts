export type BookCategory = 'GRAMMAR' | 'READING' | 'WORD' | 'LISTENING';

export interface Book {
    id: string;
    title: string;
    category: BookCategory;
    cover_url: string | null;
    pdf_url: string | null;
    is_published: boolean;
    created_at: string;
    target_grade?: string;
    pdf_page_offset?: number;
    page_mapping?: Record<number, number>;
}

export interface Question {
    id: string;
    book_id: string;
    page_number: number;
    content: {
        items: QuestionItem[];
    };
    created_at: string;
}

export interface QuestionItem {
    id: number;
    type: string;     // e.g. "SUBJECT_VERB"
    concept?: string; // e.g. "동명사의 용법"
    question: string;
    answer: string;
    options?: string[];
    explanation?: string;
}
