import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Save, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

// PDF viewer removed as requested

interface Question {
    id: string;
    page_number: number;
    content: {
        items: {
            itemId: string;
            question_number?: string;
            answer: string;
            question: string;
            type?: string;
            concept?: string;
        }[];
    };
}

interface AnswerSnapshot {
    status: 'CORRECT' | 'WRONG';
    concept?: string;
    updated_at: string;
    error_pattern?: string;
}

interface Assessment {
    id: string;
    student: { name: string };
    book: { id: string; title: string; pdf_url: string };
    details: {
        answers?: Record<string, AnswerSnapshot>;
    } | null;
    status: string;
}

export default function GradingPage() {
    const { assessmentId } = useParams();
    const navigate = useNavigate();

    // Navigation State
    const [pageNumber, setPageNumber] = useState<number>(1);

    // Data State
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerSnapshot>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Context for Class Grading
    const [searchParams] = useSearchParams();
    const classId = searchParams.get('classId');
    const [classmates, setClassmates] = useState<{ studentId: string; name: string; assessmentId: string }[]>([]);

    useEffect(() => {
        if (assessment && classId) {
            fetchClassmates();
        }
    }, [assessment, classId]);

    const fetchClassmates = async () => {
        if (!assessment || !classId) return;
        try {
            // 1. Get students in this class
            const { data: classCtx } = await supabase
                .from('class_students')
                .select('student_id')
                .eq('class_id', classId);

            if (!classCtx) return;
            const studentIds = classCtx.map(c => c.student_id);

            // 2. Get assessments for these students & book
            const { data: matesData } = await supabase
                .from('assessments')
                .select(`
                    id, 
                    student:students(id, name)
                `)
                .eq('book_id', assessment.book.id)
                .in('student_id', studentIds);

            if (matesData) {
                const formatted = matesData.map((m: any) => {
                    const s = Array.isArray(m.student) ? m.student[0] : m.student;
                    return {
                        studentId: s.id,
                        name: s.name,
                        assessmentId: m.id
                    };
                });
                formatted.sort((a, b) => a.name.localeCompare(b.name));
                setClassmates(formatted);
            }
        } catch (e) {
            console.error('Error fetching classmates:', e);
        }
    };

    useEffect(() => {
        if (assessmentId) fetchData();
    }, [assessmentId]);

    const fetchData = async () => {
        try {
            // 1. Fetch Assessment
            const { data: assessData, error: assessError } = await supabase
                .from('assessments')
                .select(`
                    id,
                    details,
                    status,
                    student:students(name),
                    book:books(id, title, pdf_url)
                `)
                .eq('id', assessmentId)
                .single();

            if (assessError) throw assessError;
            // Normalize data (Supabase sometimes returns arrays for joins)
            const assessDataAny = assessData as any;
            const bookCtx = Array.isArray(assessDataAny.book) ? assessDataAny.book[0] : assessDataAny.book;
            const studentCtx = Array.isArray(assessDataAny.student) ? assessDataAny.student[0] : assessDataAny.student;

            setAssessment({
                ...assessDataAny,
                book: bookCtx,
                student: studentCtx
            });
            if (assessData.details?.answers) {
                setAnswers(assessData.details.answers);
            }

            // 2. Fetch Questions for this Book
            const { data: qData, error: qError } = await supabase
                .from('questions')
                .select('*')
                .eq('book_id', bookCtx.id)
                .order('page_number');

            if (qError) throw qError;
            setQuestions(qData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerToggle = (uniqueId: string, status: 'CORRECT' | 'WRONG', concept?: string) => {
        setAnswers(prev => ({
            ...prev,
            [uniqueId]: {
                status,
                concept,
                updated_at: new Date().toISOString()
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Prepare current valid map
            const currentValidItems: { fullId: string, qNum: string, page: number }[] = questions.flatMap(q =>
                (q.content.items || []).map(item => ({
                    fullId: `${q.id}_${item.itemId || item.question_number || 'unknown'}`,
                    qNum: (item.itemId || item.question_number || 'unknown').toString(),
                    page: q.page_number
                }))
            );
            const allValidQuestionFullIds = new Set(currentValidItems.map(i => i.fullId));

            // 2. Filter and Migrate
            const filteredAnswers: Record<string, AnswerSnapshot> = {};
            Object.entries(answers).forEach(([key, val]) => {
                if (allValidQuestionFullIds.has(key)) {
                    // Exact match (Block ID still valid)
                    filteredAnswers[key] = val;
                } else {
                    // Try Migration: Find current question with same number in this book
                    const parts = key.split('_');
                    const potentialPage = parts.length > 1 ? parseInt(parts[0]) : null;
                    const qNum = parts.length > 1 ? parts[1] : key;

                    let matchingItem = null;
                    if (potentialPage !== null && !isNaN(potentialPage)) {
                        // Priority: Same Page match
                        matchingItem = currentValidItems.find(i => i.page === potentialPage && i.qNum === qNum);
                    }

                    if (!matchingItem) {
                        // Fallback: Global match
                        matchingItem = currentValidItems.find(i => i.qNum === qNum);
                    }

                    if (matchingItem) {
                        console.log(`Migrating answer: ${key} -> ${matchingItem.fullId}`);
                        filteredAnswers[matchingItem.fullId] = val;
                    } else {
                        console.warn(`Stale answer discarded: ${key}`);
                    }
                }
            });

            // 3. Calculate Score
            const correctCount = Object.values(filteredAnswers).filter(a => a.status === 'CORRECT').length;
            // Note: score is usually based on TOTAL book items for completion, 
            // but let's stick to 'answered correct rate' for now or 'total items'
            const totalItemsCount = currentValidItems.length;
            const score = totalItemsCount > 0 ? Math.round((correctCount / totalItemsCount) * 100) : 0;

            // 4. Update Supabase
            const { error } = await supabase
                .from('assessments')
                .update({
                    details: { answers: filteredAnswers },
                    score,
                    status: 'IN_PROGRESS',
                    updated_at: new Date().toISOString()
                })
                .eq('id', assessmentId);

            if (error) throw error;

            setAnswers(filteredAnswers);
            alert(`저장이 완료되었습니다.\n분석 결과: 현재 ${totalItemsCount}문항 중 ${correctCount}문항 정답 (성적: ${score}점)`);
        } catch (error) {
            console.error('Save Error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const currentQuestions = useMemo(() => {
        return questions.filter(q => q.page_number === pageNumber);
    }, [questions, pageNumber]);

    // Flatten items for rendering
    const currentItems = useMemo(() => {
        return currentQuestions.flatMap(q => {
            const items = q.content.items || [];
            return items.map(item => ({
                ...item,
                qId: q.id,
                // [STABLE ID] itemId is preferred, question_number as fallback
                id: item.itemId || item.question_number || 'unknown'
            }));
        });
    }, [currentQuestions]);

    const maxPage = useMemo(() => {
        return questions.length > 0 ? Math.max(...questions.map(q => q.page_number)) : 20;
    }, [questions]);

    if (loading) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;
    if (!assessment) return <div className="flex h-screen items-center justify-center">과제를 찾을 수 없습니다.</div>;

    return (
        <div className="flex h-screen bg-slate-100 flex-col">
            {/* Toolbar */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg">{assessment.student.name} - {assessment.book.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">번호 {pageNumber}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={pageNumber <= 1}
                                    onClick={() => setPageNumber(p => p - 1)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    disabled={pageNumber >= maxPage}
                                    onClick={() => setPageNumber(p => p + 1)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                        <Save size={18} />
                        {saving ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </div>

            {/* Student Tabs (Class Context) */}
            {classmates.length > 0 && (
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 overflow-x-auto shadow-[0_2px_4px_rgba(0,0,0,0.02)] z-10 shrink-0">
                    <span className="text-xs font-bold text-slate-400 shrink-0">학생 목록</span>
                    <div className="flex gap-2">
                        {classmates.map(mate => (
                            <button
                                key={mate.assessmentId}
                                onClick={() => navigate(`/grading/${mate.assessmentId}?classId=${classId}`)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${mate.assessmentId === assessment.id
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-105'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}
                            >
                                {mate.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            {/* Main Content: Full-Width 3-Column Grid */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentItems.length === 0 ? (
                            <div className="col-span-full text-center text-slate-400 py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <span className="text-5xl mb-4 block">📝</span>
                                <p className="text-lg font-medium">이 페이지에는 등록된 문제가 없습니다.</p>
                                <p className="text-sm mt-1">상단 화살표를 눌러 다른 페이지로 이동해 보세요.</p>
                            </div>
                        ) : (
                            currentItems.map((item) => {
                                const uniqueId = `${item.qId}_${item.id}`;
                                const status = answers[uniqueId];

                                return (
                                    <div key={uniqueId} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="bg-brand-50 text-brand-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                                No.{item.itemId}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                                                    정답: {item.answer}
                                                </span>
                                                {item.concept && (
                                                    <span className="text-[10px] text-brand-500 font-black mt-2 bg-brand-50 px-2 py-0.5 rounded">
                                                        {item.concept}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-base text-slate-800 font-semibold mb-6 leading-relaxed flex-1 italic">
                                            "{item.question}"
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-4">
                                            <button
                                                onClick={() => handleAnswerToggle(uniqueId, 'CORRECT', (item as any).concept)}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black transition-all ${status?.status === 'CORRECT'
                                                    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100 scale-[1.03]'
                                                    : 'bg-white border-slate-100 text-slate-300 hover:border-green-200 hover:text-green-500'
                                                    }`}
                                            >
                                                <CheckCircle size={20} />
                                                정답
                                            </button>
                                            <button
                                                onClick={() => handleAnswerToggle(uniqueId, 'WRONG', (item as any).concept)}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-black transition-all ${status?.status === 'WRONG'
                                                    ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100 scale-[1.03]'
                                                    : 'bg-white border-slate-100 text-slate-300 hover:border-red-200 hover:text-red-500'
                                                    }`}
                                            >
                                                <XCircle size={20} />
                                                오답
                                            </button>
                                        </div>

                                        {status?.status === 'WRONG' && (
                                            <div className="mt-2 pt-4 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                                                {['개념부족', '단순실수', '해석오류', '어휘부족'].map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => {
                                                            setAnswers(prev => ({
                                                                ...prev,
                                                                [uniqueId]: { ...prev[uniqueId], error_pattern: tag }
                                                            }));
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${status.error_pattern === tag
                                                            ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-800 ring-offset-1'
                                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Navigation */}
                    <div className="mt-12 flex justify-center py-8 border-t border-slate-200">
                        <div className="flex items-center gap-8 bg-white px-8 py-3 rounded-2xl shadow-sm border border-slate-200">
                            <button
                                disabled={pageNumber <= 1}
                                onClick={() => setPageNumber(p => p - 1)}
                                className="flex items-center gap-2 font-bold text-slate-600 hover:text-brand-600 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={24} />
                                이전
                            </button>
                            <div className="h-6 w-px bg-slate-200" />
                            <span className="text-xl font-black text-slate-800 min-w-16 text-center">
                                {pageNumber} <span className="text-slate-300 font-normal">/</span> {maxPage}
                            </span>
                            <div className="h-6 w-px bg-slate-200" />
                            <button
                                disabled={pageNumber >= maxPage}
                                onClick={() => setPageNumber(p => p + 1)}
                                className="flex items-center gap-2 font-bold text-slate-600 hover:text-brand-600 disabled:opacity-30 transition-colors"
                            >
                                다음
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
