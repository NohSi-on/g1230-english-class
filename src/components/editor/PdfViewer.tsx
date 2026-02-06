import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker configuration for Vite (Force CDN to bypass local cache mismatch)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string | null;
}

export function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const getGoogleDriveId = (url: string) => {
        const match = url.match(/(?:\/d\/|id=)([\w-]+)/);
        return match ? match[1] : null;
    };

    const googleDriveId = url ? getGoogleDriveId(url) : null;

    if (!url) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400">
                PDF 파일이 없습니다.
            </div>
        );
    }

    // Google Drive Viewer (Iframe)
    if (googleDriveId) {
        return (
            <div className="flex flex-col h-full bg-slate-100 border-r border-slate-200">
                <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                    <span className="text-sm font-bold text-slate-700">Google Drive Preview</span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                        새 창에서 열기 (원본)
                    </a>
                </div>
                <div className="flex-1 bg-white relative">
                    <iframe
                        src={`https://drive.google.com/file/d/${googleDriveId}/preview`}
                        className="w-full h-full border-0 absolute inset-0 z-10"
                        title="Google Drive PDF Viewer"
                        allow="autoplay"
                    />
                    {/* Fallback Warning Background */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-0 text-slate-400">
                        <p className="mb-2">미리보기를 불러오는 중...</p>
                        <p className="text-xs">
                            화면이 보이지 않는다면<br />
                            권한이 없거나 브라우저 설정 문제일 수 있습니다.<br />
                            상단의 <strong>'새 창에서 열기'</strong>를 이용해 주세요.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Standard PDF Viewer (Supabase / Direct URL)
    return (
        <div className="flex flex-col h-full bg-slate-100 border-r border-slate-200">
            {/* Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-slate-600">
                        {pageNumber} / {numPages || '-'}
                    </span>
                    <button
                        onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                        disabled={pageNumber >= (numPages || 1)}
                        className="p-1 hover:bg-slate-100 rounded disabled:opacity-50"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <span className="text-sm font-medium text-slate-600 w-12 text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <ZoomIn size={20} />
                    </button>
                </div>
            </div>

            {/* PDF Canvas */}
            <div className="flex-1 overflow-auto flex justify-center p-8">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="shadow-lg"
                    error={
                        <div className="text-red-500 text-sm p-4 bg-red-50 rounded">
                            PDF를 불러올 수 없습니다. <br />
                            (권한이 없거나 손상된 파일일 수 있습니다)
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                    />
                </Document>
            </div>
        </div>
    );
}
