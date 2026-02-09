import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, Search, X, FolderPlus, Folder, ChevronRight, UserPlus, Users, ChevronLeft, Trash2, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Class {
    id: string;
    name: string;
    teacher_id: string;
    student_count?: number;
}

interface Student {
    id: string;
    name: string;
    grade: string;
    assessments?: Assessment[];
}

interface Book {
    id: string;
    title: string;
    category: string;
}

interface Assessment {
    id: string;
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
    book_id: string;
    student_id?: string;
    details?: {
        answers?: Record<string, 'CORRECT' | 'WRONG' | { status: 'CORRECT' | 'WRONG', updated_at: string }>;
    };
}

// Updated interfaces for Item-level paging
interface QuestionItem {
    question_number: string;
    answer: string;
    question: string;
    type?: string;
    page: number; // Page is now expected on the item level
    options?: string[];
    concept?: string;
    // Helper for internal use
    blockId?: string;
}

interface QuestionBlock {
    id: string;
    page_number: number;
    content: {
        items: QuestionItem[];
    };
}

export default function LearningPage() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    const [classes, setClasses] = useState<Class[]>([]);
    const [classStudents, setClassStudents] = useState<Student[]>([]);
    const [classBooks, setClassBooks] = useState<Book[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allBooks, setAllBooks] = useState<Book[]>([]);

    const [isCreateClassMode, setIsCreateClassMode] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [isAddStudentMode, setIsAddStudentMode] = useState(false);
    const [isAddBookMode, setIsAddBookMode] = useState(false);

    const [deletingClass, setDeletingClass] = useState<Class | null>(null);

    const [selectedStudentIdsToClass, setSelectedStudentIdsToClass] = useState<string[]>([]);
    const [selectedBookIdToClass, setSelectedBookIdToClass] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [activePage, setActivePage] = useState<number>(1);

    // We now store flattened items for valid pages
    const [allBookItems, setAllBookItems] = useState<QuestionItem[]>([]);
    // We compute available pages from items
    const [availablePages, setAvailablePages] = useState<number[]>([]);

    const [gradingLoading, setGradingLoading] = useState(false);

    useEffect(() => {
        if (user) fetchClasses();
    }, [user, role]);

    useEffect(() => {
        if (selectedClass) {
            fetchClassDetails(selectedClass.id);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        if (!user) return;
        let query = supabase.from('classes').select('*, class_students(count)').eq('class_type', 'MAIN');
        if (role !== 'admin') {
            query = query.eq('teacher_id', user.id);
        }
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching classes:', error);
            return;
        }
        const formatted = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            teacher_id: c.teacher_id,
            student_count: c.class_students[0]?.count || 0
        }));
        setClasses(formatted);
    };

    useEffect(() => {
        if (expandedBookId) {
            fetchBookQuestions(expandedBookId);
            if (classStudents.length > 0) {
                setActiveStudentId(classStudents[0].id);
            }
        }
    }, [expandedBookId]);

    const fetchBookQuestions = async (bookId: string) => {
        setGradingLoading(true);
        const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('book_id', bookId);

        if (data) {
            // Flatten all items from all blocks
            const items: QuestionItem[] = (data as QuestionBlock[]).flatMap(block =>
                (block.content.items || []).map(item => ({
                    ...item,
                    blockId: block.id,
                    // If item.page is missing, fallback to block.page_number
                    page: item.page || block.page_number
                }))
            );

            // Sort items by page then by number (numeric sort try)
            items.sort((a, b) => {
                if (a.page !== b.page) return a.page - b.page;
                // Try to parse question_number as integer for sorting
                const numA = parseInt(a.question_number) || 0;
                const numB = parseInt(b.question_number) || 0;
                return numA - numB;
            });

            setAllBookItems(items);

            // Extract unique pages
            const pages = Array.from(new Set(items.map(i => i.page))).sort((a, b) => a - b);
            setAvailablePages(pages);

            if (pages.length > 0) {
                // If current page is not in new list, switch to first
                if (!pages.includes(activePage)) {
                    setActivePage(pages[0]);
                }
            } else {
                setActivePage(1);
            }
        }
        setGradingLoading(false);
    };

    const fetchClassDetails = async (classId: string) => {
        const { data: studentsData } = await supabase
            .from('class_students')
            .select(`
                student:students (
                    id, name, grade,
                    assessments (id, status, book_id, details)
                )
            `)
            .eq('class_id', classId);

        const students = studentsData?.map((d: any) => d.student).filter(Boolean) || [];
        students.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setClassStudents(students);

        const { data: booksData } = await supabase
            .from('class_books')
            .select(`book:books (id, title, category)`)
            .eq('class_id', classId);

        const books = booksData?.map((d: any) => d.book).filter(Boolean) || [];
        setClassBooks(books);
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim() || !user) return;
        try {
            const { error } = await supabase.from('classes').insert({
                name: newClassName,
                teacher_id: user.id
            });
            if (error) throw error;
            setIsCreateClassMode(false);
            setNewClassName('');
            fetchClasses();
        } catch (e) {
            alert('반 생성 실패');
        }
    };

    const handleDeleteClass = async () => {
        if (!deletingClass) return;
        try {
            const { error } = await supabase
                .from('classes')
                .delete()
                .eq('id', deletingClass.id);

            if (error) throw error;
            setDeletingClass(null);
            fetchClasses();
        } catch (e) {
            console.error('Error deleting class:', e);
            alert('반 삭제에 실패했습니다.');
        }
    };

    const handleAddStudentsToClass = async () => {
        if (!selectedClass || selectedStudentIdsToClass.length === 0) return;
        try {
            const links = selectedStudentIdsToClass.map(sid => ({
                class_id: selectedClass.id,
                student_id: sid
            }));
            const { error } = await supabase.from('class_students').insert(links);
            if (error) throw error;

            if (classBooks.length > 0) {
                const newAssessments: any[] = [];
                for (const studentId of selectedStudentIdsToClass) {
                    for (const book of classBooks) {
                        newAssessments.push({
                            student_id: studentId,
                            book_id: book.id,
                            status: 'ASSIGNED'
                        });
                    }
                }
                if (newAssessments.length > 0) {
                    await supabase.from('assessments').upsert(newAssessments, { onConflict: 'student_id, book_id', ignoreDuplicates: true });
                }
            }
            setIsAddStudentMode(false);
            setSelectedStudentIdsToClass([]);
            fetchClassDetails(selectedClass.id);
            alert(`${links.length}명의 학생을 추가했습니다.`);
        } catch (e) {
            console.error(e);
            alert('학생 추가 실패');
        }
    };

    const handleAssignBookToClass = async () => {
        if (!selectedClass || !selectedBookIdToClass) return;
        try {
            const { error } = await supabase.from('class_books').insert({
                class_id: selectedClass.id,
                book_id: selectedBookIdToClass
            });
            if (error) throw error;
            if (classStudents.length > 0) {
                const newAssessments = classStudents.map(student => ({
                    student_id: student.id,
                    book_id: selectedBookIdToClass,
                    status: 'ASSIGNED'
                }));
                await supabase.from('assessments').upsert(newAssessments, { onConflict: 'student_id, book_id', ignoreDuplicates: true });
            }
            setIsAddBookMode(false);
            setSelectedBookIdToClass('');
            fetchClassDetails(selectedClass.id);
            alert('교재를 배정했습니다.');
        } catch (e) {
            alert('교재 배정 실패');
        }
    };

    const handleRemoveStudentFromClass = async (studentId: string) => {
        if (!selectedClass || !confirm('정말 이 학생을 반에서 제외하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('class_students')
                .delete()
                .eq('class_id', selectedClass.id)
                .eq('student_id', studentId);
            if (error) throw error;
            fetchClassDetails(selectedClass.id);
        } catch (e) {
            console.error(e);
            alert('학생 제외 실패');
        }
    };

    const handleRemoveBookFromClass = async (bookId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedClass || !confirm('정말 이 교재를 반에서 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('class_books')
                .delete()
                .eq('class_id', selectedClass.id)
                .eq('book_id', bookId);
            if (error) throw error;
            fetchClassDetails(selectedClass.id);
            if (expandedBookId === bookId) setExpandedBookId(null);
        } catch (e) {
            console.error(e);
            alert('교재 삭제 실패');
        }
    };

    const handleGrade = async (studentId: string, itemUniqueId: string, status: 'CORRECT' | 'WRONG') => {
        setClassStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            const targetAssessment = s.assessments?.find(a => a.book_id === expandedBookId);
            if (!targetAssessment) return s;
            const newDetails = {
                ...targetAssessment.details,
                answers: {
                    ...(targetAssessment.details?.answers || {}),
                    [itemUniqueId]: {
                        status,
                        updated_at: new Date().toISOString()
                    }
                }
            };
            return {
                ...s,
                assessments: s.assessments?.map(a => a.book_id === expandedBookId ? { ...a, details: newDetails, status: 'IN_PROGRESS' } : a)
            };
        }));
        const student = classStudents.find(s => s.id === studentId);
        const assessment = student?.assessments?.find(a => a.book_id === expandedBookId);
        if (assessment) {
            const newAnswers = {
                ...(assessment.details?.answers || {}),
                [itemUniqueId]: {
                    status,
                    updated_at: new Date().toISOString()
                }
            };
            const { error } = await supabase.from('assessments').update({
                details: { answers: newAnswers },
                status: 'IN_PROGRESS',
                updated_at: new Date().toISOString()
            }).eq('id', assessment.id);
            if (error) console.error('Grading save failed', error);
        }
    };

    const handleBatchGrade = async (status: 'CORRECT' | 'WRONG') => {
        if (!activeStudentId || !expandedBookId) return;

        // Filter items by active page
        const pageItems = allBookItems.filter(i => i.page === activePage);

        const currentStudent = classStudents.find(s => s.id === activeStudentId);
        if (!currentStudent) return;
        const currentAssessment = currentStudent.assessments?.find(a => a.book_id === expandedBookId);
        if (!currentAssessment) return;

        // Create a set of currently valid uniqueIds for this book
        const allValidIds = new Set(allBookItems.map(i => `${i.blockId}_${i.question_number}`));

        const currentAnswers = currentAssessment.details?.answers || {};
        const newAnswers: Record<string, any> = {};

        // 1. Preserve only valid existing answers (Cleanup)
        Object.entries(currentAnswers).forEach(([key, val]) => {
            if (allValidIds.has(key)) {
                newAnswers[key] = val;
            }
        });

        let hasChanges = Object.keys(newAnswers).length !== Object.keys(currentAnswers).length;

        // 2. Add new batch grades
        pageItems.forEach((item) => {
            const uniqueId = `${item.blockId}_${item.question_number}`;
            // Mark only if not already graded
            if (!newAnswers[uniqueId]) {
                newAnswers[uniqueId] = {
                    status,
                    updated_at: new Date().toISOString()
                };
                hasChanges = true;
            }
        });

        if (!hasChanges) return;

        setClassStudents(prev => prev.map(s => {
            if (s.id !== activeStudentId) return s;
            return {
                ...s,
                assessments: s.assessments?.map(a => a.book_id === expandedBookId ? { ...a, details: { ...a.details, answers: newAnswers }, status: 'IN_PROGRESS' } : a)
            };
        }));

        const { error } = await supabase.from('assessments').update({
            details: { answers: newAnswers },
            status: 'IN_PROGRESS',
            updated_at: new Date().toISOString()
        }).eq('id', currentAssessment.id);

        if (error) console.error('Batch grading save failed', error);
    };

    const openAddStudentModal = async () => {
        const currentIds = classStudents.map(s => s.id);
        const { data } = await supabase.from('students').select('*').eq('status', 'ACTIVE');
        if (data) {
            setAllStudents(data.filter(s => !currentIds.includes(s.id)));
        }
        setIsAddStudentMode(true);
    };

    const openAddBookModal = async () => {
        const currentIds = classBooks.map(b => b.id);
        const { data } = await supabase.from('books').select('id, title, category');
        if (data) {
            setAllBooks(data.filter(b => !currentIds.includes(b.id)));
        }
        setIsAddBookMode(true);
    };

    if (viewMode === 'list') {
        return (
            <div className="max-w-7xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Folder className="text-indigo-600" />
                        나의 클래스
                    </h1>
                    <button onClick={() => setIsCreateClassMode(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                        <FolderPlus size={20} /> 반 만들기
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {classes.map(cls => (
                        <div key={cls.id} className="relative group">
                            <div
                                onClick={() => { setSelectedClass(cls); setViewMode('detail'); }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer h-full"
                            >
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Folder size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{cls.name}</h3>
                                <p className="text-slate-500 text-sm">{cls.student_count}명의 학생</p>
                            </div>

                            {/* High-Visibility Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingClass(cls);
                                }}
                                className="absolute top-4 right-4 p-2 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white shadow-sm border border-red-100"
                                title="반 삭제"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {classes.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Folder size={48} className="mx-auto mb-4 opacity-50" />
                            <p>생성된 반이 없습니다.</p>
                            <p className="text-sm mt-2">새로운 반을 만들어 학생들을 관리해보세요.</p>
                        </div>
                    )}
                </div>

                {isCreateClassMode && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderPlus className="text-indigo-600" size={32} />
                            </div>
                            <h2 className="text-xl font-bold mb-2">새로운 반 만들기</h2>
                            <p className="text-sm text-slate-500 mb-6">학생들을 관리할 반 이름을 입력해주세요.</p>
                            <input autoFocus type="text" placeholder="반 이름 (예: 중등 1학년 A반)" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-4" />
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreateClassMode(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200">취소</button>
                                <button onClick={handleCreateClass} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">생성하기</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Class Delete Confirmation Modal */}
                {deletingClass && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                    <Trash2 className="text-red-600" size={36} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">반 삭제 확인</h3>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    <span className="font-bold text-slate-900">'{deletingClass.name}'</span> 반을 정말 삭제하시겠습니까?<br />
                                    반을 삭제해도 학생이나 교재 본체는 삭제되지 않지만, 해당 반의 <span className="text-red-500 font-bold">배정 정보가 모두 사라집니다.</span>
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeletingClass(null)}
                                        className="flex-1 px-4 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleDeleteClass}
                                        className="flex-1 px-4 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                    >
                                        삭제하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Filter Items for Current Page
    const currentItems = allBookItems.filter(i => i.page === activePage);

    return (
        <div className="w-full h-full flex flex-col px-6 pt-2 pb-6">
            <div className="flex items-center gap-4 mb-2 shrink-0">
                <button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Folder className="text-indigo-600" size={20} />
                    {selectedClass?.name}
                </h1>
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {classStudents.length}명
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                {/* Left Col: Sidebar (Fixed Width) */}
                <div className="lg:w-[240px] shrink-0 flex flex-col gap-4 overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0">
                        <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                <Users size={14} /> 학생 목록
                            </h3>
                            <button onClick={openAddStudentModal} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg">
                                <UserPlus size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                            {classStudents.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => setActiveStudentId(student.id)}
                                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group cursor-pointer border-2 mb-1 ${activeStudentId === student.id
                                        ? 'bg-indigo-50 border-indigo-500'
                                        : 'hover:bg-slate-50 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-[9px]">
                                            {student.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-xs">{student.name}</div>
                                            <div className="text-[9px] text-slate-400">{student.grade}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStudentFromClass(student.id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                        title="반에서 제외"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col shrink-0 min-h-0 max-h-[40%]">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <BookOpen size={16} /> 교재 관리
                            </h3>
                            <button onClick={openAddBookModal} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg">
                                <FolderPlus size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                            {classBooks.map(book => (
                                <div
                                    key={book.id}
                                    onClick={() => setExpandedBookId(expandedBookId === book.id ? null : book.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors group border-2 cursor-pointer ${expandedBookId === book.id
                                        ? 'bg-indigo-50 border-indigo-500'
                                        : 'hover:bg-slate-50 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${expandedBookId === book.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <BookOpen size={14} />
                                        </div>
                                        <span className={`text-xs font-bold truncate ${expandedBookId === book.id ? 'text-indigo-900' : 'text-slate-700'}`}>{book.title}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/learn/vocab/${book.id}`);
                                            }}
                                            className="mr-1 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors z-50 flex items-center gap-1"
                                            title="단어 학습(학생뷰)"
                                        >
                                            <BrainCircuit size={14} />
                                            <span className="text-[10px] font-bold">STUDY</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveBookFromClass(book.id, e);
                                            }}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="교재 해제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className={`p-1 rounded-lg transition-colors ${expandedBookId === book.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            <ChevronRight size={14} className={`transition-transform ${expandedBookId === book.id ? 'rotate-90' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Col: Grading Area (Fluid Expansion) */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] lg:h-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 truncate">
                            {expandedBookId ? (
                                <span className="flex items-center gap-2">
                                    <BookOpen className="text-indigo-600" size={20} />
                                    {classBooks.find(b => b.id === expandedBookId)?.title}
                                </span>
                            ) : (
                                "교재를 선택하여 채점을 시작하세요"
                            )}
                        </h2>
                    </div>

                    {expandedBookId ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Student Tabs */}
                            <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50 shrink-0">
                                {classStudents.map(s => {
                                    const hasAssignment = s.assessments?.some(a => a.book_id === expandedBookId);
                                    return (
                                        <button key={s.id} onClick={() => hasAssignment ? setActiveStudentId(s.id) : alert('이 학생은 교재가 배정되지 않았습니다. 관리탭에서 추가해주세요.')} className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeStudentId === s.id ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-50 ' + (!hasAssignment ? 'opacity-50 cursor-not-allowed' : '')}`}>
                                            <div className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${activeStudentId === s.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                                {s.name[0]}
                                            </div>
                                            {s.name}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* Page Sidebar */}
                                <div className="w-32 border-r border-slate-100 overflow-y-auto bg-slate-50 shrink-0">
                                    {availablePages.length > 0 ? (
                                        availablePages.map(pageNum => (
                                            <button key={pageNum} onClick={() => setActivePage(pageNum)} className={`w-full text-center py-4 text-sm font-bold border-b border-slate-100 hover:bg-white transition-colors relative flex items-center justify-between px-4 ${activePage === pageNum ? 'bg-white text-indigo-600' : 'text-slate-500'}`}>
                                                {activePage === pageNum && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                                                )}
                                                <span>{pageNum}P</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">문항 없음</div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto flex flex-col bg-white relative">
                                    {gradingLoading ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                                        </div>
                                    ) : null}

                                    {!gradingLoading && currentItems.length > 0 ? (
                                        <div className="flex-1 flex flex-col">
                                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-slate-800">{activePage} 페이지</span>
                                                    <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-full">
                                                        총 {currentItems.length}문항
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleBatchGrade('CORRECT')} className="px-3 py-1.5 rounded-lg text-sm font-bold border border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1">
                                                        <CheckCircle size={16} /> 전체 O
                                                    </button>
                                                    <button onClick={() => handleBatchGrade('WRONG')} className="px-3 py-1.5 rounded-lg text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1">
                                                        <XCircle size={16} /> 전체 X
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {currentItems.map((item, index) => {
                                                    const uniqueId = `${item.blockId}_${item.question_number}`;
                                                    const renderKey = `${uniqueId}_${index}`;

                                                    const activeStudent = classStudents.find(s => s.id === activeStudentId);
                                                    const assessment = activeStudent?.assessments?.find(a => a.book_id === expandedBookId);

                                                    const statusData = assessment?.details?.answers?.[uniqueId];
                                                    const status = (statusData && typeof statusData === 'object') ? (statusData as any).status : statusData;

                                                    const isNumeric = /^\d+$/.test(item.answer || '');

                                                    return (
                                                        <div key={renderKey} className="flex flex-col p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all group shadow-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500">
                                                                        {item.question_number}
                                                                    </div>
                                                                    <div className={`font-black tracking-tight ${isNumeric ? 'text-2xl text-slate-700' : 'text-sm text-slate-500'}`}>
                                                                        {item.answer}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    disabled={!activeStudentId}
                                                                    onClick={() => activeStudentId && handleGrade(activeStudentId, uniqueId, 'CORRECT')}
                                                                    className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all font-black text-base ${status === 'CORRECT'
                                                                        ? 'bg-green-500 text-white shadow-sm'
                                                                        : 'bg-slate-50 text-slate-300 hover:bg-green-50 hover:text-green-500'
                                                                        }`}
                                                                >
                                                                    O
                                                                </button>
                                                                <button
                                                                    disabled={!activeStudentId}
                                                                    onClick={() => activeStudentId && handleGrade(activeStudentId, uniqueId, 'WRONG')}
                                                                    className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all font-black text-base ${status === 'WRONG'
                                                                        ? 'bg-red-500 text-white shadow-sm'
                                                                        : 'bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500'
                                                                        }`}
                                                                >
                                                                    X
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {currentItems.length === 0 && (
                                                <div className="text-center py-20 text-slate-400">문항이 없습니다.</div>
                                            )}
                                        </div>
                                    ) : (
                                        !gradingLoading && <div className="text-center py-20 text-slate-400">페이지를 선택해주세요.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <BookOpen size={64} className="mb-4" />
                            <p>왼쪽 목록에서 교재를 선택해주세요.</p>
                        </div>
                    )}
                </div>
            </div>

            {isAddStudentMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">학생 추가</h2>
                            <button onClick={() => setIsAddStudentMode(false)}><X size={20} /></button>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input autoFocus type="text" placeholder="이름으로 학생 검색..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 min-h-[150px] border rounded-xl p-2">
                            <h4 className="text-xs font-bold text-slate-400 mb-2">검색 결과</h4>
                            {allStudents.filter(s => s.name.includes(searchTerm || '') && !selectedStudentIdsToClass.includes(s.id)).map(s => (
                                <div key={s.id} className="p-3 border-b last:border-0 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setSelectedStudentIdsToClass(prev => [...prev, s.id])}>
                                    <div>
                                        <div className="font-bold text-sm">{s.name}</div>
                                        <div className="text-xs text-slate-500">{s.grade}</div>
                                    </div>
                                    <div className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs font-bold">+ 추가</div>
                                </div>
                            ))}
                            {allStudents.filter(s => s.name.includes(searchTerm || '') && !selectedStudentIdsToClass.includes(s.id)).length === 0 && (
                                <p className="text-center text-slate-300 text-sm py-4">검색 결과가 없습니다.</p>
                            )}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4 max-h-[150px] overflow-y-auto">
                            <h4 className="text-xs font-bold text-slate-500 mb-2 flex justify-between">
                                <span>선택된 학생 ({selectedStudentIdsToClass.length}명)</span>
                                {selectedStudentIdsToClass.length > 0 && (
                                    <button onClick={() => setSelectedStudentIdsToClass([])} className="text-red-500 hover:underline">전체 취소</button>
                                )}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedStudentIdsToClass.map(sid => {
                                    const student = allStudents.find(s => s.id === sid);
                                    if (!student) return null;
                                    return (
                                        <span key={sid} className="bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                                            {student.name}
                                            <button onClick={() => setSelectedStudentIdsToClass(prev => prev.filter(id => id !== sid))} className="hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        </span>
                                    );
                                })}
                                {selectedStudentIdsToClass.length === 0 && (
                                    <p className="text-slate-400 text-sm">추가할 학생을 검색하여 선택해주세요.</p>
                                )}
                            </div>
                        </div>
                        <button onClick={handleAddStudentsToClass} disabled={selectedStudentIdsToClass.length === 0} className="bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors">
                            {selectedStudentIdsToClass.length}명 반에 등록하기
                        </button>
                    </div>
                </div>
            )}

            {isAddBookMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">교재 배정</h2>
                            <button onClick={() => setIsAddBookMode(false)}><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 pr-2">
                            {['GRAMMAR', 'READING', 'WORD', 'LISTENING'].map(category => {
                                const categoryBooks = allBooks.filter(b => b.category === category);
                                if (categoryBooks.length === 0) return null;
                                const label = { GRAMMAR: '문법', READING: '독해', WORD: '단어', LISTENING: '듣기' }[category] || category;
                                return (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2 border-b pb-2">
                                            <Folder size={20} className="text-indigo-500 fill-indigo-100" /> {label}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {categoryBooks.map(b => (
                                                <div key={b.id} onClick={() => setSelectedBookIdToClass(b.id)} className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedBookIdToClass === b.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                                                    <span className={`font-bold ${selectedBookIdToClass === b.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                        {b.title}
                                                    </span>
                                                    {selectedBookIdToClass === b.id && <div className="w-3 h-3 rounded-full bg-indigo-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                            {allBooks.length === 0 && (
                                <div className="text-center py-20 text-slate-400 opacity-60">
                                    <BookOpen size={48} className="mx-auto mb-4" />
                                    <p>추가할 수 있는 교재가 없습니다.</p>
                                    <p className="text-sm">모든 교재가 이미 배정되었거나 등록된 교재가 없습니다.</p>
                                </div>
                            )}
                        </div>
                        <button onClick={handleAssignBookToClass} disabled={!selectedBookIdToClass} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors">
                            선택한 교재 배정하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
