import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { useAuth } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TicketDetail from './components/TicketDetail';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import Navbar from './components/Navbar';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Loading HelpDesk...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/tickets" replace /> : <Login />} />
        <Route path="/tickets" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
        <Route path="/reports/sla" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
