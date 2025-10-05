import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import Toast from './Toast';
import './Users.css';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', role: 'user' });
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/users/?role=admin');
      setUsers(response.data.users);
    } catch {
      showToast('Failed to fetch users');
    }
  }, [showToast]);

  useEffect(() => {
    if (user && user.role === 'admin') fetchUsers();
  }, [user, fetchUsers]);

  const createUser = async () => {
    if (!newUser.email || !newUser.role) {
      showToast('Please fill all fields');
      return;
    }
    // Check for duplicate email
    if (users.some(u => u.email === newUser.email)) {
      showToast('User with this email already exists');
      return;
    }
    try {
      await axios.post('http://localhost:8000/api/users/', newUser, { params: { role: user.role, uid: user.uid } });
      setNewUser({ email: '', role: 'user' });
      setShowCreate(false);
      fetchUsers();
      showToast('User created successfully', 'success');
    } catch {
      showToast('Failed to create user');
    }
  };

  if (!user || user.role !== 'admin') return <div>Access denied. Admin only.</div>;
  if (!users) return <div>Loading...</div>;

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <div className="users">
      <h2>User Management</h2>
      <button onClick={() => setShowCreate(!showCreate)} className="create-btn">Create User</button>
      {showCreate && (
        <div className="create-form">
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={createUser}>Create</button>
          <button onClick={() => setShowCreate(false)}>Cancel</button>
        </div>
      )}
      <div className="users-list">
        {users.map(u => (
          <div key={u.uid} className="user-card">
            <p><strong>Email:</strong> {u.email}</p>
            <p><strong>Role:</strong> {u.role.charAt(0).toUpperCase() + u.role.slice(1)}</p>
            <p><strong>Username:</strong> @{u.username || u.email.split('@')[0]} ({u.custom_uid || u.uid})</p>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

export default Users;