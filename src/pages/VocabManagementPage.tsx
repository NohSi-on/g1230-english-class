import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, X, FolderPlus, ChevronRight, ChevronLeft, Trash2, BrainCircuit, Book, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface VocabGroup {
    id: string;
    name: string;
    teacher_id: string;
    vocab_book_id: string;
    student_count?: number;
    book_title?: string;
}

interface Student {
    id: string;
    name: string;
    grade: string;
}

interface BookData {
    id: string;
    title: string;
    category: string;
}

export default function VocabManagementPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState<VocabGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Group State
    const [isCreateMode, setIsCreateMode] = useState(false);
    const [allBooks, setAllBooks] = useState<BookData[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [memberships, setMemberships] = useState<Record<string, { groupName: string, bookTitle: string }>>({});

    const [step, setStep] = useState<'book' | 'students'>('book');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [groupName, setGroupName] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    const [deletingGroup, setDeletingGroup] = useState<VocabGroup | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'info' | 'warning' } | null>(null);

    useEffect(() => {
        if (user) fetchVocabGroups();
    }, [user]);

    // Role Toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchVocabGroups = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('classes')
            .select('*, books(title), class_students(count)')
            .eq('class_type', 'VOCAB')
            .order('created_at', { ascending: false });

        if (data) {
            setGroups(data.map((g: any) => ({
                id: g.id,
                name: g.name,
                teacher_id: g.teacher_id,
                vocab_book_id: g.vocab_book_id,
                book_title: g.books?.title || 'Unknown Book',
                student_count: g.class_students[0]?.count || 0
            })));
        }
        setLoading(false);
    };

    const openCreateModal = async () => {
        const { data: booksData } = await supabase.from('books').select('id, title, category');
        const { data: studentsData } = await supabase.from('students').select('id, name, grade').eq('status', 'ACTIVE');

        // Fetch existing VOCAB memberships
        const { data: membershipData } = await supabase
            .from('class_students')
            .select('student_id, classes!inner(name, class_type, books(title))')
            .eq('classes.class_type', 'VOCAB');

        if (membershipData) {
            const map: Record<string, { groupName: string, bookTitle: string }> = {};
            membershipData.forEach((m: any) => {
                map[m.student_id] = {
                    groupName: m.classes.name,
                    bookTitle: m.classes.books?.title || 'Unknown'
                };
            });
            setMemberships(map);
        }

        if (booksData) setAllBooks(booksData);
        if (studentsData) setAllStudents(studentsData);
        setIsCreateMode(true);
        setStep('book');
    };

    const handleCreateGroup = async () => {
        if (!selectedBookId || !groupName.trim() || !user) return;

        try {
            // 1. Create the class of type VOCAB
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .insert({
                    name: groupName,
                    teacher_id: user.id,
                    class_type: 'VOCAB',
                    vocab_book_id: selectedBookId
                })
                .select()
                .single();

            if (classError) throw classError;

            // 2. Add students
            if (selectedStudentIds.length > 0) {
                const links = selectedStudentIds.map((sid: string) => ({
                    class_id: classData.id,
                    student_id: sid
                }));
                await supabase.from('class_students').insert(links);

                // 3. Optional: Auto-assign the book as an assessment for these students
                const assessments = selectedStudentIds.map((sid: string) => ({
                    student_id: sid,
                    book_id: selectedBookId,
                    status: 'ASSIGNED'
                }));
                await supabase.from('assessments').upsert(assessments, { onConflict: 'student_id, book_id' });
            }

            setIsCreateMode(false);
            resetForm();
            fetchVocabGroups();
            setToast({ message: '단어 학습 그룹이 생성되었습니다.', type: 'info' });
        } catch (e) {
            console.error(e);
            alert('그룹 생성 실패');
        }
    };

    const resetForm = () => {
        setStep('book');
        setSelectedBookId('');
        setGroupName('');
        setSelectedStudentIds([]);
    };

    const handleDeleteGroup = async () => {
        if (!deletingGroup) return;
        const { error } = await supabase.from('classes').delete().eq('id', deletingGroup.id);
        if (!error) {
            setDeletingGroup(null);
            fetchVocabGroups();
            setToast({ message: '그룹이 삭제되었습니다.', type: 'info' });
        }
    };

    const toggleStudent = (student: Student) => {
        const isSelected = selectedStudentIds.includes(student.id);
        const existing = memberships[student.id];

        if (!isSelected && existing) {
            setToast({
                message: `${student.name} 학생은 이미 '${existing.bookTitle}' 그룹에 속해 있습니다.`,
                type: 'warning'
            });
        }

        setSelectedStudentIds(prev =>
            isSelected
                ? prev.filter(id => id !== student.id)
                : [...prev, student.id]
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-8 relative">
            {/* Toast System */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
                {toast && (
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-in slide-in-from-bottom-4 transition-all duration-300 ${toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                        {toast.type === 'warning' ? <AlertCircle size={20} /> : <Book size={20} />}
                        {toast.message}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600" />
                        단어 학습 관리
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">학생별 맞춤 단어장을 배정하고 진도를 관리합니다.</p>
                </div>
                <button onClick={openCreateModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-lg shadow-indigo-100">
                    <FolderPlus size={20} /> 새 그룹 만들기
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20">로딩 중...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="relative group">
                            <div
                                onClick={() => navigate(`/learn/vocab/${group.vocab_book_id}`)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer h-full"
                            >
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Book size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{group.name}</h3>
                                <div className="space-y-1">
                                    <p className="text-indigo-600 text-xs font-bold truncate flex items-center gap-1">
                                        <BookOpen size={12} /> {group.book_title}
                                    </p>
                                    <p className="text-slate-500 text-[11px] font-medium">{group.student_count}명의 학생 배정됨</p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setDeletingGroup(group); }}
                                className="absolute top-4 right-4 p-2 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white shadow-sm border border-red-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <BrainCircuit size={48} className="mx-auto mb-4 opacity-50" />
                            <p>생성된 단어 학습 그룹이 없습니다.</p>
                            <p className="text-sm mt-2">단어장을 선택하고 학습할 학생들을 선택해 그룹을 만드세요.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {isCreateMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">새 단어 학습 그룹</h2>
                            <button onClick={() => setIsCreateMode(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
                        </div>

                        {step === 'book' ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <p className="text-slate-500 mb-4">먼저 학습할 단어장을 선택해주세요.</p>
                                <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {allBooks.map(book => (
                                        <button
                                            key={book.id}
                                            onClick={() => {
                                                setSelectedBookId(book.id);
                                                setGroupName(`${book.title} 그룹`);
                                                setStep('students');
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${selectedBookId === book.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                                        >
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-indigo-600">
                                                <Book size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 truncate">{book.title}</div>
                                                <div className="text-xs text-slate-500">{book.category}</div>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <button onClick={() => setStep('book')} className="text-indigo-600 font-bold text-sm mb-4 flex items-center gap-1 hover:underline">
                                    <ChevronLeft size={16} /> 단어장 다시 선택
                                </button>

                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">그룹 이름</label>
                                    <input
                                        type="text"
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="그룹 이름을 입력하세요"
                                    />
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">학생 선택 ({selectedStudentIds.length}명)</label>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                                        <div className="grid grid-cols-2 gap-2">
                                            {allStudents.map(student => {
                                                const existing = memberships[student.id];
                                                const isSelected = selectedStudentIds.includes(student.id);

                                                return (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => toggleStudent(student)}
                                                        className={`p-3 rounded-xl border-2 transition-all text-left flex items-start gap-3 relative overflow-hidden ${isSelected ? 'border-indigo-600 bg-white shadow-sm' : 'border-transparent bg-transparent hover:bg-white/50'}`}
                                                    >
                                                        <div className="flex-shrink-0">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                {student.name[0]}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-2">
                                                                {student.name}
                                                                {existing && (
                                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">{student.grade}</div>
                                                            {existing && (
                                                                <div className="text-[8px] text-amber-600 font-bold mt-1 truncate">
                                                                    {existing.bookTitle} (기배정)
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button onClick={() => setIsCreateMode(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">취소</button>
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={!groupName.trim()}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                    >
                                        그룹 생성하기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deletingGroup && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="text-red-600" size={36} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">그룹 삭제</h3>
                        <p className="text-slate-500 mb-8">
                            <span className="font-bold text-slate-900">'{deletingGroup.name}'</span> 그룹을 정말 삭제하시겠습니까?<br />
                            배정 정보가 삭제되지만 학습 데이터는 보존됩니다.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingGroup(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl border border-slate-200">취소</button>
                            <button onClick={handleDeleteGroup} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200">삭제하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
