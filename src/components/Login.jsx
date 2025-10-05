import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Toast from './Toast';
import './Login.css';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [toast, setToast] = useState({ message: '', type: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        // Registration: Use backend API to create user
        if (!name.trim()) {
          showToast('Please provide your name');
          return;
        }
        
        const registerResponse = await fetch('http://localhost:8000/api/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, name })
        });
        
        const registerData = await registerResponse.json();
        
        if (!registerResponse.ok) {
          showToast(registerData.error?.message || 'Registration failed');
          return;
        }
        
        // Now sign in with Firebase to get the token
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        
        // Get complete user data from backend
        const loginResponse = await fetch('http://localhost:8000/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          const userData = { 
            uid: loginData.uid, 
            role: loginData.role, 
            email,
            username: loginData.username,
            custom_uid: loginData.custom_uid,
            name: loginData.name
          };
          console.log('Login successful, user data:', userData);
          login(userData);
          showToast('Registration successful!', 'success');
          navigate('/tickets');
        } else {
          showToast(loginData.error?.message || 'Login failed');
        }
      } else {
        // Login: Sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        
        const response = await fetch('http://localhost:8000/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const userData = { 
            uid: data.uid, 
            role: data.role, 
            email,
            username: data.username,
            custom_uid: data.custom_uid,
            name: data.name
          };
          console.log('Login successful, user data:', userData);
          login(userData);
          navigate('/tickets');
        } else {
          showToast(data.error?.message || 'Login failed');
        }
      }
    } catch (error) {
      showToast(error.message || 'An error occurred');
    }
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <div className="login-container">
      <div className="login-form">
        <h2>{isRegister ? 'Register' : 'Login'} to HelpDesk</h2>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
          {isRegister && (
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button type="submit" className="login-btn">{isRegister ? 'Register' : 'Login'}</button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="toggle-btn">
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
    </>
  );
};

export default Login;