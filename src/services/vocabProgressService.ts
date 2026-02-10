import { supabase } from '../lib/supabase';

export interface VocabProgressRecord {
    id?: string;
    student_id: string;
    book_id: string;
    vocab_set_id: string;
    mode: 'MEMORIZE' | 'RECALL' | 'SPELL';
    word_index: number;
    word: string;
    is_correct: boolean;
    attempts: number;
    studied_at?: string;
}

export interface StudentProgress {
    student_id: string;
    student_name: string;
    book_id: string;
    book_title: string;
    vocab_set_id: string;
    total_words: number;
    completed_words: number;
    completion_rate: number;
    accuracy_rate: number;
    last_studied: string | null;
}

/**
 * Save vocabulary study progress
 */
export async function saveVocabProgress(record: VocabProgressRecord) {
    const { data, error } = await supabase
        .from('vocab_progress')
        .insert({
            student_id: record.student_id,
            book_id: record.book_id,
            vocab_set_id: record.vocab_set_id,
            mode: record.mode,
            word_index: record.word_index,
            word: record.word,
            is_correct: record.is_correct,
            attempts: record.attempts,
        });

    if (error) throw error;
    return data;
}

/**
 * Get progress for a specific student and book
 */
export async function getStudentProgress(studentId: string, bookId?: string) {
    let query = supabase
        .from('vocab_progress')
        .select('*')
        .eq('student_id', studentId)
        .order('studied_at', { ascending: false });

    if (bookId) {
        query = query.eq('book_id', bookId);
    }

    const { data, error } = await supabase
        .from('vocab_progress')
        .select('*')
        .eq('student_id', studentId);

    if (error) throw error;
    return data;
}

/**
 * Get all students assigned to a teacher's classes
 */
export async function getTeacherStudents(teacherId: string) {
    const { data, error } = await supabase
        .from('class_students')
        .select(`
            student_id,
            students!inner(id, name, grade),
            classes!inner(id, teacher_id)
        `)
        .eq('classes.teacher_id', teacherId);

    if (error) throw error;

    // Deduplicate students
    const uniqueStudents = new Map();
    data?.forEach((item: any) => {
        const student = item.students;
        if (student && !uniqueStudents.has(student.id)) {
            uniqueStudents.set(student.id, student);
        }
    });

    return Array.from(uniqueStudents.values());
}

/**
 * Get aggregated progress for all students (with role-based filtering)
 */
export async function getAllProgress(teacherId?: string, role?: string): Promise<StudentProgress[]> {
    // Get students based on role
    let studentIds: string[] = [];

    if (role === 'admin') {
        // Admin sees all students
        const { data: allStudents } = await supabase
            .from('students')
            .select('id');
        studentIds = allStudents?.map(s => s.id) || [];
    } else if (teacherId) {
        // Teacher sees only their students
        const students = await getTeacherStudents(teacherId);
        studentIds = students.map((s: any) => s.id);
    }

    if (studentIds.length === 0) return [];

    // Get progress data
    const { data: progressData, error } = await supabase
        .from('vocab_progress')
        .select(`
            student_id,
            book_id,
            vocab_set_id,
            mode,
            word,
            is_correct,
            studied_at,
            students!inner(name),
            books!inner(title)
        `)
        .in('student_id', studentIds)
        .order('studied_at', { ascending: false });

    if (error) throw error;

    // Aggregate by student, book, and set
    const aggregated = new Map<string, StudentProgress>();

    progressData?.forEach((record: any) => {
        const key = `${record.student_id}-${record.book_id}-${record.vocab_set_id}`;

        if (!aggregated.has(key)) {
            aggregated.set(key, {
                student_id: record.student_id,
                student_name: record.students.name,
                book_id: record.book_id,
                book_title: record.books.title,
                vocab_set_id: record.vocab_set_id,
                total_words: 0,
                completed_words: 0,
                completion_rate: 0,
                accuracy_rate: 0,
                last_studied: record.studied_at,
            });
        }

        const progress = aggregated.get(key)!;
        progress.total_words++;
        if (record.is_correct) progress.completed_words++;
    });

    // Calculate rates
    const result = Array.from(aggregated.values()).map(p => ({
        ...p,
        completion_rate: p.total_words > 0 ? (p.completed_words / p.total_words) * 100 : 0,
        accuracy_rate: p.total_words > 0 ? (p.completed_words / p.total_words) * 100 : 0,
    }));

    return result;
}

/**
 * Get words that a student got wrong (for review)
 */
export async function getWrongWords(studentId: string, bookId: string, vocabSetId: string) {
    const { data, error } = await supabase
        .from('vocab_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('book_id', bookId)
        .eq('vocab_set_id', vocabSetId)
        .eq('is_correct', false)
        .order('attempts', { ascending: false });

    if (error) throw error;
    return data;
}
