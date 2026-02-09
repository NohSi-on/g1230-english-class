import { useState } from 'react';
import { X, Upload, FileText, Sparkles, Loader2, Save, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { cleanVocabData, extractVocabFromText } from '../../../services/aiService';
import { extractTextFromLocalFile } from '../../../services/pdfService';
import { createVocabSet } from '../../../services/vocabService';
import type { VocabWord } from '../../../types';

interface Props {
    bookId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function VocabImportModal({ bookId, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [title, setTitle] = useState('');
    const [cleanedData, setCleanedData] = useState<Partial<VocabWord>[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus('파일 분석 중...');

        const fileName = file.name.toLowerCase();
        try {
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws);
                    setStep('preview');
                    setCleanedData(data.map((item: any) => ({
                        word: item.word || item['단어'] || item['Word'] || '',
                        meaning: item.meaning || item['뜻'] || item['Meaning'] || '',
                        example_sentence: item.example || item['예문'] || item['Example'] || ''
                    })));
                    setLoading(false);
                    setStatus('');
                };
                reader.readAsBinaryString(file);
            }
            else if (fileName.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                const text = result.value;

                setStatus('AI가 워드 문서에서 단어를 추출하는 중...');
                const extracted = await extractVocabFromText(text);
                setCleanedData(extracted);
                setStep('preview');
            }
            else if (fileName.endsWith('.pdf')) {
                setStatus('PDF 텍스트 추출 중...');
                const text = await extractTextFromLocalFile(file);

                setStatus('AI가 PDF 문서에서 단어를 추출하는 중...');
                const extracted = await extractVocabFromText(text);
                setCleanedData(extracted);
                setStep('preview');
            }
            else {
                alert('지원하지 않는 파일 형식입니다. (Excel, Word, PDF만 가능)');
            }
        } catch (error) {
            console.error(error);
            alert('파일 처리 중 오류가 발생했습니다.');
        } finally {
            if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
                setLoading(false);
                setStatus('');
            }
        }
    };

    const handleAIClean = async () => {
        setLoading(true);
        setStatus('AI가 단어 데이터를 정제하고 예문을 생성하는 중...');
        try {
            const result = await cleanVocabData(cleanedData);
            setCleanedData(result);
            setStatus('정제 완료!');
        } catch (error) {
            console.error(error);
            setStatus('AI 분석 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title) {
            alert('단어장 제목을 입력해주세요.');
            return;
        }
        setLoading(true);
        setStatus('저장 중...');
        try {
            await createVocabSet(bookId, title, cleanedData);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-brand-600" size={20} />
                        단어장 AI 추가
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' ? (
                        <div className="space-y-6 py-10">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Upload className="text-brand-600" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">문서 파일 업로드</h3>
                                <p className="text-slate-500 text-sm mt-1">엑셀(.xlsx), 워드(.docx), PDF(.pdf) 파일을 선택하세요.</p>
                            </div>

                            <label className="block w-full max-w-md mx-auto cursor-pointer">
                                <div className={`border-2 border-dashed rounded-2xl p-10 transition-all text-center ${loading
                                    ? 'border-slate-100 bg-slate-50 cursor-not-allowed'
                                    : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/30'
                                    }`}>
                                    {loading ? (
                                        <Loader2 className="mx-auto text-brand-500 mb-2 animate-spin" size={40} />
                                    ) : (
                                        <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                                    )}
                                    <span className="text-sm font-medium text-slate-600">
                                        {loading ? '파일 처리 중...' : '파일 선택하기'}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv, .docx, .pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={loading}
                                    />
                                </div>
                            </label>

                            <div className="bg-amber-50 rounded-xl p-4 flex gap-3 max-w-md mx-auto border border-amber-100">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <div className="text-xs text-amber-700 leading-relaxed">
                                    <p className="font-bold mb-1">도움말</p>
                                    엑셀은 '단어', '뜻', '예문' 헤더를 자동 인식하며, 워드와 PDF는 AI가 문맥을 분석해 단어를 추출합니다.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700">단어장 세트 이름</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="예: Day 01 - 필수 영단어"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    미리보기
                                    <span className="text-xs font-normal text-slate-500">(총 {cleanedData.length}개 항목)</span>
                                </h3>
                                <button
                                    onClick={handleAIClean}
                                    disabled={loading}
                                    className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1.5"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                    AI 데이터 정제 및 예문 자동생성
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-700 w-1/4">단어</th>
                                            <th className="px-4 py-3 font-bold text-slate-700 w-1/4">뜻</th>
                                            <th className="px-4 py-3 font-bold text-slate-700">예문</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cleanedData.slice(0, 20).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-800 font-medium">{row.word}</td>
                                                <td className="px-4 py-3 text-slate-600">{row.meaning}</td>
                                                <td className="px-4 py-3 text-slate-500 italic">{row.example_sentence || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {cleanedData.length > 20 && (
                                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                                        외 {cleanedData.length - 20}개의 단어가 더 있습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                    <div className="text-sm text-brand-600 font-bold">
                        {status}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-colors"
                        >
                            취소
                        </button>
                        {step === 'preview' && (
                            <button
                                onClick={handleSave}
                                disabled={loading || !title}
                                className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${loading || !title
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200'
                                    }`}
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                <Save size={16} />
                                단어장 저장하기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
