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
            <Route index element={<Navigate to="/learn" replace />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="learn" element={<LearningPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="admin/users" element={<AdminUserConfigs />} />
            <Route path="settings" element={<div>설정 페이지 (준비중)</div>} />
            <Route path="*" element={<Navigate to="/learn" replace />} />
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
