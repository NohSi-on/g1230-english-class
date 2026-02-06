import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Book as BookIcon, Trash2 } from 'lucide-react';
import type { Book, BookCategory } from '../../types';
import { getBooks, deleteBook } from '../../services/bookService';
import { BookUpload } from './BookUpload';
import { useAuth } from '../../contexts/AuthContext';

const TABS: { id: BookCategory | 'ALL'; label: string }[] = [
    { id: 'ALL', label: '전체' },
    { id: 'GRAMMAR', label: '문법' },
    { id: 'READING', label: '독해' },
    { id: 'WORD', label: '어휘' },
    { id: 'LISTENING', label: '듣기' },
];

export function BookList() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<BookCategory | 'ALL'>('ALL');

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const data = await getBooks();
            setBooks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (book: Book) => {
        if (!window.confirm(`'${book.title}' 교재를 삭제하시겠습니까 ? `)) return;

        try {
            await deleteBook(book);
            await fetchBooks(); // Refresh list
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
        fetchBooks();
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
                    <button
                        onClick={() => { setEditingBook(undefined); setIsUploadOpen(true); }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm shadow-red-200"
                    >
                        <Plus size={18} />
                        교재 등록
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px - 6 py - 3 text - sm font - medium border - b - 2 transition - colors ${activeTab === tab.id
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            } `}
                    >
                        {tab.label}
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredBooks.map((book) => (
                        <div key={book.id} className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 overflow-hidden flex flex-col">
                            <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                                {book.cover_url ? (
                                    <img
                                        src={book.cover_url}
                                        alt={book.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <BookIcon size={48} />
                                    </div>
                                )}
                                {role === 'admin' && (
                                    <div className="absolute top-2 right-2">
                                        <button
                                            onClick={() => handleDelete(book)}
                                            className="p-1.5 bg-white/90 text-red-600 rounded-full hover:bg-white shadow-sm transition-all"
                                            title="삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute top-2 left-2">
                                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
                                        {book.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-900 line-clamp-2 mb-1">{book.title}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs text-slate-400">
                                        {new Date(book.created_at).toLocaleDateString()}
                                    </span>
                                    {book.target_grade && (
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
                                            {book.target_grade}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto flex gap-2">
                                    {role === 'admin' ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(book)}
                                                className="flex-1 py-2 text-sm text-slate-600 bg-slate-50 rounded hover:bg-slate-100 font-medium"
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => navigate(`/books/${book.id}/editor`)}
                                                className="flex-1 py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 font-medium"
                                            >
                                                관리(AI)
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 py-2 text-center text-sm text-slate-400 bg-slate-50 rounded font-medium italic">
                                            조회 전용
                                        </div>
                                    )}
                                </div >
                            </div >
                        </div >
                    ))}
                </div >
            )}

            {
                isUploadOpen && (
                    <BookUpload
                        onClose={() => { setIsUploadOpen(false); setEditingBook(undefined); }}
                        onSuccess={fetchBooks}
                        initialData={editingBook}
                    />
                )
            }
        </div >
    );
}
