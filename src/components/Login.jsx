import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Select, MenuItem, FormControl, InputLabel, Alert,
  Divider, useTheme, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import SupportRoundedIcon    from '@mui/icons-material/SupportRounded';
import EmailOutlinedIcon     from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon      from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon    from '@mui/icons-material/PersonOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupportAgentIcon       from '@mui/icons-material/SupportAgent';
import PersonIcon             from '@mui/icons-material/Person';
import VisibilityIcon         from '@mui/icons-material/Visibility';
import VisibilityOffIcon      from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const theme = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [showPwd, setShowPwd] = useState(false);
  const [alert, setAlert] = useState({ msg: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const showAlert = (msg, type = 'error') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: '', type: 'error' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (!name.trim()) { showAlert('Please enter your name'); setLoading(false); return; }
        const res = await fetch(`${API_BASE_URL}/api/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, name }),
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error?.message || 'Registration failed'); setLoading(false); return; }
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();
      if (res.ok) {
        login({ uid: data.uid, role: data.role, email, username: data.username, custom_uid: data.custom_uid, name: data.name });
        navigate('/tickets');
      } else {
        showAlert(data.error?.message || 'Login failed');
      }
    } catch (err) {
      showAlert(err.message || 'An error occurred');
    }
    setLoading(false);
  };

  const roleOptions = [
    { value: 'user',  label: 'User',  icon: <PersonIcon fontSize="small" /> },
    { value: 'agent', label: 'Agent', icon: <SupportAgentIcon fontSize="small" /> },
    { value: 'admin', label: 'Admin', icon: <AdminPanelSettingsIcon fontSize="small" /> },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 52, height: 52, borderRadius: 3,
                bgcolor: 'primary.main', mb: 2,
              }}
            >
              <SupportRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegister
                ? 'Join HelpDesk to start managing tickets'
                : 'Sign in to your HelpDesk account'}
            </Typography>
          </Box>

          {/* Alert */}
          {alert.msg && (
            <Alert severity={alert.type} sx={{ mb: 2.5 }}>
              {alert.msg}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isRegister && (
              <TextField
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(!showPwd)} edge="end">
                      {showPwd
                        ? <VisibilityOffIcon fontSize="small" />
                        : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {isRegister && (
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
                  {roleOptions.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {r.icon}
                        <span>{r.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 0.5, py: 1.25 }}
            >
              {loading
                ? <CircularProgress size={20} sx={{ color: 'inherit' }} />
                : isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <Typography
                component="span"
                variant="body2"
                color="primary"
                fontWeight={600}
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? 'Sign In' : 'Register'}
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}