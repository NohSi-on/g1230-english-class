import { useState, useMemo } from 'react';
import type { VocabWord } from '../../../types';
import { CheckCircle2, XCircle, Volume2, ArrowRight, RefreshCw, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveVocabProgress } from '../../../services/vocabProgressService';

interface Props {
    words: VocabWord[];
    studentId?: string;
    bookId?: string;
    vocabSetId?: string;
}

export function RecallView({ words, studentId, bookId, vocabSetId }: Props) {
    const [sessionWords, setSessionWords] = useState<VocabWord[]>(words);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [masteredCount, setMasteredCount] = useState(0);

    const currentWord = sessionWords[currentIndex];

    // Shuffle options once for each question
    const options = useMemo(() => {
        if (!currentWord) return [];
        // Pool from original words to ensure variety even in re-tests
        const others = words
            .filter(w => w.id !== currentWord.id)
            .map(w => w.meaning)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        return [currentWord.meaning, ...others].sort(() => Math.random() - 0.5);
    }, [currentIndex, words, currentWord]);

    const handleAnswer = async (option: string) => {
        if (selectedOption) return;
        setSelectedOption(option);

        const isCorrect = option === currentWord.meaning;

        if (isCorrect) {
            setMasteredCount(s => s + 1);
        } else {
            // Mastery Logic: Add to end if wrong
            setSessionWords(prev => [...prev, currentWord]);
        }

        // Save progress to database
        if (studentId && bookId && vocabSetId) {
            try {
                await saveVocabProgress({
                    student_id: studentId,
                    book_id: bookId,
                    vocab_set_id: vocabSetId,
                    mode: 'RECALL',
                    word_index: currentIndex,
                    word: currentWord.word,
                    is_correct: isCorrect,
                    attempts: 1,
                });
            } catch (error) {
                console.error('Failed to save progress:', error);
            }
        }

        speak(currentWord.word);

        setTimeout(() => {
            nextQuestion();
        }, 1200);
    };

    const nextQuestion = () => {
        if (currentIndex < sessionWords.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setIsFinished(true);
        }
    };

    const reset = () => {
        setSessionWords(words);
        setCurrentIndex(0);
        setSelectedOption(null);
        setMasteredCount(0);
        setIsFinished(false);
    };

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6"
                >
                    <CheckCircle2 size={48} className="text-indigo-600" />
                </motion.div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">학습 완료!</h2>
                <p className="text-slate-500 mb-8">
                    총 {words.length}개의 단어를 모두 마스터했습니다.
                </p>
                <div className="w-full max-w-xs bg-slate-100 h-3 rounded-full mb-10 overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-1000"
                        style={{ width: `100%` }}
                    />
                </div>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                    <RefreshCw size={20} />
                    다시 하기
                </button>
            </div>
        );
    }

    if (!currentWord) return <div className="p-10 text-center">No words available</div>;

    return (
        <div className="w-full h-full flex flex-col items-center p-4 sm:p-6 max-w-2xl mx-auto overflow-y-auto">
            {/* Header / Progress */}
            <div className="w-full flex items-center justify-between mb-6 sm:mb-10 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-indigo-600 font-bold">
                    <GraduationCap size={14} />
                    RECALL MODE
                </div>
                <span>{currentIndex + 1} / {sessionWords.length}</span>
            </div>

            {/* Question Card */}
            <div className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-10 mb-6 sm:mb-8 border border-slate-100 flex flex-col items-center relative overflow-hidden">
                {/* Mastery Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 flex">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${(masteredCount / words.length) * 100}%` }}
                    />
                    <div className="h-full bg-red-100" style={{ width: `${((sessionWords.length - words.length) / words.length) * 100}%` }} />
                </div>

                <span className="text-indigo-500 font-bold mb-3 sm:mb-4 tracking-widest text-[9px] sm:text-[11px] uppercase opacity-60">WHAT IS THE MEANING?</span>
                <AnimatePresence mode="wait">
                    <motion.h2
                        key={currentWord.id + currentIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-3xl sm:text-5xl font-black text-slate-800 mb-4 sm:mb-6 text-center"
                    >
                        {currentWord.word}
                    </motion.h2>
                </AnimatePresence>
                <button
                    onClick={() => speak(currentWord.word)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-full hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                    <Volume2 size={24} />
                </button>
            </div>

            {/* Options Grid */}
            <div className="w-full grid grid-cols-1 gap-2 sm:gap-3">
                {options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isThisCorrect = option === currentWord.meaning;

                    let bgColor = "bg-white hover:border-indigo-300";
                    let textColor = "text-slate-700 font-medium";
                    let borderColor = "border-slate-100";

                    if (selectedOption) {
                        if (isThisCorrect) {
                            bgColor = "bg-green-50 shadow-sm";
                            borderColor = "border-green-500";
                            textColor = "text-green-700";
                        } else if (isSelected) {
                            bgColor = "bg-red-50";
                            borderColor = "border-red-500";
                            textColor = "text-red-700";
                        } else {
                            bgColor = "bg-slate-50 opacity-50";
                            borderColor = "border-slate-50";
                        }
                    }

                    return (
                        <button
                            key={`${currentIndex}-${idx}`}
                            disabled={!!selectedOption}
                            onClick={() => handleAnswer(option)}
                            className={`w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 text-left font-bold text-lg sm:text-xl transition-all flex items-center justify-between group ${bgColor} ${borderColor} ${textColor}`}
                        >
                            <span className="line-clamp-2">{option}</span>
                            {selectedOption && isThisCorrect && <CheckCircle2 size={20} className="text-green-600 shrink-0" />}
                            {selectedOption && isSelected && !isThisCorrect && <XCircle size={20} className="text-red-600 shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {selectedOption && (
                <div className="mt-8">
                    <button
                        onClick={nextQuestion}
                        className="flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all"
                    >
                        다음 문제
                        <ArrowRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
