import React, { useState } from 'react';
import { Search, Image as ImageIcon, Link as LinkIcon, Upload } from 'lucide-react';

interface CoverImageSelectorProps {
    currentUrl: string | null;
    onSelect: (file: File | null, url: string | null) => void;
}

export function CoverImageSelector({ currentUrl, onSelect }: CoverImageSelectorProps) {
    const [mode, setMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
    const [preview, setPreview] = useState<string | null>(currentUrl);
    const [inputUrl, setInputUrl] = useState(currentUrl || '');

    React.useEffect(() => {
        if (currentUrl) {
            setPreview(currentUrl);
            setInputUrl(currentUrl);
        }
    }, [currentUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            onSelect(file, null);
        }
    };

    const handleUrlChange = (url: string) => {
        setInputUrl(url);
        setPreview(url);
        onSelect(null, url);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
                표지 이미지 선택
            </label>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setMode('UPLOAD')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border ${mode === 'UPLOAD'
                        ? 'bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        } flex items-center justify-center gap-1.5`}
                >
                    <Upload size={14} /> 직접 업로드
                </button>
                <button
                    type="button"
                    onClick={() => setMode('URL')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border ${mode === 'URL'
                        ? 'bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        } flex items-center justify-center gap-1.5`}
                >
                    <LinkIcon size={14} /> 이미지 주소
                </button>
                <a
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent('교재 표지')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 text-xs font-medium rounded border bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-1.5"
                    title="새 창에서 구글 이미지 검색"
                >
                    <Search size={14} /> 구글 검색
                </a>
            </div>

            <div className="flex gap-4">
                {/* Preview Area */}
                <div className="w-24 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {preview ? (
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="text-slate-300" size={24} />
                    )}
                </div>

                {/* Input Area */}
                <div className="flex-1">
                    {mode === 'UPLOAD' ? (
                        <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg hover:bg-slate-50 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <Upload className="text-slate-400 mb-2" size={20} />
                                <span className="text-xs text-slate-500">이미지 파일 선택</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={inputUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                placeholder="구글 이미지에서 '이미지 주소 복사' 후 여기에 붙여넣으세요."
                                className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                            <p className="text-[11px] text-slate-400 leading-tight">
                                * 팁: 구글 이미지 검색 → 이미지 우클릭 → <strong>'이미지 주소 복사'</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
