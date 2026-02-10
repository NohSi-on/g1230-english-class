import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAllProgress } from '../services/vocabProgressService';
import type { StudentProgress } from '../services/vocabProgressService';
import { BarChart3, Users, BookOpen, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function VocabProgressPage() {
    const { user } = useAuth();
    const [progress, setProgress] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

    useEffect(() => {
        if (user) {
            fetchProgress();
        }
    }, [user]);

    const fetchProgress = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Get user role from allowed_users table
            const { data: userData } = await supabase
                .from('allowed_users')
                .select('role')
                .eq('email', user.email)
                .single();

            const role = userData?.role || 'teacher';
            const data = await getAllProgress(user.id, role);
            setProgress(data);
        } catch (error) {
            console.error('Failed to fetch progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProgress = progress.filter(p => {
        if (filter === 'completed') return p.completion_rate >= 100;
        if (filter === 'in-progress') return p.completion_rate > 0 && p.completion_rate < 100;
        return true;
    });

    const stats = {
        totalStudents: new Set(progress.map(p => p.student_id)).size,
        totalAssignments: progress.length,
        completedAssignments: progress.filter(p => p.completion_rate >= 100).length,
        avgCompletionRate: progress.length > 0
            ? progress.reduce((sum, p) => sum + p.completion_rate, 0) / progress.length
            : 0,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">진도 데이터 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                    <BarChart3 className="text-indigo-600" size={32} />
                    단어 학습 진도
                </h1>
                <p className="text-slate-500">학생들의 단어 학습 현황을 실시간으로 확인하세요</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Users className="text-blue-600" size={24} />}
                    label="총 학생 수"
                    value={stats.totalStudents}
                    bgColor="bg-blue-50"
                />
                <StatCard
                    icon={<BookOpen className="text-purple-600" size={24} />}
                    label="총 과제 수"
                    value={stats.totalAssignments}
                    bgColor="bg-purple-50"
                />
                <StatCard
                    icon={<CheckCircle2 className="text-green-600" size={24} />}
                    label="완료된 과제"
                    value={stats.completedAssignments}
                    bgColor="bg-green-50"
                />
                <StatCard
                    icon={<TrendingUp className="text-amber-600" size={24} />}
                    label="평균 완료율"
                    value={`${stats.avgCompletionRate.toFixed(1)}%`}
                    bgColor="bg-amber-50"
                />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <FilterButton
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                    label="전체"
                />
                <FilterButton
                    active={filter === 'in-progress'}
                    onClick={() => setFilter('in-progress')}
                    label="진행 중"
                />
                <FilterButton
                    active={filter === 'completed'}
                    onClick={() => setFilter('completed')}
                    label="완료"
                />
            </div>

            {/* Progress List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    학생
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    교재
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    세트
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    진도율
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    정답률
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    마지막 학습
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    상태
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProgress.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                                                {item.student_name[0]}
                                            </div>
                                            <span className="font-bold text-slate-900">{item.student_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-700">{item.book_title}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                            {item.vocab_set_id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${item.completion_rate >= 100
                                                        ? 'bg-green-500'
                                                        : item.completion_rate >= 50
                                                            ? 'bg-amber-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${Math.min(item.completion_rate, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 min-w-[3rem] text-right">
                                                {item.completion_rate.toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-slate-700">
                                            {item.accuracy_rate.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Clock size={14} />
                                            {item.last_studied
                                                ? new Date(item.last_studied).toLocaleDateString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.completion_rate >= 100 ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <CheckCircle2 size={14} />
                                                완료
                                            </span>
                                        ) : item.completion_rate > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                <Clock size={14} />
                                                진행 중
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                <XCircle size={14} />
                                                미완료
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredProgress.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">학습 데이터가 없습니다</p>
                        <p className="text-sm mt-2">학생들이 단어 학습을 시작하면 여기에 표시됩니다</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, bgColor }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
            <div className="text-sm text-slate-500 font-medium">{label}</div>
        </div>
    );
}

function FilterButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
        >
            {label}
        </button>
    );
}
