import { useState, useEffect, useCallback } from 'react';
import { Trash2, AlertCircle, Save, RefreshCw, Layers } from 'lucide-react';
import type { QuestionData } from '../../services/aiService';

interface QuestionEditorProps {
    questions: QuestionData[];
    onSave: (questions: QuestionData[]) => void;
    onRegenerate?: (questions: QuestionData[]) => void;
    onCancel: () => void;
}

function PageHeaderInput({ value, onChange }: { value: number, onChange: (val: number) => void }) {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleCommit = () => {
        const num = parseInt(localValue);
        if (!isNaN(num) && num !== value) {
            onChange(num);
        } else {
            setLocalValue(value.toString());
        }
    };

    return (
        <div className="flex items-center bg-indigo-600 text-white rounded-full px-3 py-1 shadow-sm">
            <span className="text-[10px] font-bold mr-1 opacity-70">PAGE</span>
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                className="w-10 bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-center"
                translate="no"
            />
        </div>
    );
}

interface Conflict {
    index: number;
    field: 'page' | 'question_number';
    proposedValue: string | number;
    targetId: string;
    duplicateAt: number;
}

function ConflictResolutionModal({
    conflict,
    onResolve
}: {
    conflict: Conflict,
    onResolve: (action: 'overwrite' | 'rename' | 'cancel') => void
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <AlertCircle size={24} className="text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 text-center mb-2">문항 번호 중복 감지</h3>
                    <p className="text-sm text-slate-600 text-center mb-6">
                        이동하려는 위치(<span className="font-bold text-indigo-600">ID: {conflict.targetId}</span>)에 이미 다른 문항이 존재합니다. 어떻게 처리할까요?
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => onResolve('rename')}
                            className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                        >
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700">이름 바꿔 유지 (권장)</div>
                            <p className="text-xs text-slate-500">번호 뒤에 접미사를 붙여 두 문항 모두 유지합니다.</p>
                        </button>

                        <button
                            onClick={() => onResolve('overwrite')}
                            className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                        >
                            <div className="font-bold text-slate-800 group-hover:text-red-700">기존 문항 덮어쓰기</div>
                            <p className="text-xs text-slate-500 italic">기존에 있던 문항이 에디터에서 사라집니다.</p>
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={() => onResolve('cancel')}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        수정 취소
                    </button>
                </div>
            </div>
        </div>
    );
}

interface PageConflict {
    oldPage: number;
    newPage: number;
    collidingNumbers: string[];
}

function PageConflictModal({
    conflict,
    onResolve
}: {
    conflict: PageConflict,
    onResolve: (action: 'overwrite' | 'rename' | 'cancel') => void
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Layers size={24} className="text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 text-center mb-2">페이지 이동 충돌 감지</h3>
                    <p className="text-sm text-slate-600 text-center mb-4">
                        <span className="font-bold text-indigo-600">{conflict.oldPage}페이지</span>를 <span className="font-bold text-indigo-600">{conflict.newPage}페이지</span>로 이동하려고 하나, 다음 문항 번호가 이미 새로운 페이지에 존재합니다:
                    </p>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 mb-6 text-xs text-slate-500 font-mono text-center">
                        {conflict.collidingNumbers.join(', ')}
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => onResolve('rename')}
                            className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                        >
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700">중복 문항 번호 변경 (권장)</div>
                            <p className="text-xs text-slate-500">중복된 번호 뒤에 (1), (2)를 붙여 모두 이동시킵니다.</p>
                        </button>

                        <button
                            onClick={() => onResolve('overwrite')}
                            className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                        >
                            <div className="font-bold text-slate-800 group-hover:text-red-700">대상 페이지의 문항 덮어쓰기</div>
                            <p className="text-xs text-slate-500">이동하려는 위치에 이미 있던 문항들을 삭제합니다.</p>
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={() => onResolve('cancel')}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        이동 취소
                    </button>
                </div>
            </div>
        </div>
    );
}

