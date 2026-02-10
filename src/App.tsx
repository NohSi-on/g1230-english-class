import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import BooksPage from './pages/BooksPage';
import SmartEditorPage from './pages/SmartEditorPage';
import LoginPage from './pages/LoginPage';
import AdminUserConfigs from './pages/AdminUserConfigs';
import StudentsPage from './pages/StudentsPage';
import LearningPage from './pages/LearningPage';
import ReportGeneratorPage from './pages/ReportGeneratorPage';
import ReportViewPage from './pages/ReportViewPage';
import { VocabUnitList } from './components/learning/vocab/VocabUnitList';
import { VocabStudyLayout } from './components/learning/vocab/VocabStudyLayout';
import VocabManagementPage from './pages/VocabManagementPage';
import VocabProgressPage from './pages/VocabProgressPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student/login" element={<StudentLoginPage />} />

          {/* Student Routes - No Sidebar */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/vocab/:bookId" element={
            <ProtectedRoute>
              <VocabUnitList />
            </ProtectedRoute>
          } />
          <Route path="/student/vocab/study/:setId" element={
            <ProtectedRoute>
              <VocabStudyLayout />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/learn" replace />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="learn" element={<LearningPage />} />
            <Route path="learn/vocab/:bookId" element={<VocabUnitList />} />
            <Route path="learn/vocab/study/:setId" element={<VocabStudyLayout />} />
            <Route path="vocab" element={<VocabManagementPage />} />
            <Route path="vocab/progress" element={<VocabProgressPage />} />
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
