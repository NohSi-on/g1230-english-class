import { useState, useEffect, useRef } from 'react';
import type { VocabWord } from '../../../types';
import { ArrowLeft, ArrowRight, Pause, Play, Volume2, X, Check, RotateCcw, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    words: VocabWord[];
}

export function FlashcardView({ words: initialWords }: Props) {
    const [words, setWords] = useState<VocabWord[]>(initialWords);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [direction, setDirection] = useState(0);
    const [unknownWordIds, setUnknownWordIds] = useState<Set<string>>(new Set());
    const [isFinished, setIsFinished] = useState(false);

    const timerRef = useRef<any>(null);
    const currentWord = words[currentIndex];

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped(prev => !prev);
            } else if (e.code === 'ArrowLeft' || (e.shiftKey && e.code === 'KeyX')) {
                markAsUnknown();
            } else if (e.code === 'ArrowRight' || e.code === 'Enter') {
                markAsKnown();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, isFinished, words]);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const nextCard = () => {
        if (currentIndex < words.length - 1) {
            setDirection(1);
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 10);
        } else {
            setIsFinished(true);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
            }, 10);
        }
    };

    const markAsKnown = () => {
        const newUnknowns = new Set(unknownWordIds);
        newUnknowns.delete(currentWord.id);
        setUnknownWordIds(newUnknowns);
        nextCard();
    };

    const markAsUnknown = () => {
        const newUnknowns = new Set(unknownWordIds);
        newUnknowns.add(currentWord.id);
        setUnknownWordIds(newUnknowns);
        nextCard();
    };

    const startStudyUnknowns = () => {
        const unknowns = initialWords.filter(w => unknownWordIds.has(w.id));
        setWords(unknowns);
        setCurrentIndex(0);
        setIsFinished(false);
        setIsFlipped(false);
    };

    const restartAll = () => {
        setWords(initialWords);
        setCurrentIndex(0);
        setUnknownWordIds(new Set());
        setIsFinished(false);
        setIsFlipped(false);
    };

    // Auto Play Logic
    useEffect(() => {
        if (!isPlaying || isFinished) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const runStep = () => {
            timerRef.current = setTimeout(() => {
                setIsFlipped(true);
                timerRef.current = setTimeout(() => {
                    nextCard();
                }, 2000);
            }, 1500);
        };

        runStep();
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isPlaying, currentIndex, isFinished]);

    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    if (isFinished) {
        const knownCount = words.length - unknownWordIds.size;
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6"
                >
                    <Brain size={48} className="text-indigo-600" />
                </motion.div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">학습 세션 종료</h2>
                <p className="text-slate-500 mb-8">
                    총 {words.length}단어 중 {knownCount}단어를 알고 있습니다.
                </p>

                <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                    {unknownWordIds.size > 0 && (
                        <button
                            onClick={startStudyUnknowns}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            <RotateCcw size={20} />
                            모르는 단어만 다시 하기 ({unknownWordIds.size})
                        </button>
                    )}
                    <button
                        onClick={restartAll}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                        <RotateCcw size={20} />
                        전체 다시 하기
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWord) return <div className="p-10 text-center">No words available</div>;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9
        }),
        center: {
            x: 0, opacity: 1, scale: 1,
            transition: { duration: 0.3 }
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.3 }
        })
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-4 overflow-hidden">
            {/* Segmented Progress Bar */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-black tracking-widest uppercase mb-2">
                    <span>{currentIndex + 1} / {words.length}</span>
                    <div className="flex gap-4">
                        <span className="text-green-500">KNOWN: {words.length - unknownWordIds.size - (words.length - currentIndex)}</span>
                        <span className="text-red-500">UNKNOWN: {unknownWordIds.size}</span>
                    </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${((currentIndex) / words.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Card Container */}
            <div className="relative w-full max-w-xl aspect-[1.4/1] perspective-1000 mb-12">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -100) markAsKnown();
                            else if (info.offset.x > 100) markAsUnknown();
                        }}
                        className="absolute inset-0 preserve-3d cursor-grab active:cursor-grabbing"
                    >
                        <motion.div
                            className="relative w-full h-full transition-transform duration-500 preserve-3d"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            {/* FRONT */}
                            <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center border-4 border-white overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
                                <span className="text-slate-300 text-[10px] font-black absolute top-8 left-8 tracking-[0.2em]">ENGLISH</span>
                                <h2 className="text-5xl sm:text-6xl font-black text-slate-800 tracking-tight text-center px-6 leading-tight">
                                    {currentWord.word}
                                </h2>
                                <button
                                    onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                                    className="absolute bottom-8 right-8 bg-indigo-50 text-indigo-600 p-4 rounded-2xl hover:bg-indigo-100 transition-all active:scale-90"
                                >
                                    <Volume2 size={24} />
                                </button>
                            </div>

                            {/* BACK */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-white p-8">
                                <span className="text-indigo-300 text-[10px] font-black absolute top-8 left-8 tracking-[0.2em]">MEANING</span>
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: isFlipped ? 1 : 0, y: isFlipped ? 0 : 10 }}
                                    className="text-4xl font-bold mb-6 text-center leading-tight"
                                >
                                    {currentWord.meaning}
                                </motion.h2>
                                {currentWord.example_sentence && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: isFlipped ? 0.9 : 0 }}
                                        className="text-indigo-100 text-base sm:text-lg text-center leading-relaxed max-w-sm italic opacity-80"
                                    >
                                        "{currentWord.example_sentence}"
                                    </motion.p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Classcard Style O/X Buttons */}
            <div className="w-full max-w-md grid grid-cols-2 gap-4">
                <button
                    onClick={markAsUnknown}
                    className="flex flex-col items-center justify-center py-6 bg-red-50 text-red-500 rounded-3xl border-2 border-red-100 hover:bg-red-100 transition-all active:scale-95 group"
                >
                    <X size={40} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-lg">모름 (X)</span>
                    <span className="text-[10px] opacity-50 mt-1">Shift / Left Arrow</span>
                </button>
                <button
                    onClick={markAsKnown}
                    className="flex flex-col items-center justify-center py-6 bg-green-50 text-green-600 rounded-3xl border-2 border-green-100 hover:bg-green-100 transition-all active:scale-95 group"
                >
                    <Check size={40} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-lg">앎 (O)</span>
                    <span className="text-[10px] opacity-50 mt-1">Enter / Right Arrow</span>
                </button>
            </div>

            {/* Sub Controls */}
            <div className="mt-8 flex items-center gap-8">
                <button onClick={prevCard} disabled={currentIndex === 0} className="p-3 rounded-xl text-slate-300 hover:text-indigo-600 disabled:opacity-20 transition-all">
                    <ArrowLeft size={24} />
                </button>
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-lg transition-all active:scale-95 ${isPlaying ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button onClick={nextCard} className="p-3 rounded-xl text-slate-300 hover:text-indigo-600 transition-all">
                    <ArrowRight size={24} />
                </button>
            </div>
        </div>
    );
}
