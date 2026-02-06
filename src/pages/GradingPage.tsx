import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Save, CheckCircle, XCircle, ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker Setup for React-PDF
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

    // PDF State
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState(1.2);

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

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

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
                        <span className="text-xs text-slate-500 font-mono">Page {pageNumber} / {numPages}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-600"><ZoomOut size={18} /></button>
                        <span className="px-2 flex items-center text-xs font-medium text-slate-600">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-600"><ZoomIn size={18} /></button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
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
            <div className="flex-1 flex overflow-hidden">
                {/* Left: PDF Viewer */}
                <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8 relative">
                    {/* Page Navigation Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-20">
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                            className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30"
                        >
                            <ChevronLeft />
                        </button>
                        <span className="font-bold text-slate-700 w-16 text-center">{pageNumber}</span>
                        <button
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                            className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30"
                        >
                            <ChevronRight />
                        </button>
                    </div>

                    <Document
                        file={assessment.book.pdf_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="text-slate-500">PDF 로딩 중...</div>}
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-2xl"
                        />
                    </Document>
                </div>

                {/* Right: Grading Panel */}
                <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-slate-100 bg-white">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle className="text-green-500" size={18} />
                            채점하기
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {currentItems.length === 0 ? (
                            <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                                <span className="text-4xl mb-2">📝</span>
                                <p>등록된 문제가 없습니다.<br />다음 페이지로 넘어가보세요.</p>
                            </div>
                        ) : (
                            currentItems.map((item) => {
                                const uniqueId = `${item.qId}_${item.id}`;
                                const status = answers[uniqueId];

                                return (
                                    <div key={uniqueId} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                                                No.{item.itemId}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-slate-400 font-mono">
                                                    정답: {item.answer}
                                                </span>
                                                {item.concept && (
                                                    <span className="text-[10px] text-indigo-400 font-bold mt-1">
                                                        {item.concept}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-800 font-medium mb-4 leading-relaxed">
                                            {item.question}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleAnswerToggle(uniqueId, 'CORRECT', (item as any).concept)}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-bold transition-all ${status?.status === 'CORRECT'
                                                    ? 'bg-green-500 border-green-500 text-white shadow-md scale-[1.02]'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-500'
                                                    }`}
                                            >
                                                <CheckCircle size={18} />
                                                정답
                                            </button>
                                            <button
                                                onClick={() => handleAnswerToggle(uniqueId, 'WRONG', (item as any).concept)}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-bold transition-all ${status?.status === 'WRONG'
                                                    ? 'bg-red-500 border-red-500 text-white shadow-md scale-[1.02]'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500'
                                                    }`}
                                            >
                                                <XCircle size={18} />
                                                오답
                                            </button>
                                        </div>

                                        {status?.status === 'WRONG' && (
                                            <div className="mt-3 pt-3 border-t border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
                                                {['개념부족', '단순실수', '해석오류', '어휘부족'].map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => {
                                                            setAnswers(prev => ({
                                                                ...prev,
                                                                [uniqueId]: { ...prev[uniqueId], error_pattern: tag }
                                                            }));
                                                        }}
                                                        className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-colors ${status.error_pattern === tag
                                                            ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                                            : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'
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
                </div>
            </div>
        </div>
    );
}
