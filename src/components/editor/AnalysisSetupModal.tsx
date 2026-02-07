import { useState, useRef } from 'react';
import { X, FileText, Bot, Loader2 } from 'lucide-react';

interface AnalysisSetupModalProps {
    onClose: () => void;
    onStartAnalysis: (questionFile: File, answerFile: File | null, pageRange?: { start: number; end: number }, mode?: 'overwrite' | 'merge') => void;
    loading: boolean;
}

export function AnalysisSetupModal({ onClose, onStartAnalysis, loading }: AnalysisSetupModalProps) {
    const [questionFile, setQuestionFile] = useState<File | null>(null);
    const [answerFile, setAnswerFile] = useState<File | null>(null);
    const [analysisMode, setAnalysisMode] = useState<'overwrite' | 'merge'>('merge');

    // Page Range State
    const [usePageRange, setUsePageRange] = useState(false);
    const [startPage, setStartPage] = useState<string>('');
    const [endPage, setEndPage] = useState<string>('');

    const questionInputRef = useRef<HTMLInputElement>(null);
    const answerInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        if (!questionFile) return;

        const range = usePageRange && startPage && endPage ? {
            start: parseInt(startPage),
            end: parseInt(endPage)
        } : undefined;

        onStartAnalysis(questionFile, answerFile, range, analysisMode);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-[500px] max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                    disabled={loading}
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-600">
                        <Bot size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">AI 자동 분석 설정</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        분석할 문제 파일과 답안지를 업로드하고<br />분석 범위를 설정해주세요.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Analysis Mode Selection */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-800 mb-3">분석 모드 선택</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAnalysisMode('overwrite')}
                                className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${analysisMode === 'overwrite'
                                    ? 'bg-white border-brand-500 text-brand-700 shadow-sm'
                                    : 'bg-transparent border-slate-200 text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                새로 만들기
                                <p className="text-[10px] font-medium opacity-70">기존 내용 삭제 후 분석</p>
                            </button>
                            <button
                                onClick={() => setAnalysisMode('merge')}
                                className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${analysisMode === 'merge'
                                    ? 'bg-white border-brand-500 text-brand-700 shadow-sm'
                                    : 'bg-transparent border-slate-200 text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                기존 문항에 추가
                                <p className="text-[10px] font-medium opacity-70">현재 내용 유지 및 병합</p>
                            </button>
                        </div>
                        {analysisMode === 'overwrite' && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-[11px] text-red-600 font-medium">
                                ⚠️ 주의: '새로 만들기'는 현재 에디터의 모든 내용을 삭제하고 시작합니다.
                                전체 교재 데이터를 유지하려면 '기존 문항에 추가'를 권장합니다.
                            </div>
                        )}
                    </div>

                    {/* Page Range Selection */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={usePageRange}
                                    onChange={(e) => setUsePageRange(e.target.checked)}
                                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                />
                                페이지 범위 지정 (선택)
                            </label>
                            <span className="text-xs text-slate-500">전체 분석 시 체크 해제</span>
                        </div>

                        {usePageRange && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={startPage}
                                    onChange={(e) => setStartPage(e.target.value)}
                                    placeholder="시작 P"
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-brand-500"
                                    min="1"
                                />
                                <span className="text-slate-400">~</span>
                                <input
                                    type="number"
                                    value={endPage}
                                    onChange={(e) => setEndPage(e.target.value)}
                                    placeholder="종료 P"
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-brand-500"
                                    min="1"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Question File Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                문제 파일 (필수) <span className="text-red-500">*</span>
                            </label>
                            <div
                                onClick={() => !loading && questionInputRef.current?.click()}
                                className={`border-dashed border-2 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${questionFile ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${questionFile ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`text-sm truncate ${questionFile ? 'text-brand-900 font-medium' : 'text-slate-500'}`}>
                                        {questionFile ? questionFile.name : '파일 선택'}
                                    </p>
                                </div>
                                {questionFile && (
                                    <button onClick={(e) => { e.stopPropagation(); setQuestionFile(null); }} className="p-1 hover:bg-black/10 rounded-full text-slate-500"><X size={14} /></button>
                                )}
                            </div>
                            <input ref={questionInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />
                        </div>

                        {/* Answer Key File Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                답안지 파일 (선택)
                            </label>
                            <div
                                onClick={() => !loading && answerInputRef.current?.click()}
                                className={`border-dashed border-2 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${answerFile ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${answerFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`text-sm truncate ${answerFile ? 'text-green-900 font-medium' : 'text-slate-500'}`}>
                                        {answerFile ? answerFile.name : '파일 선택'}
                                    </p>
                                </div>
                                {answerFile && (
                                    <button onClick={(e) => { e.stopPropagation(); setAnswerFile(null); }} className="p-1 hover:bg-black/10 rounded-full text-slate-500"><X size={14} /></button>
                                )}
                            </div>
                            <input ref={answerInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                        onClick={handleSubmit}
                        disabled={!questionFile || loading}
                        className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        {loading ? '분석 중...' : '분석 시작 (완료)'}
                    </button>
                    {!answerFile && (
                        <p className="text-center text-xs text-orange-500 mt-2">
                            주의: 답안지 없이 분석하면 정답의 정확도가 떨어질 수 있습니다.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
