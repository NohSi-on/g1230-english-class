
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, FileText, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StudentReportsModalProps {
    studentId: string;
    studentName: string;
    onClose: () => void;
}

interface ReportSummary {
    id: string;
    period_start: string;
    period_end: string;
    created_at: string;
    badge_level: string;
}

export function StudentReportsModal({ studentId, studentName, onClose }: StudentReportsModalProps) {
    const [reports, setReports] = useState<ReportSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('id, period_start, period_end, created_at, badge_level')
                    .eq('student_id', studentId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setReports(data || []);
            } catch (err) {
                console.error(err);
                alert('리포트 목록을 불러오지 못했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [studentId]);

    const handleDelete = async (e: React.MouseEvent, reportId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('정말로 이 리포트를 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;

            setReports(prev => prev.filter(r => r.id !== reportId));
            alert('리포트가 삭제되었습니다.');
        } catch (err) {
            console.error(err);
            alert('리포트 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-indigo-600" />
                            학습 리포트 목록
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">{studentName} 학생</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">로딩 중...</div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            생성된 리포트가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="relative group"
                                >
                                    <Link
                                        to={`/reports/${report.id}`}
                                        className="block p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${report.badge_level === 'JEUS' ? 'bg-amber-100 text-amber-700' :
                                                report.badge_level === 'TOP' ? 'bg-slate-200 text-slate-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {report.badge_level} Badge
                                            </span>
                                            <ExternalLink size={16} className="text-slate-300 group-hover:text-indigo-500" />
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
                                            <Calendar size={16} className="text-slate-400" />
                                            {report.period_start} ~ {report.period_end}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            생성일: {new Date(report.created_at).toLocaleDateString()}
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(e) => handleDelete(e, report.id)}
                                        className="absolute right-4 bottom-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
