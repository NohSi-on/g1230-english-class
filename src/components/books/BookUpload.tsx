import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createBook, updateBook, uploadFile } from '../../services/bookService';
import { getCategories, type Category } from '../../services/categoryService';
import type { Book, BookCategory } from '../../types';
import { CoverImageSelector } from './CoverImageSelector';

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

interface BookUploadProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Book; // If present, Edit Mode
}

export function BookUpload({ onClose, onSuccess, initialData }: BookUploadProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [categories, setCategories] = useState<Category[]>([]);
    const [category, setCategory] = useState<BookCategory>(initialData?.category || '');
    const [targetGrade, setTargetGrade] = useState(initialData?.target_grade || '중1');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrlInput, setCoverUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingCats, setLoadingCats] = useState(true);

    useEffect(() => {
        const loadCats = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
                if (!initialData && data.length > 0) {
                    setCategory(data[0].name);
                }
            } catch (err) {
                console.error('Failed to load categories:', err);
            } finally {
                setLoadingCats(false);
            }
        };
        loadCats();
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category) return;

        try {
            setLoading(true);

            let coverUrl = initialData?.cover_url || '';
            if (coverFile) {
                // Upload new file
                coverUrl = await uploadFile('covers', coverFile);
            } else if (coverUrlInput) {
                // Use external URL directly
                coverUrl = coverUrlInput;
            }

            if (initialData) {
                // Update
                await updateBook(initialData.id, {
                    title,
                    category,
                    target_grade: targetGrade,
                    cover_url: coverUrl
                });
            } else {
                // Create
                await createBook({
                    title,
                    category,
                    target_grade: targetGrade,
                    cover_url: coverUrl
                });
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Operation failed:', error);
            const errorMsg = error.message || '';
            if (errorMsg.includes('Payload Too Large') || coverUrlInput.startsWith('data:')) {
                alert('이미지 주소가 너무 깁니다. 이미지 위에서 마우스 우클릭 > "이미지 주소 복사"를 사용했는지 확인해 주세요. (또는 이미지를 다운로드하여 직접 업로드해 주세요)');
            } else {
                alert(`작업에 실패했습니다: ${errorMsg || '알 수 없는 오류'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-slate-900 mb-6">
                    {initialData ? '교재 정보 수정' : '새 교재 등록'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                교재명
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="예: 중2 가우스 영문법"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    카테고리
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as BookCategory)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                    disabled={loadingCats}
                                    required
                                >
                                    {loadingCats ? (
                                        <option>로딩 중...</option>
                                    ) : categories.length === 0 ? (
                                        <option value="">카테고리 없음</option>
                                    ) : (
                                        categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))
                                    )}
                                </select>
                                {categories.length === 0 && !loadingCats && (
                                    <p className="text-[10px] text-red-500 mt-1">먼저 카테고리를 생성해 주세요.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    대상 학년
                                </label>
                                <div className="relative">
                                    <select
                                        value={targetGrade}
                                        onChange={(e) => setTargetGrade(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
                                    >
                                        <option value="">선택하세요</option>
                                        {GRADES.map((grade) => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <CoverImageSelector
                            currentUrl={initialData?.cover_url || null}
                            onSelect={(file, url) => {
                                setCoverFile(file);
                                setCoverUrlInput(url || '');
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !title || !category}
                        className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        {loading ? '처리 중...' : (initialData ? '수정 완료' : '교재 등록하기')}
                    </button>
                </form >
            </div >
        </div >
    );
}
