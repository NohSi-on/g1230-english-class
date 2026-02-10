import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Phone, User, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';

export default function StudentLoginPage() {
    const navigate = useNavigate();
    const { studentLogin, loading: authLoading } = useAuth();

    const [name, setName] = useState('');
    const [phoneSuffix, setPhoneSuffix] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [status, setStatus] = useState<'input' | 'ambiguous'>('input');
    const [candidates, setCandidates] = useState<any[]>([]);

    const handleLogin = async (e?: React.FormEvent, selectedId?: string) => {
        if (e) e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await studentLogin(name, phoneSuffix, selectedId);
            if (result.status === 'success') {
                navigate('/student/dashboard');
            } else if (result.status === 'ambiguous') {
                setCandidates(result.candidates || []);
                setStatus('ambiguous');
            }
        } catch (err: any) {
            setError(err.message || '로그인 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'ambiguous') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 animate-in fade-in zoom-in duration-300">
                    <button
                        onClick={() => setStatus('input')}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-600 mb-6 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> 다시 입력하기
                    </button>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">반을 선택해주세요</h1>
                    <p className="text-slate-500 mb-8 text-sm">
                        동일한 정보를 가진 학생이 여러 명 있습니다.<br />
                        본인이 속한 반을 선택해 주세요.
                    </p>

                    <div className="space-y-3">
                        {candidates.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => handleLogin(undefined, c.id)}
                                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
                            >
                                <div>
                                    <div className="font-bold text-slate-900 group-hover:text-indigo-700">{c.name}</div>
                                    <div className="text-sm text-slate-500">{c.className}</div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" size={20} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
                    <GraduationCap size={40} />
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">학생 학습 로그인</h1>
                    <p className="text-slate-500 text-sm">
                        이름과 전화번호 뒷자리를 입력해주세요.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="이름 (예: 홍길동)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Phone size={20} />
                        </div>
                        <input
                            type="tel"
                            maxLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            placeholder="학부모 전화번호 마지막 4자리"
                            value={phoneSuffix}
                            onChange={(e) => setPhoneSuffix(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium font-mono"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-start gap-2 animate-shake">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || authLoading}
                        className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-4"
                    >
                        {loading || authLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                확인 중...
                            </div>
                        ) : '학습 시작하기'}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-slate-50 text-center">
                    <p className="text-xs text-slate-400">
                        선생님 로그인(QR/이메일)은 관리자 전용입니다.<br />
                        <button
                            onClick={() => navigate('/login')}
                            className="text-indigo-500 font-bold hover:underline mt-2 p-2"
                        >
                            선생님 로그인으로 가기
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
