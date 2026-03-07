import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import CustomCursor from './components/CustomCursor';
import AuthPage from './pages/AuthPage';
import ClassroomsPage from './pages/ClassroomsPage';
import DashboardPage from './pages/DashboardPage';
import StudentPage from './pages/StudentPage';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (role && user.role !== role) return <Navigate to="/auth" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CustomCursor />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/classrooms" element={
              <ProtectedRoute role="teacher"><ClassroomsPage /></ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute role="teacher"><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute><StudentPage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
