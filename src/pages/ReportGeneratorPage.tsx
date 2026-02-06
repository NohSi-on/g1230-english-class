import { useState, useEffect } from 'react';
import { Save, FileText, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateOptimizedReport } from '../services/aiService';

import { useNavigate } from 'react-router-dom';

export default function ReportGeneratorPage() {
    const navigate = useNavigate();
    const [students, setStudents] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);
    const [validationSummary, setValidationSummary] = useState<{
        total: number,
        snapshotMatch: number,
        preciseMatch: number,
        fallbackMatch: number,
        failed: number
    } | null>(null);
    const [prevReport, setPrevReport] = useState<any>(null);

    // Form State
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');

    // Report Data State
    const [reportData, setReportData] = useState({
        badge_level: 'JEUS',
        total_questions: 0,
        accuracy: 0,
        study_time_hours: 0,

        learned_content: '', // New field

        strength_skill: '',
        strength_comment: '',

        weakness_concept: '',
        weakness_error_rate: 0,
        weakness_prescription: '',

        teacher_comment: '',
        category_analysis: {} as any, // Store per-category detailed analysis

        // Radar Data
        grammar: 0,
        reading: 0,
        listening: 0,
        vocabulary: 0,
        writing: 0,

        prev_grammar: 0,
        prev_reading: 0,
        prev_listening: 0,
        prev_vocabulary: 0,
        prev_writing: 0
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, grade')
                .order('name');
            if (error) throw error;
            setStudents(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedStudentId || !periodStart || !periodEnd) {
            alert('Please select student and date range first.');
            return;
        }

        setGenerating(true);
        try {
            const studentName = students.find(s => s.id === selectedStudentId)?.name || 'Student';

            // 1. Fetch Assessments (Include both created and updated work)
            const { data: assessments, error } = await supabase
                .from('assessments')
                .select('*, book:books(id, title, category)')
                .eq('student_id', selectedStudentId)
                .or(`created_at.gte.${periodStart},updated_at.gte.${periodStart}`)
                .filter('created_at', 'lte', periodEnd + 'T23:59:59');

            // 1.5 Fetch Previous Report for Trends
            const { data: prevData } = await supabase
                .from('reports')
                .select('*')
                .eq('student_id', selectedStudentId)
                .lt('period_start', periodStart)
                .order('period_start', { ascending: false })
                .limit(1);

            const latestPrev = prevData?.[0] || null;
            setPrevReport(latestPrev);

            if (error) throw error;
            if (!assessments || assessments.length === 0) {
                alert('No assessments found for this period.');
                setGenerating(false);
                return;
            }

            // 2. Fetch Questions (Fetch all relevant books to ensure matching)
            const bookIds = Array.from(new Set(assessments.map(a => a.book_id)));
            const { data: questions } = await supabase
                .from('questions')
                .select('id, content, book_id')
                .in('book_id', bookIds);

            // 3. Calculate Stats & Extract Concepts
            let correctCount = 0;
            let totalCount = 0;
            const recentTopics = new Set<string>();

            // Concepts Aggregation
            const conceptPerformance = new Map<string, { total: number, wrong: number, category: string, conceptName: string }>();

            const allQuestionItems: any[] = [];

            // Flatten questions for easier lookup
            if (questions) {
                questions.forEach(qPage => {
                    if (qPage.content?.items && Array.isArray(qPage.content.items)) {
                        qPage.content.items.forEach((item: any) => {
                            allQuestionItems.push({
                                ...item,
                                itemId: item.itemId || item.question_number || 'unknown', // [STABLE ID] Unified
                                pageId: qPage.id,
                                book_id: qPage.book_id,
                                page_topic: qPage.content.page_topic || item.page_topic // Preference to page-level
                            });
                        });
                    }
                });
            }

            // Stats for Validation Summary
            const stats = { total: 0, snapshotMatch: 0, preciseMatch: 0, fallbackMatch: 0, failed: 0 };

            // Explicit tracking for categories
            const topicsByCategory: Record<string, string[]> = {
                'GRAMMAR': [],
                'READING': [],
                'VOCABULARY': [],
                'LISTENING': [],
                'WRITING': [], // Added WRITING category
                'SPEAKING': [], // Added SPEAKING category
                'OTHER': [] // Added OTHER category for uncategorized books
            };

            assessments.forEach(a => {
                const answersMap = a.details?.answers || {};
                const bookItems = allQuestionItems.filter(i => i.book_id === a.book_id);

                // Track book title by category
                const cat = a.book?.category?.toUpperCase() || 'OTHER'; // Default to 'OTHER' if category is null/undefined
                if (topicsByCategory[cat] && a.book?.title && !topicsByCategory[cat].includes(a.book.title)) {
                    topicsByCategory[cat].push(a.book.title);
                }
                recentTopics.add(a.book?.title); // Add to general recent topics as well

                Object.entries(answersMap).forEach(([uniqueKey, entryAny]: [string, any]) => {
                    // Normalize entry (some are simple strings, some are objects)
                    const entry = typeof entryAny === 'string' ? { status: entryAny } : entryAny;
                    const isWrong = entry.status === 'WRONG';
                    const isCorrect = entry.status === 'CORRECT';

                    // [CRITICAL] Skip if no valid status or doesn't belong to this period
                    if (!isWrong && !isCorrect) return;

                    // If entry has a timestamp, check if it's within the period
                    if (entry.updated_at) {
                        const updatedDate = entry.updated_at.split('T')[0];
                        if (updatedDate < periodStart || updatedDate > periodEnd) return;
                    }

                    stats.total++;
                    let conceptName = "분석 데이터 부족";
                    let matchFound = false;
                    let matchedItem: any = null;

                    // A. Snapshot Match (Priority 1)
                    if (entry.concept) {
                        conceptName = entry.concept;
                        stats.snapshotMatch++;
                        matchFound = true;
                        // Try to find the item for topic context even if concept is from snapshot
                        matchedItem = bookItems.find(i =>
                            (String(i.pageId) + "_" + String(i.itemId) === uniqueKey) ||
                            (String(i.pageId) + "_" + String(i.question_number) === uniqueKey)
                        ) || bookItems.find(i =>
                            String(i.itemId) === uniqueKey.split('_')[1] ||
                            String(i.question_number) === uniqueKey.split('_')[1] ||
                            String(i.itemId) === uniqueKey ||
                            String(i.question_number) === uniqueKey
                        );
                    }

                    // B. Precise Match (Priority 2)
                    if (!matchFound) {
                        const item = bookItems.find(i =>
                            (String(i.pageId) + "_" + String(i.itemId) === uniqueKey) ||
                            (String(i.pageId) + "_" + String(i.question_number) === uniqueKey)
                        );
                        if (item) {
                            conceptName = item.concept || a.book?.title || "General";
                            stats.preciseMatch++;
                            matchFound = true;
                            matchedItem = item;
                        }
                    }

                    // C. Fallback Match (Priority 3 - Try page-scoped match if possible)
                    if (!matchFound) {
                        const parts = uniqueKey.split('_');
                        const potentialPagePrefix = parts.length > 1 ? parts[0] : null;
                        const itemId = parts.length > 1 ? parts[1] : uniqueKey;

                        let item = null;
                        if (potentialPagePrefix !== null) {
                            const pageNum = parseInt(potentialPagePrefix);
                            if (!isNaN(pageNum)) {
                                // Try same page first
                                item = bookItems.find(i =>
                                    i.page === pageNum &&
                                    (String(i.itemId) === itemId || String(i.question_number) === itemId)
                                );
                            }
                        }

                        if (!item) {
                            // Global fallback (least preferred)
                            item = bookItems.find(i =>
                                String(i.itemId) === itemId ||
                                String(i.question_number) === itemId
                            );
                        }

                        if (item) {
                            conceptName = item.concept || a.book?.title || "General";
                            stats.fallbackMatch++;
                            matchFound = true;
                            matchedItem = item;
                        }
                    }

                    if (!matchFound) {
                        stats.failed++;
                        // [CRITICAL] Skip stale data that doesn't match any current question
                        return;
                    }

                    // Collect Page Topic for the report
                    if (matchedItem && matchedItem.page_topic) {
                        const cat = matchedItem.type?.toUpperCase() || a.book?.category?.toUpperCase() || 'OTHER';
                        if (topicsByCategory[cat] && !topicsByCategory[cat].includes(matchedItem.page_topic)) {
                            topicsByCategory[cat].push(matchedItem.page_topic);
                        }
                    }

                    const category = matchedItem?.type || a.book?.category || 'OTHER';
                    const conceptKey = `${category.toUpperCase()}:${conceptName}`;

                    const current = conceptPerformance.get(conceptKey) || {
                        total: 0,
                        wrong: 0,
                        category: category.toUpperCase(),
                        conceptName: conceptName
                    };

                    conceptPerformance.set(conceptKey, {
                        ...current,
                        total: current.total + 1,
                        wrong: current.wrong + (isWrong ? 1 : 0)
                    });

                    if (isWrong) {
                        totalCount++;
                    } else {
                        correctCount++;
                        totalCount++;
                    }
                });
            });

            setValidationSummary(stats);

            // 3. Stats & Extract Concepts (개선된 버전 - 배타적 분류)
            const realConcepts = Array.from(conceptPerformance.entries()).map(([_, data]) => {
                const conceptAccuracy = data.total > 0
                    ? Math.round(((data.total - data.wrong) / data.total) * 100)
                    : 0;
                return {
                    concept: data.conceptName,
                    accuracy: conceptAccuracy,
                    category: data.category,
                    total: data.total,
                    wrong: data.wrong
                };
            });

            // [중요] 강점과 약점을 엄격하게 분리
            // 강점: 정답률 80% 이상이면서 오답이 없는 경우
            const strongConcepts = realConcepts
                .filter(c => c.accuracy >= 80 && c.wrong === 0)
                .sort((a, b) => b.accuracy - a.accuracy);

            // 약점: 정답률 40% 미만 (강점에 포함되지 않은 것만)
            const weakConcepts = realConcepts
                .filter(c => c.accuracy < 40)
                .filter(c => !strongConcepts.find(s => s.concept === c.concept))
                .sort((a, b) => a.accuracy - b.accuracy);

            // 카테고리별 분류 (동일한 배타적 로직 적용)
            const conceptsByCategory: Record<string, { strong: any[], weak: any[] }> = {};
            realConcepts.forEach(c => {
                if (!conceptsByCategory[c.category]) {
                    conceptsByCategory[c.category] = { strong: [], weak: [] };
                }
                // 강점: 정답률 80% 이상 AND 오답 0개
                if (c.accuracy >= 80 && c.wrong === 0) {
                    conceptsByCategory[c.category].strong.push(c);
                } else if (c.accuracy < 40) {
                    // 약점: 정답률 40% 미만
                    conceptsByCategory[c.category].weak.push(c);
                }
                // 40~80% 사이는 강점도 약점도 아님 (중간 수준)
            });

            // 강점이 없을 경우 기본값 제공
            const aiStrength = strongConcepts.length > 0 ? strongConcepts : [{ concept: "성실한 학습 태도", accuracy: 100 }];

            const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
            const studyTime = assessments.length * 1; // 1 hour per assessment estimate

            // 4. Call Optimized AI Service (Single Call for Cost Efficiency)
            const grammarPerf = conceptsByCategory['GRAMMAR'];
            const readingPerf = conceptsByCategory['READING'];

            const aiReport = await generateOptimizedReport({
                studentName,
                period: `${periodStart} ~ ${periodEnd}`,
                totalQuestions: totalCount,
                accuracy,
                grammarData: grammarPerf ? {
                    themes: topicsByCategory['GRAMMAR'] || [],
                    strong: grammarPerf.strong.map(s => s.concept),
                    weak: grammarPerf.weak.map(w => w.concept),
                    accuracy: grammarPerf.strong.length > 0 || grammarPerf.weak.length > 0
                        ? Math.round((grammarPerf.strong.length / (grammarPerf.strong.length + grammarPerf.weak.length)) * 100)
                        : accuracy
                } : undefined,
                readingData: readingPerf ? {
                    themes: topicsByCategory['READING'] || [],
                    strong: readingPerf.strong.map(s => s.concept),
                    weak: readingPerf.weak.map(w => w.concept),
                    accuracy: readingPerf.strong.length > 0 || readingPerf.weak.length > 0
                        ? Math.round((readingPerf.strong.length / (readingPerf.strong.length + readingPerf.weak.length)) * 100)
                        : accuracy
                } : undefined
            });

            // 5. Update State
            setReportData((prev: any) => ({
                ...prev,
                total_questions: totalCount,
                accuracy,
                study_time_hours: studyTime,

                learned_content: aiReport.learned_content,
                category_analysis: aiReport.categories || {},

                strength_skill: aiStrength[0]?.concept || "General",
                strength_comment: aiReport.strength_comment,

                weakness_concept: weakConcepts[0]?.concept || "General",
                weakness_error_rate: weakConcepts[0] ? (100 - weakConcepts[0].accuracy) : 0,
                weakness_prescription: aiReport.weakness_prescription,

                teacher_comment: aiReport.teacher_comment,

                // Radar data - Try to fetch from prevReport or use defaults
                grammar: aiReport.radar?.grammar || 75,
                reading: aiReport.radar?.reading || 80,
                listening: aiReport.radar?.listening || 70,
                vocabulary: aiReport.radar?.vocabulary || 85,
                writing: aiReport.radar?.writing || 60,

                prev_grammar: latestPrev?.radar_chart_data?.grammar || 0,
                prev_reading: latestPrev?.radar_chart_data?.reading || 0,
                prev_listening: latestPrev?.radar_chart_data?.listening || 0,
                prev_vocabulary: latestPrev?.radar_chart_data?.vocabulary || 0,
                prev_writing: latestPrev?.radar_chart_data?.writing || 0
            }));

        } catch (e) {
            console.error(e);
            alert('Analysis failed: ' + (e as Error).message);
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!selectedStudentId) return;

        try {
            const payload = {
                student_id: selectedStudentId,
                period_start: periodStart,
                period_end: periodEnd,
                badge_level: reportData.badge_level,
                learned_content: reportData.learned_content,
                summary_stats: {
                    total_questions: reportData.total_questions,
                    accuracy: reportData.accuracy,
                    study_time_hours: reportData.study_time_hours,
                    category_analysis: reportData.category_analysis, // [IMPORTANT] Store multi-category data here
                    prev_radar: {
                        grammar: reportData.prev_grammar,
                        reading: reportData.prev_reading,
                        listening: reportData.prev_listening,
                        vocabulary: reportData.prev_vocabulary,
                        writing: reportData.prev_writing
                    }
                },
                strength_analysis: {
                    skill: reportData.strength_skill,
                    comment: reportData.strength_comment
                },
                weakness_analysis: {
                    concept: reportData.weakness_concept,
                    error_rate: reportData.weakness_error_rate,
                    prescription: reportData.weakness_prescription
                },
                radar_chart_data: {
                    grammar: reportData.grammar,
                    reading: reportData.reading,
                    listening: reportData.listening,
                    vocabulary: reportData.vocabulary,
                    writing: reportData.writing
                },
                teacher_comment: reportData.teacher_comment
            };

            const { data, error } = await supabase
                .from('reports')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            alert('Report saved successfully!');
            navigate(`/reports/${data.id}`);
        } catch (e) {
            console.error(e);
            alert('Failed to save report');
        }
    };

    const InputGroup = ({ label, children }: any) => (
        <div className="mb-4">
            <label className="block text-slate-400 text-sm font-bold mb-2">{label}</label>
            {children}
        </div>
    );

    return (
        <div className="p-8 max-w-4xl mx-auto text-slate-200">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <FileText className="text-emerald-500" />
                Report Generator
            </h1>

            {validationSummary && (
                <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-wrap gap-6 items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Data Match Quality</h3>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <div className="text-xl font-bold text-white">{validationSummary.total}</div>
                                <div className="text-[10px] text-slate-500">Total Items</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-emerald-400">{validationSummary.snapshotMatch}</div>
                                <div className="text-[10px] text-slate-500">Snapshots</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-indigo-400">{validationSummary.preciseMatch}</div>
                                <div className="text-[10px] text-slate-500">Precise</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-amber-400">{validationSummary.fallbackMatch}</div>
                                <div className="text-[10px] text-slate-500">Fallback</div>
                            </div>
                            {validationSummary.failed > 0 && (
                                <div className="text-center">
                                    <div className="text-xl font-bold text-rose-400">{validationSummary.failed}</div>
                                    <div className="text-[10px] text-slate-500">Failed</div>
                                </div>
                            )}
                        </div>
                    </div>
                    {prevReport && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl px-4 py-3">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase">Trend comparison found</div>
                            <div className="text-sm text-white font-medium">Prev Accuracy: {prevReport.summary_stats.accuracy}%</div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Controls */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <InputGroup label="Select Student">
                            <select
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                                value={selectedStudentId}
                                onChange={(e: any) => setSelectedStudentId(e.target.value)}
                            >
                                <option value="">Choose a student...</option>
                                {students.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                                ))}
                            </select>
                        </InputGroup>

                        <InputGroup label="Period Start">
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                                value={periodStart}
                                onChange={e => setPeriodStart(e.target.value)}
                            />
                        </InputGroup>

                        <InputGroup label="Period End">
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                                value={periodEnd}
                                onChange={e => setPeriodEnd(e.target.value)}
                            />
                        </InputGroup>

                        <button
                            onClick={handleAnalyze}
                            disabled={generating}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {generating ? 'Analyzing...' : 'Analyze Data'}
                        </button>
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Analysis Details</h2>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <InputGroup label="Total Questions">
                                <input type="number" className="w-full bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.total_questions}
                                    onChange={e => setReportData({ ...reportData, total_questions: parseInt(e.target.value) || 0 })}
                                />
                            </InputGroup>
                            <InputGroup label="Accuracy (%)">
                                <input type="number" className="w-full bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.accuracy}
                                    onChange={e => setReportData({ ...reportData, accuracy: parseInt(e.target.value) || 0 })}
                                />
                            </InputGroup>
                            <InputGroup label="Study Time (h)">
                                <input type="number" className="w-full bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.study_time_hours}
                                    onChange={e => setReportData({ ...reportData, study_time_hours: parseInt(e.target.value) || 0 })}
                                />
                            </InputGroup>
                        </div>

                        {/* Category Analysis Editor */}
                        {reportData.category_analysis && Object.entries(reportData.category_analysis).map(([cat, detail]: [string, any]) => (
                            <div key={cat} className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                                <h3 className="text-white font-bold mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        {cat} Analysis
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase">Category Detail</span>
                                </h3>
                                <div className="space-y-3">
                                    <InputGroup label="Themes/Covered Topics">
                                        <input type="text" className="w-full bg-slate-900 border-slate-600 rounded-lg p-2 text-sm"
                                            value={detail.themes || ''}
                                            onChange={e => setReportData({
                                                ...reportData,
                                                category_analysis: {
                                                    ...reportData.category_analysis,
                                                    [cat]: { ...detail, themes: e.target.value }
                                                }
                                            })}
                                        />
                                    </InputGroup>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroup label="Strengths">
                                            <textarea className="w-full bg-slate-900 border-slate-600 rounded-lg p-2 text-xs" rows={2}
                                                value={detail.strengths || ''}
                                                onChange={e => setReportData({
                                                    ...reportData,
                                                    category_analysis: {
                                                        ...reportData.category_analysis,
                                                        [cat]: { ...detail, strengths: e.target.value }
                                                    }
                                                })}
                                            />
                                        </InputGroup>
                                        <InputGroup label="Weaknesses">
                                            <textarea className="w-full bg-slate-900 border-slate-600 rounded-lg p-2 text-xs" rows={2}
                                                value={detail.weaknesses || ''}
                                                onChange={e => setReportData({
                                                    ...reportData,
                                                    category_analysis: {
                                                        ...reportData.category_analysis,
                                                        [cat]: { ...detail, weaknesses: e.target.value }
                                                    }
                                                })}
                                            />
                                        </InputGroup>
                                    </div>
                                    <InputGroup label="Prescription">
                                        <textarea className="w-full bg-slate-900 border-slate-600 rounded-lg p-2 text-xs" rows={2}
                                            value={detail.prescription || ''}
                                            onChange={e => setReportData({
                                                ...reportData,
                                                category_analysis: {
                                                    ...reportData.category_analysis,
                                                    [cat]: { ...detail, prescription: e.target.value }
                                                }
                                            })}
                                        />
                                    </InputGroup>
                                </div>
                            </div>
                        ))}

                        {/* Strength */}
                        <div className="mb-6 p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30">
                            <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                <Check size={18} /> Strength
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="text" placeholder="Skill"
                                    className="bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.strength_skill}
                                    onChange={e => setReportData({ ...reportData, strength_skill: e.target.value })}
                                />
                                <textarea placeholder="Comment" rows={2}
                                    className="bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.strength_comment}
                                    onChange={e => setReportData({ ...reportData, strength_comment: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Weakness */}
                        <div className="mb-6 p-4 bg-rose-900/20 rounded-xl border border-rose-500/30">
                            <h3 className="text-rose-400 font-bold mb-3 flex items-center gap-2">
                                <AlertCircle size={18} /> Weakness
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" placeholder="Concept"
                                    className="bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.weakness_concept}
                                    onChange={e => setReportData({ ...reportData, weakness_concept: e.target.value })}
                                />
                                <input type="number" placeholder="Error Rate %"
                                    className="bg-slate-900 border-slate-600 rounded-lg p-2"
                                    value={reportData.weakness_error_rate}
                                    onChange={e => setReportData({ ...reportData, weakness_error_rate: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <textarea placeholder="Prescription / Advice" rows={2}
                                className="w-full bg-slate-900 border-slate-600 rounded-lg p-2"
                                value={reportData.weakness_prescription}
                                onChange={e => setReportData({ ...reportData, weakness_prescription: e.target.value })}
                            />
                        </div>

                        {/* Teacher Comment */}
                        <InputGroup label="Teacher's Letter">
                            <textarea rows={4}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-amber-500 font-handwriting"
                                placeholder="..."
                                value={reportData.teacher_comment}
                                onChange={e => setReportData({ ...reportData, teacher_comment: e.target.value })}
                            />
                        </InputGroup>

                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/50 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        Save & Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
}
