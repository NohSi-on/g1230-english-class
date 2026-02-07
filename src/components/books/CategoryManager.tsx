import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { getCategories, addCategory, deleteCategory, type Category } from '../../services/categoryService';

interface CategoryManagerProps {
    onClose: () => void;
    onUpdate?: () => void;
}

export function CategoryManager({ onClose, onUpdate }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error(err);
            setError('카테고리를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || submitting) return;

        try {
            setSubmitting(true);
            setError(null);
            await addCategory(newName.trim());
            setNewName('');
            await loadCategories();
            onUpdate?.();
        } catch (err: any) {
            setError(err.message || '추가 실패');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if (!window.confirm(`'${category.name}' 카테고리를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            setSubmitting(true);
            setError(null);
            await deleteCategory(category.id);
            await loadCategories();
            onUpdate?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">카테고리 관리</h3>
                        <p className="text-xs text-slate-500">교재 분류를 추가하거나 삭제합니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="새 카테고리 이름"
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newName.trim()}
                            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1 transition-all"
                        >
                            <Plus size={18} />
                            추가
                        </button>
                    </form>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 size={24} className="text-slate-300 animate-spin" />
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                등록된 카테고리가 없습니다.
                            </div>
                        ) : (
                            categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                    <button
                                        onClick={() => handleDelete(cat)}
                                        disabled={submitting}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
