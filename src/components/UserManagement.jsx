import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('Access denied. Admin only.');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        firebaseUid: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      showToast('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (firebaseUid, newRole) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${firebaseUid}/role/`, 
        { role: newRole },
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('User role updated successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update role');
    }
  };

  const toggleUserStatus = async (firebaseUid, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      await axios.patch(`${API_BASE_URL}/api/users/${firebaseUid}/status/`, 
        { status: newStatus },
        { params: { role: user.role, uid: user.uid } }
      );
      showToast(`User ${newStatus === 'blocked' ? 'blocked' : 'activated'} successfully`, 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to update status');
    }
  };

  const verifyAgent = async (firebaseUid) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${firebaseUid}/verify/`, 
        { verified: true },
        { params: { role: user.role, uid: user.uid } }
      );
      showToast('User verified successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to verify user');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.custom_uid?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !filterRole || u.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>Only administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      {toast.message && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <h1>User Management</h1>
        <p className="subtitle">Manage all system users, roles, and permissions</p>
      </div>

      <div className="management-controls">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by email, name, or UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <select 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value)}
          className="role-filter"
        >
          <option value="">All Roles</option>
          <option value="user">Users</option>
          <option value="agent">Agents</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon user-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{users.filter(u => u.role === 'user').length}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon agent-icon">🎧</div>
          <div className="stat-content">
            <div className="stat-value">{users.filter(u => u.role === 'agent').length}</div>
            <div className="stat-label">Agents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admin-icon">⚙️</div>
          <div className="stat-content">
            <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>UID</th>
                <th>System UID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userData) => (
                <tr key={userData.firebaseUid}>
                  <td>
                    <span className={`uid-badge ${userData.role}`}>
                      {userData.custom_uid || userData.uid || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <code className="system-uid">{userData.firebaseUid.substring(0, 12)}...</code>
                  </td>
                  <td>{userData.name || userData.username || '-'}</td>
                  <td>{userData.email}</td>
                  <td>
                    <select
                      value={userData.role}
                      onChange={(e) => updateUserRole(userData.firebaseUid, e.target.value)}
                      className={`role-select role-${userData.role}`}
                    >
                      <option value="user">User</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge status-${userData.account_status || 'active'}`}>
                      {userData.account_status === 'blocked' ? '🚫 Blocked' : 
                       (userData.role === 'agent' || userData.role === 'admin') && !userData.verified ? '⏳ Pending' :
                       '✅ Active'}
                    </span>
                  </td>
                  <td>
                    {userData.created_at ? new Date(
                      userData.created_at?.toDate ? userData.created_at.toDate() : 
                      typeof userData.created_at === 'number' ? userData.created_at * 1000 : 
                      userData.created_at
                    ).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {(userData.role === 'agent' || userData.role === 'admin') && !userData.verified && (
                        <button 
                          className="btn-action btn-verify"
                          title={`Verify ${userData.role === 'admin' ? 'Admin' : 'Agent'}`}
                          onClick={() => verifyAgent(userData.firebaseUid)}
                        >
                          ✓ Verify
                        </button>
                      )}
                      <button 
                        className="btn-action btn-toggle"
                        title={userData.account_status === 'blocked' ? 'Activate Account' : 'Block Account'}
                        onClick={() => toggleUserStatus(userData.firebaseUid, userData.account_status || 'active')}
                      >
                        {userData.account_status === 'blocked' ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="no-results">
              <p>No users found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
