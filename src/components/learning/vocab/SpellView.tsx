import { useState, useEffect, useCallback } from 'react';
import type { VocabWord } from '../../../types';
import { RefreshCw, HelpCircle, CheckCircle2, Keyboard, Touchpad } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    words: VocabWord[];
}

export function SpellView({ words }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [hintLevel, setHintLevel] = useState(0);

    // Mobile Mode State
    const [inputMode, setInputMode] = useState<'keyboard' | 'selection'>('selection');
    const [options, setOptions] = useState<string[]>([]);
    const [shake, setShake] = useState(false);

    const currentWord = words[currentIndex];

    // TTS
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    // Generate 6 random alphabets including the correct next one
    const generateOptions = useCallback((correctChar: string) => {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        const distracors = alphabet
            .filter(c => c !== correctChar.toLowerCase())
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        const newOptions = [correctChar.toLowerCase(), ...distracors]
            .sort(() => Math.random() - 0.5);

        setOptions(newOptions);
    }, []);

    useEffect(() => {
        if (currentWord && inputMode === 'selection' && userInput.length < currentWord.word.length) {
            generateOptions(currentWord.word[userInput.length]);
        }
    }, [currentWord, userInput, inputMode, generateOptions]);

    const handleLetterSelect = (letter: string) => {
        if (isChecked) return;

        const nextCorrectChar = currentWord.word[userInput.length].toLowerCase();

        if (letter === nextCorrectChar) {
            const nextInput = userInput + currentWord.word[userInput.length];
            setUserInput(nextInput);

            // If word complete
            if (nextInput.length === currentWord.word.length) {
                setIsCorrect(true);
                setIsChecked(true);
                setScore(s => s + 1);
                speak(currentWord.word);
                setTimeout(() => nextQuestion(), 1500);
            }
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isChecked || !userInput.trim()) return;

        const correct = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
        setIsCorrect(correct);
        setIsChecked(true);
        if (correct) setScore(s => s + 1);

        speak(currentWord.word);

        if (correct) {
            setTimeout(() => nextQuestion(), 1500);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setIsChecked(false);
            setIsCorrect(null);
            setHintLevel(0);
        } else {
            setIsFinished(true);
        }
    };

    const reset = () => {
        setCurrentIndex(0);
        setUserInput('');
        setIsChecked(false);
        setIsCorrect(null);
        setScore(0);
        setHintLevel(0);
        setIsFinished(false);
    };

    const giveHint = () => {
        if (hintLevel === 0) setHintLevel(1);
        else setHintLevel(2);
    };

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6"
                >
                    <CheckCircle2 size={48} className="text-indigo-600" />
                </motion.div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">스펠링 학습 완료!</h2>
                <p className="text-slate-500 mb-8">
                    {words.length}개 중 {score}개를 정확히 맞췄습니다.
                </p>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                    <RefreshCw size={20} />
                    다시 하기
                </button>
            </div>
        );
    }

    if (!currentWord) return <div className="p-10 text-center">No words available</div>;

    return (
        <div className="w-full h-full flex flex-col items-center p-4 max-w-2xl mx-auto overflow-x-hidden">
            {/* Header & Progress */}
            <div className="w-full flex items-center justify-between mb-6 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                    <Touchpad size={12} />
                    SPELL: {inputMode === 'keyboard' ? 'KEYBOARD' : 'SELECTION'}
                </div>
                <span>{currentIndex + 1} / {words.length}</span>
            </div>

            {/* Meaning Card */}
            <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-indigo-600 rounded-2xl shadow-xl p-6 mb-6 flex flex-col items-center relative overflow-hidden text-white"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
                    <motion.div
                        className="h-full bg-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                    />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-center">{currentWord.meaning}</h2>
                {currentWord.example_sentence && (
                    <p className="text-indigo-100 text-xs opacity-80 text-center italic max-w-sm leading-relaxed line-clamp-2">
                        "{currentWord.example_sentence}"
                    </p>
                )}
            </motion.div>

            {/* Word Display (Boxes) */}
            <div className={`flex flex-wrap justify-center gap-2 mb-8 ${shake ? 'animate-shake' : ''}`}>
                {currentWord.word.split('').map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: i === userInput.length ? 1.1 : 1,
                            borderColor: i === userInput.length ? '#6366f1' : '#e2e8f0',
                            backgroundColor: i < userInput.length ? '#f8fafc' : '#fff'
                        }}
                        className={`w-10 h-10 sm:w-12 sm:h-12 border-2 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black 
                            ${i < userInput.length ? 'text-indigo-600' : 'text-transparent border-dashed'}
                            ${isChecked && !isCorrect ? 'border-red-200 bg-red-50 text-red-500' : ''}
                        `}
                    >
                        {i < userInput.length ? userInput[i] : (isChecked ? currentWord.word[i] : '')}
                    </motion.div>
                ))}
            </div>

            {/* Selection Options (Mobile) or Input (Keyboard) */}
            <AnimatePresence mode="wait">
                {inputMode === 'selection' && !isChecked ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="grid grid-cols-3 gap-3 w-full max-w-sm"
                    >
                        {options.map((letter, i) => (
                            <button
                                key={`${currentIndex}-${userInput.length}-${i}`}
                                onClick={() => handleLetterSelect(letter)}
                                className="aspect-square bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-indigo-400 active:scale-90 transition-all flex items-center justify-center text-2xl font-black text-slate-700"
                            >
                                {letter}
                            </button>
                        ))}
                    </motion.div>
                ) : inputMode === 'keyboard' && !isChecked ? (
                    <motion.form
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onSubmit={handleSubmit} className="w-full space-y-4"
                    >
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            className="w-full p-4 text-2xl font-black text-center rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none"
                            placeholder="Type here..."
                            autoFocus
                        />
                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">
                            Submit
                        </button>
                    </motion.form>
                ) : isChecked && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl font-bold flex flex-col items-center gap-2 ${isCorrect ? 'text-green-600' : 'text-red-500 bg-red-50 w-full'}`}
                    >
                        {isCorrect ? (
                            <span className="text-lg">Excellent! 🎉</span>
                        ) : (
                            <>
                                <span className="text-xs uppercase opacity-70">Correct spelling:</span>
                                <span className="text-2xl font-black tracking-widest uppercase">{currentWord.word}</span>
                                <button onClick={nextQuestion} className="mt-4 px-8 py-3 bg-slate-800 text-white rounded-xl">Next Word</button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Controls */}
            <div className="mt-auto w-full pt-8 flex items-center justify-between border-t border-slate-100">
                <button
                    onClick={() => setInputMode(inputMode === 'keyboard' ? 'selection' : 'keyboard')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                >
                    {inputMode === 'keyboard' ? <Touchpad size={16} /> : <Keyboard size={16} />}
                    {inputMode === 'keyboard' ? 'Switch to Selection' : 'Switch to Keyboard'}
                </button>

                {!isChecked && (
                    <button
                        onClick={giveHint}
                        className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                    >
                        <HelpCircle size={16} /> Hint
                    </button>
                )}
            </div>
        </div>
    );
}
