import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

// Inner wrapper that reads location for AnimatePresence key
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
      >
        <Routes location={location}>
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
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CustomCursor />
          <AnimatedRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
