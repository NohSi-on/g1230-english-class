import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '../components/report/Badge';
import { StrengthCard, WeaknessCard } from '../components/report/AnalysisCards';
import { supabase } from '../lib/supabase';

// Mock Data for Demo/Fallback
const MOCK_DATA = {
    student_name: '김학생',
    student_grade: '중등 2학년',
    period: '2024.01.01 ~ 2024.01.31',
    badge_level: 'JEUS' as const,
    learned_content: 'To-Infinitive의 용법(명사/형용사), 관계대명사(Who/Which), 그리고 4장 어휘를 학습했습니다.',
    summary: {
        total_questions: 142,
        accuracy: 85,
        study_time_hours: 12
    },
    radar: {
        current: { grammar: 80, reading: 90, listening: 65, vocabulary: 70, writing: 60 },
        prev: { grammar: 75, reading: 85, listening: 60, vocabulary: 65, writing: 55 }
    },
    strength: {
        skill: '어휘력',
        comment: '고급 어휘에 대한 이해도가 매우 높습니다. 어휘 퀴즈에서 꾸준히 90% 이상의 성적을 거두고 있습니다.'
    },
    weakness: {
        concept: 'To-부정사',
        error_rate: 30,
        prescription: 'To-부정사의 명사적 용법에 대한 복습이 필요합니다.'
    },
    categories: {
        "GRAMMAR": {
            "themes": "To-Infinitive (Noun/Adjective), Relative Pronouns (Who/Which)",
            "strengths": "기본적인 문장 구조와 동사 변화에 대한 이해가 좋습니다.",
            "weaknesses": "복잡한 조건문과 간접 화법에서 다소 어려움을 보입니다.",
            "prescription": "고급 문법 익히기, 특히 화법 전환 연습에 집중하세요."
        },
        "READING": {
            "themes": "Helen Keller & Anne Sullivan 이야기, 환경 문제",
            "strengths": "이야기 글의 주제를 파악하는 능력이 뛰어납니다.",
            "weaknesses": "문학적 지문에서 행간의 의미를 유추하는 데 어려움이 있습니다.",
            "prescription": "다양한 지문을 통해 작가의 의도와 숨겨진 의미를 파악하는 연습을 권장합니다."
        }
    },
    teacher_comment: '이번 달 제임스 학생은 눈에 띄게 성장했습니다. 어휘 암기에 대한 노력이 결실을 맺고 있네요. 다음 달에는 복잡한 문법 구조에 조금 더 집중해봅시다!'
};

export default function ReportViewPage() {
    const { reportId } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!reportId || reportId === 'demo') {
            setData(MOCK_DATA);
            setLoading(false);
            return;
        }
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        if (!reportId) return;
        try {
            const { data: report, error } = await supabase
                .from('reports')
                .select('*, student:students(name, grade, profile_img_url)')
                .eq('id', reportId)
                .single();

            if (error) throw error;

            // Transform DB data to View Model if necessary
            // For now, assuming direct mapping or simple transform
            setData({
                student_name: report.student?.name,
                student_grade: report.student?.grade,
                period: `${report.period_start} ~ ${report.period_end}`,
                badge_level: report.badge_level,
                learned_content: report.learned_content || "학습 데이터가 없습니다.", // Map from DB
                summary: report.summary_stats,
                radar: {
                    current: report.radar_chart_data,
                    prev: report.summary_stats?.prev_radar
                },
                strength: report.strength_analysis,
                weakness: report.weakness_analysis,
                categories: report.summary_stats?.category_analysis || {}, // Per-category data
                teacher_comment: report.teacher_comment
            });
        } catch (e) {
            console.error('Failed to load report', e);
            // Fallback to mock for testing if explicitly desired, or just error state
            // setData(MOCK_DATA); // Uncomment to force mock on error
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">데이터를 불러오는 중...</div>;
    if (!data) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">리포트를 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-amber-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl opacity-30" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl opacity-30" />
            </div>

            <div className="max-w-md mx-auto min-h-screen relative backdrop-blur-sm bg-slate-900/50 shadow-2xl overflow-hidden border-x border-white/5">

                {/* Header */}
                <header className="relative pt-6 pb-2 px-6 text-center">
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-900/30 via-transparent to-transparent" />

                    <motion.div
                        initial={{ y: -5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Badge & Name Row */}
                        <div className="flex items-center gap-2 mb-1">
                            <div className="shrink-0 bg-white/5 p-0.5 rounded-lg backdrop-blur-md">
                                <Badge level={data.badge_level} size="sm" />
                            </div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{data.student_name}</h1>
                        </div>

                        <p className="text-slate-500 text-[10px] font-bold tracking-wider uppercase opacity-60">
                            {data.student_grade} • {data.period}
                        </p>
                    </motion.div>
                </header>

                <div className="px-5 space-y-4 pb-12">

                    {/* Learned Content Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-1"
                    >
                        <h3 className="text-indigo-400 font-bold text-[9px] mb-1 flex items-center gap-2 uppercase tracking-[0.2em] opacity-80">
                            학습 내용 개요
                        </h3>
                        <p className="text-slate-200 text-xs leading-relaxed font-medium">
                            {data.learned_content}
                        </p>
                    </motion.div>

                    {/* Category Specific Analysis */}
                    {Object.entries(data.categories || {}).map(([cat, detail]: [string, any]) => (
                        <div key={cat} className="space-y-2">
                            <div className="flex items-center gap-3 pt-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">{cat} 영역</span>
                                <div className="h-[1px] flex-1 bg-white/5" />
                            </div>

                            {detail.themes && (
                                <div className="py-1">
                                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest block mb-0.5 opacity-60">학습 집중 테마</span>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{detail.themes}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <StrengthCard skill="학습 강점" comment={detail.strengths} />
                                <WeaknessCard
                                    concept="집중 보완"
                                    errorRate={0}
                                    prescription={detail.prescription}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Global Strength/Weakness */}
                    {Object.keys(data.categories).length === 0 && (
                        <>
                            <StrengthCard skill={data.strength.skill} comment={data.strength.comment} />
                            <WeaknessCard
                                concept={data.weakness.concept}
                                errorRate={data.weakness.error_rate}
                                prescription={data.weakness.prescription}
                            />
                        </>
                    )}

                    {/* Teacher's Letter */}
                    <motion.div
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative mt-2"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-[1px] flex-1 bg-white/5" />
                            <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-[0.3em]">Instructor's Message</span>
                            <div className="h-[1px] flex-1 bg-white/5" />
                        </div>
                        <div className="px-1 text-center">
                            <p className="font-handwriting text-slate-300 leading-relaxed text-xs italic">
                                "{data.teacher_comment}"
                            </p>
                            <div className="mt-4 flex flex-col items-center opacity-40">
                                <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">The Red English</span>
                                <span className="text-[7px] text-slate-700 uppercase tracking-[0.4em] mt-0.5">Learner's Achievement Report</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Footer branding */}
                <footer className="py-10 text-center opacity-40 select-none">
                    <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Premium English Education</p>
                </footer>
            </div>
        </div>
    );
}
