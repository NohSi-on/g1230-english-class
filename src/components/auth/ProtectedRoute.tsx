
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { session, loading, isAllowed } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-brand-600" size={32} />
                    <p className="text-slate-500 text-sm">인증 정보 확인 중...</p>
                </div>
            </div>
        );
    }

    // 1. Not Logged In -> Go to Login
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Logged In but Not Allowed -> Show Access Denied (or Redirect to error page?)
    if (!isAllowed) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-xl">
                    <h2 className="text-xl font-bold text-red-600 mb-2">접근 권한 없음</h2>
                    <p className="text-slate-600 mb-4">
                        로그인된 계정 ({session.user.email})은<br />
                        허용된 사용자 목록에 없습니다.
                    </p>
                    <button
                        onClick={() => window.location.reload()} // Or sign out logic needed here actually
                        className="text-sm text-slate-400 underline hover:text-slate-600"
                    >
                        다시 시도 / 새로고침
                    </button>
                    {/* Ideally sign out button needed */}
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
