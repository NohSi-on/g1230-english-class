import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import BooksPage from './pages/BooksPage';
import SmartEditorPage from './pages/SmartEditorPage';
import LoginPage from './pages/LoginPage';
import AdminUserConfigs from './pages/AdminUserConfigs';
import StudentsPage from './pages/StudentsPage';
import GradingPage from './pages/GradingPage';
import LearningPage from './pages/LearningPage';
import ReportGeneratorPage from './pages/ReportGeneratorPage';
import ReportViewPage from './pages/ReportViewPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Placeholder Pages
const Dashboard = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-800">대시보드</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-slate-500 text-sm font-medium">총 등록 교재</h3>
        <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-slate-500 text-sm font-medium">활동중인 학생</h3>
        <p className="text-3xl font-bold text-slate-900 mt-2">48</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-slate-500 text-sm font-medium">이번 주 학습 시간</h3>
        <p className="text-3xl font-bold text-slate-900 mt-2">156h</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="learn" element={<LearningPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="admin/users" element={<AdminUserConfigs />} />
            <Route path="settings" element={<div>설정 페이지 (준비중)</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Editor Route - Also Protected */}
          <Route path="/books/:bookId/editor" element={
            <ProtectedRoute>
              <SmartEditorPage />
            </ProtectedRoute>
          } />

          <Route path="/grading/:assessmentId" element={
            <ProtectedRoute>
              <GradingPage />
            </ProtectedRoute>
          } />

          {/* Report Generator Route - Protected */}
          <Route path="/reports/new" element={
            <ProtectedRoute>
              <ReportGeneratorPage />
            </ProtectedRoute>
          } />

          {/* Public Report Route */}
          <Route path="/reports/:reportId" element={<ReportViewPage />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
