import { BookOpen, Gamepad2, GraduationCap, LayoutDashboard, Settings, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

import { useAuth } from '../../contexts/AuthContext';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: '대시보드', path: '/' },
    { icon: BookOpen, label: '교재 관리', path: '/books' },
    { icon: Gamepad2, label: '학습 하기', path: '/learn' },
    { icon: GraduationCap, label: '학생 관리', path: '/students' },
    { icon: FileText, label: '학습 리포트', path: '/reports/new' },
    { icon: Settings, label: '접속 허용 관리', path: '/admin/users', requiredRole: 'admin' },
];

export function Sidebar() {
    const location = useLocation();
    const { role } = useAuth();

    return (
        <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white text-sm">
                        R
                    </div>
                    The Red English
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {MENU_ITEMS.map((item) => {
                    if (item.requiredRole && item.requiredRole !== role) return null;

                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-brand-50 text-brand-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                    <Settings size={20} />
                    설정
                </Link>
            </div>
        </div>
    );
}
