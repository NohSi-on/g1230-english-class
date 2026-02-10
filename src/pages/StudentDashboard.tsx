import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, BrainCircuit, Clock, ChevronRight, GraduationCap, LogOut } from 'lucide-react';

interface AssignedBook {
    id: string;
    title: string;
    category: string;
    last_studied?: string;
    status: string;
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { student, signOut } = useAuth();
    const [books, setBooks] = useState<AssignedBook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (student) {
            fetchAssignedBooks();
        }
    }, [student]);

    const fetchAssignedBooks = async () => {
        if (!student) return;
        setLoading(true);
        try {
            // 1. Fetch books via classes
            const { data: classBooks, error: cbError } = await supabase
                .from('class_books')
                .select(`
                    book:books (id, title, category)
                `)
                .in('class_id', student.classIds);

            if (cbError) throw cbError;

            // Unique books (student might be in multiple classes with same book)
            const uniqueBooksMap = new Map();
            classBooks?.forEach((item: any) => {
                const b = item.book;
                if (b) uniqueBooksMap.set(b.id, b);
            });

            const uniqueBooks = Array.from(uniqueBooksMap.values());

            // 2. Fetch assessment status (for last_studied)
            const { data: assessments } = await supabase
                .from('assessments')
                .select('book_id, status, updated_at')
                .eq('student_id', student.id);

            const assessmentMap = new Map();
            assessments?.forEach(a => assessmentMap.set(a.book_id, a));

            const formatted: AssignedBook[] = uniqueBooks.map(b => {
                const a = assessmentMap.get(b.id);
                return {
                    ...b,
                    last_studied: a?.updated_at,
                    status: a?.status || 'ASSIGNED'
                };
            });

            // Sort by last studied first, then title
            formatted.sort((a, b) => {
                if (a.last_studied && b.last_studied) {
                    return new Date(b.last_studied).getTime() - new Date(a.last_studied).getTime();
                }
                if (a.last_studied) return -1;
                if (b.last_studied) return 1;
                return a.title.localeCompare(b.title);
            });

            setBooks(formatted);
        } catch (error) {
            console.error('Failed to fetch assigned books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        signOut();
        navigate('/student/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">학습 자료 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 leading-tight">G1230 학습관</h1>
                            <p className="text-xs text-indigo-600 font-bold">{student?.name} 학생</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="로그아웃"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen size={20} className="text-indigo-500" />
                            나의 학습 교재
                        </h2>
                        <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                            총 {books.length}권
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {books.map((book) => (
                            <button
                                key={book.id}
                                onClick={() => navigate(`/learn/vocab/${book.id}`)}
                                className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 group flex flex-col h-full active:scale-[0.98]"
                            >
                                <div className="flex-1">
                                    <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 ${book.category === 'VOCAB' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                                        }`}>
                                        {book.category}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-indigo-700 transition-colors">
                                        {book.title}
                                    </h3>

                                    <div className="flex flex-col gap-2 mt-4">
                                        {book.last_studied ? (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                                <Clock size={14} />
                                                마지막 학습: {new Date(book.last_studied).toLocaleDateString()}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                                                <BrainCircuit size={14} />
                                                새로 시작하기
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${book.status === 'COMPLETED' ? 'bg-green-500' :
                                            book.status === 'IN_PROGRESS' ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'
                                            }`} />
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {book.status === 'COMPLETED' ? '완료' :
                                                book.status === 'IN_PROGRESS' ? '학습 중' : '대기'}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </button>
                        ))}

                        {books.length === 0 && (
                            <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-10">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                                    <BookOpen size={40} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-400 mb-2">배정된 교재가 없습니다.</h3>
                                <p className="text-sm text-slate-300">선생님께 학습 교재 배정을 요청해 주세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="p-8 text-center">
                <p className="text-xs text-slate-300 font-medium">© 2026 G1230 English Class. All Rights Reserved.</p>
            </footer>
        </div>
    );
}
