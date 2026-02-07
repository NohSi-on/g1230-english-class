import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import { AnalysisSetupModal } from '../components/editor/AnalysisSetupModal';
import { QuestionEditor } from '../components/editor/QuestionEditor';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

import { extractTextFromLocalFile, convertPdfToImages, getPdfPageCount } from '../services/pdfService';
import { analyzeText, analyzeImages, regenerateExplanations, type QuestionData } from '../services/aiService';

export default function SmartEditorPage() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { role } = useAuth();

    useEffect(() => {
        if (role && role !== 'admin') {
            console.warn('Access denied: SmartEditor is for admins only.');
            navigate('/books');
        }
    }, [role, navigate]);

    // State
    const [bookTitle, setBookTitle] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

    // Review Mode State
    const [reviewMode, setReviewMode] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState<QuestionData[]>([]);

    useEffect(() => {
        async function fetchBookAndQuestions() {
            if (!bookId) return;
            try {
                // 1. Fetch Book Info
                const { data: bookData, error: bookError } = await supabase
                    .from('books')
                    .select('title')
                    .eq('id', bookId)
                    .single();

                if (bookError) throw bookError;
                setBookTitle(bookData.title);

                // 2. Fetch Existing Questions
                const { data: qData, error: qError } = await supabase
                    .from('questions')
                    .select('content')
                    .eq('book_id', bookId)
                    .order('page_number', { ascending: true });

                if (qError) throw qError;

                if (qData && qData.length > 0) {
                    // Flatten all items and inject page-level topic if available
                    const allItems = qData.flatMap(row => (row.content.items || []).map((item: any) => ({
                        ...item,
                        page_topic: row.content.page_topic || item.page_topic
                    })));
                    if (allItems.length > 0) {
                        setExtractedQuestions(allItems);
                        setReviewMode(true);
                        console.log(`Loaded ${allItems.length} existing questions.`);
                    }
                }

            } catch (e) {
                console.error(e);
                alert('교재 정보를 불러오는데 실패했습니다.');
            }
        }
        fetchBookAndQuestions();
    }, [bookId]);

    const handleAnalysisClick = () => {
        setIsAnalysisModalOpen(true);
    };

    // 1. Start Analysis -> Extract -> Set Review Mode
    const handleStartAnalysis = async (
        questionFile: File,
        answerFile: File | null,
        pageRange?: { start: number; end: number },
        mode: 'overwrite' | 'merge' = 'overwrite'
    ) => {
        try {
            setAnalyzing(true);
            setReviewMode(false); // Reset review mode
            setStatusMessage('분석 준비 중...');

            // --- Batch Configuration ---
            const startPage = pageRange?.start || 1;
            let endPage = pageRange?.end;

            if (!endPage) {
                setStatusMessage('페이지 수 확인 중...');
                const totalPages = await getPdfPageCount(questionFile);
                endPage = totalPages > 0 ? totalPages : 20;
                console.log(`Auto-detected total pages: ${totalPages}`);
            }

            const BATCH_SIZE = 5;

            const batches = [];
            for (let i = startPage; i <= endPage; i += BATCH_SIZE) {
                batches.push({
                    start: i,
                    end: Math.min(i + BATCH_SIZE - 1, endPage)
                });
            }

            console.log(`Starting Batch Analysis: ${batches.length} batches found. Mode: ${mode}`);

            // If merge mode, start with current questions, otherwise start fresh
            let workingQuestions: QuestionData[] = mode === 'merge' ? [...extractedQuestions] : [];

            // Helper to merge/overwrite based on itemId
            const processAndMerge = (newBatch: QuestionData[]) => {
                const updated = [...workingQuestions];
                newBatch.forEach(newQ => {
                    const processedQ = { ...newQ };

                    // Generate unique ID by suffixing if it already exists
                    let baseQNum = newQ.question_number || '0';
                    let pNum = newQ.page || 0;
                    let uniqueQNum = baseQNum;
                    let uniqueId = newQ.itemId || `${bookId}_${pNum}_${uniqueQNum}`;
                    let counter = 1;

                    // Keep incrementing suffix until we find a unique ID in the current working set
                    while (updated.some(q => q.itemId === uniqueId)) {
                        uniqueQNum = `${baseQNum}(${counter})`;
                        uniqueId = `${bookId}_${pNum}_${uniqueQNum}`;
                        counter++;
                    }

                    processedQ.question_number = uniqueQNum;
                    processedQ.itemId = uniqueId;
                    updated.push(processedQ);
                });
                return updated.sort((a, b) => {
                    if ((a.page || 0) !== (b.page || 0)) return (a.page || 0) - (b.page || 0);
                    return 0; // Keep relative order within page for now
                });
            };

            // --- Batch Loop ---
            for (const [index, batch] of batches.entries()) {
                const currentBatchNum = index + 1;
                const totalBatches = batches.length;
                const batchRange = { startPage: batch.start, endPage: batch.end };

                const statusMsg = `분석 중... (${currentBatchNum}/${totalBatches} 구간: ${batch.start}~${batch.end}p)`;
                setStatusMessage(statusMsg);

                try {
                    const questionText = await extractTextFromLocalFile(questionFile, batchRange);
                    let batchQuestions: QuestionData[] = [];

                    let answerText: string | null = null;
                    if (answerFile) {
                        try {
                            answerText = await extractTextFromLocalFile(answerFile);
                        } catch (e) {
                            console.warn('Failed to read answer key file for this batch:', e);
                        }
                    }

                    if (questionText.length > 200) {
                        batchQuestions = await analyzeText(questionText, answerText, bookId);
                    } else {
                        const images = await convertPdfToImages(questionFile, batchRange, BATCH_SIZE);
                        batchQuestions = await analyzeImages(images, answerText, bookId);
                    }

                    if (batchQuestions && Array.isArray(batchQuestions)) {
                        if (batchQuestions.length > 0) {
                            workingQuestions = processAndMerge(batchQuestions);
                            setExtractedQuestions([...workingQuestions]);
                            setStatusMessage(`분석 중... (${currentBatchNum}/${totalBatches} 구간) - 총 ${workingQuestions.length}문항 관리 중`);

                            if (!reviewMode) {
                                setReviewMode(true);
                            }
                        }
                    }
                } catch (batchError) {
                    console.error(`Error in Batch ${currentBatchNum}:`, batchError);
                }

                await new Promise(r => setTimeout(r, 500));
            }

            setReviewMode(true);
            setIsAnalysisModalOpen(false);

            alert(`분석 완료! 총 ${workingQuestions.length}개의 문항이 정리되었습니다.\n우측 패널에서 내용을 검토해주세요.`);

        } catch (error: any) {
            console.error('Batch Analysis failed:', error);
            alert(`분석 중 오류 발생: ${error.message}`);
        } finally {
            setAnalyzing(false);
            setStatusMessage('');
        }
    };

    const handleRegenerateExplanations = async (currentQuestions: QuestionData[]) => {
        try {
            setAnalyzing(true);
            setStatusMessage('정답 기반 해설 재생성 중...');

            const newQuestions = await regenerateExplanations(currentQuestions);
            setExtractedQuestions(newQuestions);

            alert('해설/개념 재생성이 완료되었습니다!');
        } catch (error: any) {
            console.error(error);
            alert('재생성 실패: ' + error.message);
        } finally {
            setAnalyzing(false);
            setStatusMessage('');
        }
    };

    // 2. Final Save from Review Editor
    const handleSaveQuestions = async (finalQuestions: QuestionData[]) => {
        try {
            if (!finalQuestions || finalQuestions.length === 0) {
                alert('저장할 문항이 없습니다.');
                return;
            }
            console.log('Saving final questions:', finalQuestions);

            // Group by Page
            const questionsByPage: Record<number, QuestionData[]> = {};
            finalQuestions.forEach(q => {
                const pageNum = q.page || 1;
                if (!questionsByPage[pageNum]) questionsByPage[pageNum] = [];
                questionsByPage[pageNum].push(q);
            });

            const pagesToSave = Object.keys(questionsByPage).map(Number);
            console.log('Pages to save:', pagesToSave);

            // Strategy: Targeted Refresh for pages being saved.
            // 1. Delete ONLY the pages we are about to save for this book
            const { error: deleteError } = await supabase
                .from('questions')
                .delete()
                .eq('book_id', bookId)
                .in('page_number', pagesToSave);

            if (deleteError) throw deleteError;

            // 2. Insert new rows (One row per page)
            const rowsToInsert = pagesToSave.map(pageNum => {
                const pageItems = questionsByPage[pageNum];
                // Take topic from the first item that has it
                const pageTopic = pageItems.find(i => i.page_topic)?.page_topic || '';

                return {
                    book_id: bookId,
                    page_number: pageNum,
                    content: {
                        items: pageItems,
                        page_topic: pageTopic
                    }
                };
            });

            const { error: insertError } = await supabase
                .from('questions')
                .insert(rowsToInsert);

            if (insertError) throw insertError;

            alert(`저장이 완료되었습니다! (총 ${finalQuestions.length}문항, ${pagesToSave.length}페이지)`);

            // Optional: exit review mode or refresh
            // navigate('/books'); // specific to user flow? let's keep current state like before

        } catch (error: any) {
            console.error('Save failed:', error);
            alert(`저장 실패: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {isAnalysisModalOpen && (
                <AnalysisSetupModal
                    onClose={() => !analyzing && setIsAnalysisModalOpen(false)}
                    onStartAnalysis={handleStartAnalysis}
                    loading={analyzing}
                />
            )}

            {/* Header */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/books')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 text-sm">{bookTitle || '로딩 중...'}</h1>
                        <p className="text-xs text-slate-500">AI Smart Editor</p>
                    </div>
                </div>
                {/* Header Actions */}
                <div className="flex items-center gap-2">
                    {analyzing && (
                        <span className="text-sm text-brand-600 font-bold animate-pulse mr-4">
                            {statusMessage || '분석 중...'}
                        </span>
                    )}
                    <button
                        onClick={handleAnalysisClick}
                        disabled={analyzing}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${analyzing
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                            }`}
                    >
                        {analyzing ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                        {analyzing ? '분석 중...' : 'AI 자동 분석'}
                    </button>
                </div>
            </header>

            {/* Main Content: Full Screen Editor */}
            <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                <div className="max-w-5xl mx-auto h-full shadow-xl rounded-xl overflow-hidden bg-white">
                    <QuestionEditor
                        questions={extractedQuestions}
                        onSave={handleSaveQuestions}
                        onRegenerate={handleRegenerateExplanations}
                        onCancel={() => {
                            if (confirm('모든 문항을 지우고 초기화하시겠습니까?')) {
                                setExtractedQuestions([]);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
