import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, GraduationCap, X, Upload, CheckSquare, Square, Edit2, UserX, UserCheck, FileText, Trash2, AlertCircle } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { StudentReportsModal } from '../components/students/StudentReportsModal';

interface Student {
    id: string;
    name: string;
    grade: string;
    parent_phone: string;
    created_at: string;
    status: 'ACTIVE' | 'WITHDRAWN';
}

export default function StudentsPage() {
    // const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    // const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Selection State
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Add Student Form State
    const [isAddMode, setIsAddMode] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentGrade, setNewStudentGrade] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');

    // Edit Student State
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Student Management State
    const [viewingReportsStudent, setViewingReportsStudent] = useState<{ id: string, name: string } | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    // Bulk Upload State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkStudents, setBulkStudents] = useState<Partial<Student>[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            // setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('students').insert([
                { name: newStudentName, grade: newStudentGrade, parent_phone: newStudentPhone }
            ]);
            if (error) throw error;

            setIsAddMode(false);
            setNewStudentName('');
            setNewStudentGrade('');
            setNewStudentPhone('');
            fetchData();
        } catch (error) {
            alert('학생 등록 실패');
        }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        try {
            const { error } = await supabase
                .from('students')
                .update({
                    name: editingStudent.name,
                    grade: editingStudent.grade,
                    parent_phone: editingStudent.parent_phone
                })
                .eq('id', editingStudent.id);

            if (error) throw error;

            setEditingStudent(null);
            fetchData();
        } catch (error) {
            alert('학생 정보 수정 실패');
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const parsedStudents = data.map((row: any) => ({
                name: row['이름'] || row['Name'],
                grade: row['학년'] || row['Grade'],
                parent_phone: row['연락처'] || row['Phone'] || row['학부모연락처']
            })).filter(s => s.name);

            setBulkStudents(parsedStudents);
        };
        reader.readAsBinaryString(file);
    };

    const handleDeleteStudent = async () => {
        if (!deletingStudent) return;
        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', deletingStudent.id);

            if (error) throw error;

            setDeletingStudent(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('학생 삭제에 실패했습니다.');
        }
    };

    const handleBulkSubmit = async () => {
        if (bulkStudents.length === 0) return;
        try {
            const { error } = await supabase.from('students').insert(bulkStudents);
            if (error) throw error;
            alert(`${bulkStudents.length}명의 학생이 등록되었습니다.`);
            setIsBulkMode(false);
            setBulkStudents([]);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('일괄 등록 실패');
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleBulkStatusChange = async (status: 'ACTIVE' | 'WITHDRAWN') => {
        if (selectedStudentIds.length === 0) return;
        if (!confirm(`선택한 ${selectedStudentIds.length}명의 학생을 ${status === 'WITHDRAWN' ? '휴원' : '재원'} 처리하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from('students')
                .update({ status })
                .in('id', selectedStudentIds);

            if (error) throw error;

            setSelectedStudentIds([]);
            setIsSelectionMode(false);
            fetchData();
        } catch (error) {
            alert('상태 변경 실패');
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.includes(searchTerm) || s.grade.includes(searchTerm)
    );

    return (
        <div className="max-w-7xl mx-auto p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="text-indigo-600" />
                        학생 관리
                    </h1>
                    <p className="text-slate-500 mt-1">등록된 학생: {students.length}명</p>
                </div>
                <div className="flex gap-3">
                    {/* Bulk Actions */}
                    {isSelectionMode ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkStatusChange('ACTIVE')}
                                className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center gap-2"
                            >
                                <UserCheck size={18} />
                                재원 처리
                            </button>
                            <button
                                onClick={() => handleBulkStatusChange('WITHDRAWN')}
                                className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors flex items-center gap-2"
                            >
                                <UserX size={18} />
                                휴원 처리
                            </button>
                            <button
                                onClick={() => { setIsSelectionMode(false); setSelectedStudentIds([]); }}
                                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-200"
                            >
                                취소
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSelectionMode(true)}
                            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                        >
                            선택 모드
                        </button>
                    )}

                    <div className="w-px h-10 bg-slate-200 mx-2" />

                    <button
                        onClick={() => setIsBulkMode(true)}
                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Upload size={20} />
                        엑셀로 일괄 등록
                    </button>
                    <button
                        onClick={() => setIsAddMode(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        학생 등록
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="이름 또는 학년으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            {/* Student Table List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-16 text-center">
                                {isSelectionMode && (
                                    <button
                                        onClick={() => setSelectedStudentIds(selectedStudentIds.length === filteredStudents.length ? [] : filteredStudents.map(s => s.id))}
                                        className="text-slate-400 hover:text-indigo-600"
                                    >
                                        {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                )}
                            </th>
                            <th className="px-6 py-4">이름</th>
                            <th className="px-6 py-4">학년</th>
                            <th className="px-6 py-4">연락처</th>
                            <th className="px-6 py-4">상태</th>
                            <th className="px-6 py-4">등록일</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}>
                                <td className="px-6 py-4 text-center">
                                    {isSelectionMode && (
                                        <button
                                            onClick={() => toggleSelection(student.id)}
                                            className={`${selectedStudentIds.includes(student.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                                        >
                                            {selectedStudentIds.includes(student.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                                <td className="px-6 py-4 text-slate-600">{student.grade}</td>
                                <td className="px-6 py-4 text-slate-600 font-mono">{student.parent_phone || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${student.status === 'WITHDRAWN'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-green-100 text-green-600'
                                        }`}>
                                        {student.status === 'WITHDRAWN' ? '휴원' : '재원'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 text-sm">
                                    {new Date(student.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => setViewingReportsStudent(student)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors mr-1"
                                        title="리포트 보기"
                                    >
                                        <FileText size={16} />
                                    </button>
                                    <button
                                        onClick={() => setEditingStudent(student)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors mr-1"
                                        title="정보 수정"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeletingStudent(student)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                        title="영구 삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Student Modal */}
            {isAddMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">새 학생 등록</h2>
                            <button onClick={() => setIsAddMode(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                <input required type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="홍길동" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">학년</label>
                                <input required type="text" value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="중2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">학부모 연락처</label>
                                <input type="text" value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="010-1234-5678" />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors mt-2">등록하기</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">학생 정보 수정</h2>
                            <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                                <input required type="text" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">학년</label>
                                <input required type="text" value={editingStudent.grade} onChange={e => setEditingStudent({ ...editingStudent, grade: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">학부모 연락처</label>
                                <input type="text" value={editingStudent.parent_phone || ''} onChange={e => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors mt-2">수정하기</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {isBulkMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">엑셀로 학생 일괄 등록</h2>
                            <button onClick={() => setIsBulkMode(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {!bulkStudents.length ? (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-12 bg-slate-50">
                                <Upload size={48} className="text-slate-300 mb-4" />
                                <p className="text-slate-600 mb-6 text-center">
                                    엑셀 파일(.xlsx)을 업로드해주세요.<br />
                                    <span className="text-sm text-slate-400">필수 컬럼: 이름, 학년, 연락처</span>
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleExcelUpload}
                                    className="hidden"
                                    id="excel-upload"
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 cursor-pointer transition-colors"
                                >
                                    파일 선택하기
                                </label>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="font-bold text-slate-700">{bulkStudents.length}명의 학생을 찾았습니다.</p>
                                    <button
                                        onClick={() => setBulkStudents([])}
                                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                                    >
                                        다시 올리기
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">이름</th>
                                                <th className="px-4 py-3">학년</th>
                                                <th className="px-4 py-3">연락처</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bulkStudents.map((s, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                                                    <td className="px-4 py-3 text-slate-600">{s.grade}</td>
                                                    <td className="px-4 py-3 text-slate-600">{s.parent_phone}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6">
                                    <button
                                        onClick={handleBulkSubmit}
                                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                                    >
                                        {bulkStudents.length}명 일괄 등록하기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {viewingReportsStudent && (
                <StudentReportsModal
                    studentId={viewingReportsStudent.id}
                    studentName={viewingReportsStudent.name}
                    onClose={() => setViewingReportsStudent(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingStudent && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="text-red-600" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">학생 영구 삭제</h3>
                            <p className="text-slate-500 mb-6 px-4">
                                <span className="font-bold text-slate-900">'{deletingStudent.name}'</span> 학생의 모든 정보(학습 기록, 리포트 등)를 영구적으로 삭제하시겠습니까?<br />
                                <span className="text-red-500 font-bold mt-2 block">삭제 후에는 복구가 불가능합니다.</span>
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeletingStudent(null)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleDeleteStudent}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    영구 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