export function QuestionEditor({ questions: initialQuestions, onSave, onRegenerate, onCancel }: QuestionEditorProps) {
    const [questions, setQuestions] = useState<QuestionData[]>(initialQuestions);
    const [conflict, setConflict] = useState<Conflict | null>(null);
    const [pageConflict, setPageConflict] = useState<PageConflict | null>(null);

    useEffect(() => {
        console.log('[QuestionEditor] Received props.questions:', initialQuestions?.length);
        setQuestions(initialQuestions);
    }, [initialQuestions]);

    const applyUpdate = useCallback((index: number, field: keyof QuestionData, value: any) => {
        setQuestions(prev => {
            const newQuestions = [...prev];
            const updatedItem = { ...newQuestions[index], [field]: value };

            if (field === 'page' || field === 'question_number') {
                const p = updatedItem.page || 0;
                const n = updatedItem.question_number || '0';
                updatedItem.itemId = `${p}_${n}`;
            }

            newQuestions[index] = updatedItem;
            return newQuestions;
        });
    }, []);

    const handleUpdate = useCallback((index: number, field: keyof QuestionData, value: any) => {
        const item = questions[index];

        if (field === 'page' || field === 'question_number') {
            const p = field === 'page' ? (value as number) : (item.page || 0);
            const n = field === 'question_number' ? (value as string) : (item.question_number || '0');
            const targetId = `${p}_${n}`;

            const duplicateIndex = questions.findIndex((q, i) => i !== index && q.itemId === targetId);
            if (duplicateIndex > -1) {
                setConflict({ index, field: field as 'page' | 'question_number', proposedValue: value, targetId, duplicateAt: duplicateIndex });
                return;
            }
        }

        applyUpdate(index, field, value);
    }, [questions, applyUpdate]);

    const resolveConflict = useCallback((action: 'overwrite' | 'rename' | 'cancel') => {
        if (!conflict) return;
        const { index, field, proposedValue, duplicateAt } = conflict;

        if (action === 'overwrite') {
            setQuestions(prev => {
                const filtered = prev.filter((_, i) => i !== duplicateAt);
                const newIndex = duplicateAt < index ? index - 1 : index;
                const newQuestions = [...filtered];
                const item = newQuestions[newIndex];
                const updatedItem = { ...item, [field]: proposedValue };
                const p = updatedItem.page || 0;
                const n = updatedItem.question_number || '0';
                updatedItem.itemId = `${p}_${n}`;
                newQuestions[newIndex] = updatedItem;
                return newQuestions;
            });
        } else if (action === 'rename') {
            setQuestions(prev => {
                const item = prev[index];
                const p = field === 'page' ? (proposedValue as number) : (item.page || 0);
                const baseN = field === 'question_number' ? (proposedValue as string) : (item.question_number || '0');
                let uniqueN = baseN;
                let targetId = `${p}_${uniqueN}`;
                let counter = 1;
                while (prev.some((q, i) => i !== index && q.itemId === targetId)) {
                    uniqueN = `${baseN}(${counter})`;
                    targetId = `${p}_${uniqueN}`;
                    counter++;
                }
                const newQuestions = [...prev];
                newQuestions[index] = { ...item, page: p, question_number: uniqueN, itemId: targetId };
                return newQuestions;
            });
        }
        setConflict(null);
    }, [conflict]);

    const handleDelete = useCallback((index: number) => {
        if (confirm('이 문항을 삭제하시겠습니까?')) {
            setQuestions(prev => prev.filter((_, i) => i !== index));
        }
    }, []);

    const handleRemoveDuplicates = useCallback(() => {
        const uniqueQuestions: QuestionData[] = [];
        const seen = new Set();

        questions.forEach(q => {
            // Use content + type + answer as the signature to catch duplicates even on different pages
            const content = q.question.trim().toLowerCase();
            const answer = (q.answer || '').trim().toLowerCase();
            const type = q.type || '';
            const signature = `${type}|${content}|${answer}`;

            if (!seen.has(signature)) {
                seen.add(signature);
                uniqueQuestions.push(q);
            }
        });

        const removedCount = questions.length - uniqueQuestions.length;
        if (removedCount === 0) {
            alert('중복된 문항이 없습니다.');
        } else {
            if (confirm(`총 ${removedCount}개의 중복 문항이 발견되었습니다. 제거하시겠습니까?`)) {
                setQuestions(uniqueQuestions);
            }
        }
    }, [questions]);

    const handleSaveAll = useCallback(() => {
        if (confirm(`총 ${questions.length}개의 문항을 저장하시겠습니까?`)) {
            onSave(questions);
        }
    }, [questions, onSave]);

    const handleSavePage = useCallback((pageNum: number) => {
        const pageQuestions = questions.filter(q => (q.page || 0) === pageNum);
        if (confirm(`P.${pageNum}의 ${pageQuestions.length}개 문항을 저장하시겠습니까?`)) {
            onSave(pageQuestions);
        }
    }, [questions, onSave]);

    const handleDeletePage = useCallback((pageNum: number) => {
        const count = questions.filter(q => (q.page || 0) === pageNum).length;
        if (confirm(`P.${pageNum}의 모든 문항(${count}개)을 삭제하시겠습니까?`)) {
            setQuestions(prev => prev.filter(q => (q.page || 0) !== pageNum));
        }
    }, []);

    const handleRegenerateClick = useCallback(() => {
        if (onRegenerate && confirm('현재 정답을 기준으로 모든 문항의 해설과 개념을 AI로 다시 작성하시겠습니까?')) {
            onRegenerate(questions);
        }
    }, [questions, onRegenerate]);

    // Group questions by page
    const groupedQuestions: Record<number, QuestionData[]> = {};
    questions.forEach(q => {
        const p = q.page || 0;
        if (!groupedQuestions[p]) groupedQuestions[p] = [];
        groupedQuestions[p].push(q);
    });

    const sortedPages = Object.keys(groupedQuestions).map(Number).sort((a, b) => a - b);

    const applyPageMove = useCallback((oldPage: number, newPage: number, collisionAction: 'overwrite' | 'rename' | 'none') => {
        setQuestions(prev => {
            let destQuestions = prev.filter(q => (q.page || 0) === newPage);
            let srcQuestions = prev.filter(q => (q.page || 0) === oldPage);
            let otherQuestions = prev.filter(q => (q.page || 0) !== oldPage && (q.page || 0) !== newPage);

            if (collisionAction === 'overwrite') {
                const srcNums = new Set(srcQuestions.map(q => q.question_number || '0'));
                destQuestions = destQuestions.filter(q => !srcNums.has(q.question_number || '0'));
            }

            const movedQuestions: QuestionData[] = [];
            srcQuestions.forEach(q => {
                let n = q.question_number || '0';
                if (collisionAction === 'rename') {
                    const baseN = n;
                    if (destQuestions.some(d => (d.question_number || '0') === n)) {
                        let counter = 1;
                        while (destQuestions.some(d => (d.question_number || '0') === `${baseN}(${counter})`) || movedQuestions.some(m => m.question_number === `${baseN}(${counter})`)) {
                            counter++;
                        }
                        n = `${baseN}(${counter})`;
                    }
                }
                movedQuestions.push({
                    ...q,
                    page: newPage,
                    itemId: `${newPage}_${n}`,
                    question_number: n
                });
            });

            return [...otherQuestions, ...destQuestions, ...movedQuestions];
        });
    }, []);

    const resolvePageConflict = useCallback((action: 'overwrite' | 'rename' | 'cancel') => {
        if (!pageConflict) return;
        if (action !== 'cancel') {
            applyPageMove(pageConflict.oldPage, pageConflict.newPage, action);
        }
        setPageConflict(null);
    }, [pageConflict, applyPageMove]);

    const handlePageHeaderChange = useCallback((oldPageNum: number, newPageNum: number) => {
        if (oldPageNum === newPageNum) return;

        const itemsToMove = questions.filter(q => (q.page || 0) === oldPageNum);
        const itemsInDest = questions.filter(q => (q.page || 0) === newPageNum);

        const collidingNumbers = itemsToMove
            .filter(src => itemsInDest.some(dest => (dest.question_number || '0') === (src.question_number || '0')))
            .map(q => q.question_number || '0');

        if (collidingNumbers.length > 0) {
            setPageConflict({ oldPage: oldPageNum, newPage: newPageNum, collidingNumbers });
            return;
        }

        applyPageMove(oldPageNum, newPageNum, 'none');
    }, [questions, applyPageMove]);

    const handlePageTopicChange = useCallback((pageNum: number, newTopic: string) => {
        setQuestions(prev => prev.map(q => {
            if ((q.page || 0) === pageNum) {
                return { ...q, page_topic: newTopic };
            }
            return q;
        }));
    }, []);

    if (questions.length === 0) {
        return (
            <div className="bg-white h-full flex flex-col items-center justify-center p-10">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">등록된 문항이 없습니다</h2>
                <p className="text-slate-500 mb-8 text-center max-w-md">
                    AI 분석을 통해 교재의 문제를 자동으로 추출하거나<br />
                    기존 데이터를 불러올 수 있습니다.
                </p>
                <div className="p-4 bg-brand-50 rounded-lg border border-brand-100 text-brand-700 text-sm">
                    상단 <strong>"AI 자동 분석"</strong> 버튼을 눌러 시작해주세요.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white h-full flex flex-col">
            {conflict && (
                <ConflictResolutionModal
                    conflict={conflict}
                    onResolve={resolveConflict}
                />
            )}
            {pageConflict && (
                <PageConflictModal
                    conflict={pageConflict}
                    onResolve={resolvePageConflict}
                />
            )}
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                    <h2 className="font-bold text-slate-800">문항 검토 및 수정</h2>
                    <p className="text-xs text-slate-500">
                        총 {questions.length}개 문항 추출됨
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRemoveDuplicates}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded text-sm font-medium flex items-center gap-1"
                        title="중복 문항 제거"
                    >
                        <Layers size={14} />
                        중복 정리
                    </button>
                    {onRegenerate && (
                        <button
                            onClick={handleRegenerateClick}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-sm font-medium hover:bg-blue-100 flex items-center gap-1"
                            title="정답을 수정한 경우 해설을 다시 생성합니다"
                        >
                            <RefreshCw size={14} />
                            정답 기반 해설 재생성
                        </button>
                    )}
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSaveAll}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm transition-colors"
                    >
                        <Save size={16} />
                        최종 저장
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-slate-100">
                {sortedPages.map(pageNum => (
                    <div key={pageNum} className="space-y-4">
                        {/* Page Header */}
                        <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-100 py-2">
                            <div className="flex items-center gap-3 flex-1">
                                <PageHeaderInput
                                    value={pageNum}
                                    onChange={(newVal) => handlePageHeaderChange(pageNum, newVal)}
                                />
                                <div className="flex-1 max-w-sm">
                                    <input
                                        type="text"
                                        value={groupedQuestions[pageNum][0]?.page_topic || ''}
                                        onChange={(e) => handlePageTopicChange(pageNum, e.target.value)}
                                        placeholder="지문 주제/제목 (예: Helen Keller)"
                                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        translate="no"
                                    />
                                </div>
                                <span className="text-xs text-slate-500 font-bold bg-white px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap">
                                    {groupedQuestions[pageNum].length} Qs
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDeletePage(pageNum)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="이 페이지의 모든 문항 삭제"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleSavePage(pageNum)}
                                    className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <Save size={14} />
                                    이 페이지 저장
                                </button>
                            </div>
                        </div>

                        {/* Questions for this page */}
                        {groupedQuestions[pageNum].map((q) => {
                            const idx = questions.findIndex(origQ => origQ === q);
                            return (
                                <div key={q.itemId || idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                                    {/* Header: Type, Page, Delete */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                                                #{idx + 1}
                                            </span>
                                            <select
                                                value={q.type}
                                                onChange={(e) => handleUpdate(idx, 'type', e.target.value)}
                                                className="text-xs border-none bg-slate-50 rounded text-slate-700 font-medium focus:ring-0 cursor-pointer"
                                            >
                                                <option value="GRAMMAR">GRAMMAR</option>
                                                <option value="READING">READING</option>
                                                <option value="VOCABULARY">VOCABULARY</option>
                                                <option value="LISTENING">LISTENING</option>
                                            </select>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400 font-bold">NO.</span>
                                                <input
                                                    type="text"
                                                    value={q.question_number || ''}
                                                    onChange={(e) => handleUpdate(idx, 'question_number', e.target.value)}
                                                    className="w-12 text-xs border-none bg-slate-50 rounded text-slate-700 font-bold focus:ring-0 text-center"
                                                    placeholder="-"
                                                    translate="no"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                                <span className="text-xs text-slate-400 font-bold">PAGE</span>
                                                <input
                                                    type="number"
                                                    value={q.page || 0}
                                                    onChange={(e) => handleUpdate(idx, 'page', parseInt(e.target.value) || 0)}
                                                    className="w-12 text-xs border-none bg-slate-50 rounded text-slate-700 font-bold focus:ring-0 text-center"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(idx)}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Question Content */}
                                    <div className="mb-3">
                                        <textarea
                                            value={q.question || ''}
                                            onChange={(e) => handleUpdate(idx, 'question', e.target.value)}
                                            className="w-full text-sm p-2 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-h-[60px]"
                                            placeholder="문제 내용"
                                            translate="no"
                                        />
                                    </div>

                                    {/* Options (if multiple choice) */}
                                    {q.options && q.options.length > 0 && (
                                        <div className="mb-3 pl-2 border-l-2 border-slate-100 space-y-1">
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2 text-xs text-slate-600">
                                                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                                        {optIdx + 1}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={opt || ''}
                                                        onChange={(e) => {
                                                            const newOptions = [...q.options!];
                                                            newOptions[optIdx] = e.target.value;
                                                            handleUpdate(idx, 'options', newOptions);
                                                        }}
                                                        className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs"
                                                        translate="no"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Answer & Explanation */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">정답</label>
                                            <input
                                                type="text"
                                                value={q.answer || ''}
                                                onChange={(e) => handleUpdate(idx, 'answer', e.target.value)}
                                                className="w-full text-sm p-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 font-bold text-green-700"
                                                translate="no"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">개념 (Concept)</label>
                                            <input
                                                type="text"
                                                value={q.concept || ''}
                                                onChange={(e) => handleUpdate(idx, 'concept', e.target.value)}
                                                className="w-full text-xs p-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-blue-600"
                                                placeholder="예: 관계대명사 wh..."
                                                translate="no"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">해설</label>
                                        <textarea
                                            value={q.explanation || ''}
                                            onChange={(e) => handleUpdate(idx, 'explanation', e.target.value)}
                                            className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-500 bg-slate-50 min-h-[40px]"
                                            translate="no"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
