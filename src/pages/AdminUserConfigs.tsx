import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, UserPlus, Shield, User, Mail, ShieldAlert } from 'lucide-react';

interface AllowedUser {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
    created_at: string;
}

export default function AdminUserConfigs() {
    const [users, setUsers] = useState<AllowedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('teacher');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('allowed_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage({ type: 'error', text: '사용자 목록을 불러오는데 실패했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('allowed_users')
                .insert([
                    { email: newUserEmail, name: newUserName, role: newUserRole }
                ]);

            if (error) throw error;

            setMessage({ type: 'success', text: '사용자가 성공적으로 추가되었습니다.' });
            setNewUserEmail('');
            setNewUserName('');
            fetchUsers(); // Refresh list
        } catch (error: any) {
            setMessage({ type: 'error', text: '추가 실패: ' + error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (!window.confirm(`${email} 사용자를 정말 삭제하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from('allowed_users')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setUsers(users.filter(u => u.id !== id));
        } catch (error: any) {
            alert('삭제 실패: ' + error.message);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                    <Shield className="w-8 h-8 text-indigo-600" />
                    접속 허용 명단 관리 (Whitelist)
                </h1>
                <p className="text-slate-500 mt-2">웹에 접속할 수 있는 사용자의 이메일을 등록하고 관리합니다.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Add User Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
                        <div className="flex items-center gap-2 mb-6 bg-indigo-600 text-white p-4 -m-6 mb-6 rounded-t-2xl">
                            <UserPlus size={20} />
                            <h2 className="font-bold">사용자 추가</h2>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">구글 이메일</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="example@gmail.com"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="선생님 성함"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">권한</label>
                                <div className="relative">
                                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <select
                                        value={newUserRole}
                                        onChange={(e) => setNewUserRole(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                                    >
                                        <option value="teacher">선생님 (일반)</option>
                                        <option value="admin">관리자 (모든 권한)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 mt-4"
                            >
                                {isSubmitting ? '추가 중...' : '명단에 추가'}
                            </button>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {message.text}
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Right Panel: User List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-lg text-slate-800">등록된 이메일 ({users.length})</h2>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-slate-500">로딩 중...</div>
                        ) : users.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">등록된 사용자가 없습니다.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-6 pl-2">사용자</div>
                                    <div className="col-span-4 text-center">권한</div>
                                    <div className="col-span-2 text-center">관리</div>
                                </div>
                                {users.map((user) => (
                                    <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                                        <div className="col-span-6 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{user.name || '이름 없음'}</div>
                                                <div className="text-sm text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-4 flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}>
                                                {user.role === 'admin' ? 'admin' : 'teacher'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
