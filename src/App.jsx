import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './AuthContext';
import { AppThemeProvider } from './ThemeContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './components/Login';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const Dashboard      = lazy(() => import('./components/Dashboard'));
const TicketDetail   = lazy(() => import('./components/TicketDetail'));
const Reports        = lazy(() => import('./components/Reports'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Todo           = lazy(() => import('./components/Todo'));
const Profile        = lazy(() => import('./components/Profile'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <CircularProgress size={32} thickness={3} />
  </Box>
);

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={36} thickness={3} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flex: 1, pt: '64px' }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"            element={<Navigate to="/tickets" replace />} />
            <Route path="/tickets"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
            <Route path="/todo"        element={<ProtectedRoute><Todo /></ProtectedRoute>} />
            <Route path="/reports/sla" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
            <Route path="/users"       element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
            <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin/users" element={<Navigate to="/users" replace />} />
            <Route path="*"            element={<Navigate to="/tickets" replace />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}

export default function App() {
  const routerBasename = import.meta.env.BASE_URL || '/';

  return (
    <AppThemeProvider>
      <AuthProvider>
        <Router basename={routerBasename}>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </AppThemeProvider>
  );
}
