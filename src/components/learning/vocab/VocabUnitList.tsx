import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVocabSets } from '../../../services/vocabService';
import type { VocabSet } from '../../../types';
import { ArrowLeft, Book, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { VocabImportModal } from './VocabImportModal';
import { useAuth } from '../../../contexts/AuthContext';

export function VocabUnitList() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { role } = useAuth();
    const [sets, setSets] = useState<VocabSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        if (bookId) {
            loadSets(bookId);
        }
    }, [bookId]);

    const loadSets = async (id: string) => {
        try {
            const data = await getVocabSets(id);
            setSets(data);
        } catch (error) {
            console.error('Failed to load sets', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-bold"
            >
                <ArrowLeft size={20} className="mr-2" />
                목록으로 돌아가기
            </button>

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Book className="text-indigo-600" />
                    단어장 학습
                </h1>

                {role === 'admin' && (
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-brand-50 text-brand-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-100 transition-colors"
                    >
                        <Sparkles size={16} />
                        단어 추가 (AI 분석)
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {sets.map(set => (
                    <div
                        key={set.id}
                        onClick={() => navigate(`/learn/vocab/study/${set.id}`)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                    >
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                {set.title}
                            </h3>
                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <Layers size={14} />
                                총 {set.word_count || 0}단어
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                ))}
                {sets.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                        등록된 단어장이 없습니다.
                    </div>
                )}
            </div>

            {isImportModalOpen && bookId && (
                <VocabImportModal
                    bookId={bookId}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        setIsImportModalOpen(false);
                        loadSets(bookId);
                    }}
                />
            )}
        </div>
    );
}
