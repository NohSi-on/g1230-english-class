import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVocabWords } from '../../../services/vocabService';
import type { VocabWord } from '../../../types';
import { ArrowLeft, BrainCircuit, GraduationCap, Keyboard } from 'lucide-react';
import { FlashcardView } from './FlashcardView';
import { RecallView } from './RecallView';
import { SpellView } from './SpellView';

type StudyMode = 'MEMORIZE' | 'RECALL' | 'SPELL';

export function VocabStudyLayout() {
    const { setId } = useParams();
    const navigate = useNavigate();
    const [words, setWords] = useState<VocabWord[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<StudyMode>('MEMORIZE');

    useEffect(() => {
        if (setId) loadWords(setId);
    }, [setId]);

    const loadWords = async (id: string) => {
        try {
            const data = await getVocabWords(id);
            setWords(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading words...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">
                        Day 01 - 기본 영단어 { /* TODO: Fetch Title */}
                    </h1>
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">
                        {words.length} 단어
                    </span>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <TabButton
                        active={mode === 'MEMORIZE'}
                        icon={<BrainCircuit size={18} />}
                        label="암기"
                        onClick={() => setMode('MEMORIZE')}
                    />
                    <TabButton
                        active={mode === 'RECALL'}
                        icon={<GraduationCap size={18} />}
                        label="리콜"
                        onClick={() => setMode('RECALL')}
                    />
                    <TabButton
                        active={mode === 'SPELL'}
                        icon={<Keyboard size={18} />}
                        label="스펠"
                        onClick={() => setMode('SPELL')}
                    />
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {mode === 'MEMORIZE' && <FlashcardView words={words} />}
                {mode === 'RECALL' && <RecallView words={words} />}
                {mode === 'SPELL' && <SpellView words={words} />}
            </main>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${active
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
