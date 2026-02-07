import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Book as BookIcon, Trash2, Settings } from 'lucide-react';
import type { Book, BookCategory } from '../../types';
import { getBooks, deleteBook } from '../../services/bookService';
import { getCategories, type Category } from '../../services/categoryService';
import { BookUpload } from './BookUpload';
import { CategoryManager } from './CategoryManager';
import { useAuth } from '../../contexts/AuthContext';

export function BookList() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<string>('ALL');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [booksData, catsData] = await Promise.all([
                getBooks(),
                getCategories()
            ]);
            setBooks(booksData);
            setCategories(catsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (book: Book) => {
        if (!window.confirm(`'${book.title}' 교재를 삭제하시겠습니까?`)) return;

        try {
            await deleteBook(book);
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Delete failed:', error);
            alert('교재 삭제에 실패했습니다.');
        }
    };

    const handleEdit = (book: Book) => {
        setEditingBook(book);
        setIsUploadOpen(true);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredBooks = activeTab === 'ALL'
        ? books
        : books.filter(b => b.category === activeTab);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">교재 관리</h2>
                    <p className="text-slate-500 text-sm mt-1">등록된 교재를 관리하고 학습 데이터를 생성합니다.</p>
                </div>
                {role === 'admin' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                            <Settings size={18} />
                            카테고리 관리
                        </button>
                        <button
                            onClick={() => { setEditingBook(undefined); setIsUploadOpen(true); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm shadow-red-200"
                        >
                            <Plus size={18} />
                            교재 등록
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ALL'
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    전체
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.name)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === cat.name
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="py-20 text-center text-slate-400">로딩 중...</div>
            ) : filteredBooks.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                    <BookIcon size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">등록된 교재가 없습니다.</p>
                    {role === 'admin' && (
                        <button
                            onClick={() => { setEditingBook(undefined); setIsUploadOpen(true); }}
                            className="text-red-600 font-medium hover:underline mt-2"
                        >
                            첫 교재를 등록해보세요
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                    {filteredBooks.map((book) => (
                        <div key={book.id} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-100 overflow-hidden flex flex-col">
                            <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                                {book.cover_url ? (
                                    <img
                                        src={book.cover_url}
                                        alt={book.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <BookIcon size={40} />
                                    </div>
                                )}
                                {role === 'admin' && (
                                    <div className="absolute top-1.5 right-1.5">
                                        <button
                                            onClick={() => handleDelete(book)}
                                            className="p-1 bg-white/90 text-red-600 rounded-full hover:bg-white shadow-sm transition-all"
                                            title="삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute top-1.5 left-1.5">
                                    <span className="px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded backdrop-blur-sm">
                                        {book.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-2 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2 mb-1 h-[2em]">{book.title}</h3>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[8px] text-slate-400">
                                        {new Date(book.created_at).toLocaleDateString()}
                                    </span>
                                    {book.target_grade && (
                                        <span className="px-1 py-0.5 bg-slate-50 text-slate-500 text-[8px] rounded border border-slate-100">
                                            {book.target_grade}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto flex flex-col gap-1">
                                    {role === 'admin' ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(book)}
                                                className="w-full py-1 text-[10px] text-slate-600 bg-slate-50 rounded hover:bg-slate-100 font-bold border border-slate-200 transition-colors"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => navigate(`/books/${book.id}/editor`)}
                                                className="w-full py-1.5 text-[10px] text-brand-600 bg-brand-50 rounded hover:bg-brand-100 font-bold border border-brand-100 transition-colors"
                                            >
                                                관리(AI)
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full py-1 text-center text-[10px] text-slate-400 bg-slate-50 rounded font-medium italic">
                                            조회 전용
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isUploadOpen && (
                <BookUpload
                    onClose={() => { setIsUploadOpen(false); setEditingBook(undefined); }}
                    onSuccess={fetchData}
                    initialData={editingBook}
                />
            )}

            {isCategoryManagerOpen && (
                <CategoryManager
                    onClose={() => setIsCategoryManagerOpen(false)}
                    onUpdate={fetchData}
                />
            )}
        </div>
    );
}
