
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { session, loading, isAllowed, role } = useAuth();
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
    // Students don't have a Supabase session, so we check 'role' as well
    if (!session && role !== 'student') {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Logged In but Not Allowed -> Show Access Denied (or Redirect if student)
    if (!isAllowed) {
        // Only show access denied if they are logged in with auth but not in whitelist
        // If they are a student, they are "allowed" but we should redirect them to their dashboard
        // if they try to access teacher pages
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-xl">
                    <h2 className="text-xl font-bold text-red-600 mb-2">접근 권한 없음</h2>
                    <p className="text-slate-600 mb-4">
                        로그인된 계정 ({session?.user?.email})은<br />
                        허용된 사용자 목록에 없습니다.
                    </p>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.reload();
                        }}
                        className="text-sm text-brand-600 font-bold underline hover:text-brand-800"
                    >
                        다시 로그인 / 로그아웃
                    </button>
                </div>
            </div>
        );
    }

    // 3. RBAC Check for Students
    const teacherPaths = ['/vocab', '/students', '/admin', '/books', '/reports/new'];
    if (role === 'student' && teacherPaths.some(path => location.pathname.startsWith(path))) {
        console.warn('Student attempted to access teacher path:', location.pathname);
        return <Navigate to="/student/dashboard" replace />;
    }

    // 4. Redirect logged in Teachers away from student login (optional but good)
    if ((role === 'admin' || role === 'teacher') && location.pathname === '/student/login') {
        return <Navigate to="/learn" replace />;
    }

    return <>{children}</>;
}
