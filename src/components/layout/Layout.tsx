import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
    const location = useLocation();
    const isStudyPage = location.pathname.includes('/learn/vocab/study');

    return (
        <div className="flex h-screen bg-slate-50">
            {!isStudyPage && <Sidebar />}
            <main className="flex-1 overflow-auto">
                <div className="h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
